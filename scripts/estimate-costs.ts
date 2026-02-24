import { ethers, network } from "hardhat";

/**
 * REVERSO Protocol — Deployment Cost Estimator
 * Calculates exact gas costs for deploying the full stack on BSC and Base
 */

interface GasEstimate {
  label: string;
  gasUsed: bigint;
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("        💰 REVERSO — DEPLOYMENT COST ESTIMATOR                ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── Current network info ──
  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);
  const networkName = network.name;

  const isBSC = chainId === 56;
  const isBase = chainId === 8453;
  const isPolygon = chainId === 137;
  const nativeSymbol = isBSC ? "BNB" : isPolygon ? "POL" : "ETH";

  console.log(`📍 Network: ${networkName} (chainId=${chainId})`);
  console.log(`💎 Native token: ${nativeSymbol}\n`);

  // ── Fetch gas price ──
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  const maxFeePerGas = feeData.maxFeePerGas;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

  // Use EIP-1559 where available, otherwise legacy
  let effectiveGasPrice: bigint;
  if (maxFeePerGas && maxFeePerGas > 0n) {
    effectiveGasPrice = maxFeePerGas;
    console.log(`⛽ Gas Price (EIP-1559):`);
    console.log(`   maxFeePerGas:         ${ethers.formatUnits(maxFeePerGas, "gwei")} gwei`);
    console.log(`   maxPriorityFeePerGas: ${ethers.formatUnits(maxPriorityFeePerGas ?? 0n, "gwei")} gwei`);
  } else {
    effectiveGasPrice = gasPrice;
    console.log(`⛽ Gas Price (legacy): ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  }

  // Apply a 20% safety margin on gas price for fluctuations
  const safeGasPrice = effectiveGasPrice + (effectiveGasPrice * 20n / 100n);
  console.log(`⛽ Gas Price (+20% margin): ${ethers.formatUnits(safeGasPrice, "gwei")} gwei\n`);

  // ── Get deployer balance ──
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance:  ${ethers.formatEther(balance)} ${nativeSymbol}\n`);

  // ── Prepare constructor args ──
  const treasuryAddress = (process.env.TREASURY_ADDRESS || deployer.address).trim();
  const secondaryGuardian = (process.env.SECONDARY_GUARDIAN || deployer.address).trim();

  console.log(`🏦 Treasury: ${treasuryAddress}`);
  console.log(`🧰 Secondary Guardian: ${secondaryGuardian}\n`);

  console.log("───────────────────────────────────────────────────────────────");
  console.log("               GAS ESTIMATION PER OPERAZIONE                  ");
  console.log("───────────────────────────────────────────────────────────────\n");

  const estimates: GasEstimate[] = [];

  // ── 1) ReversoVault deployment ──
  const ReversoVault = await ethers.getContractFactory("ReversoVault");
  const vaultDeployTx = await ReversoVault.getDeployTransaction(treasuryAddress);
  const vaultGas = await ethers.provider.estimateGas({
    ...vaultDeployTx,
    from: deployer.address,
  });
  estimates.push({ label: "1. Deploy ReversoVault", gasUsed: vaultGas });
  console.log(`📦 Deploy ReversoVault:       ${vaultGas.toLocaleString()} gas`);

  // ── 2) EmergencyGuardian deployment ──
  const EmergencyGuardian = await ethers.getContractFactory("EmergencyGuardian");
  const guardianDeployTx = await EmergencyGuardian.getDeployTransaction(secondaryGuardian);
  const guardianGas = await ethers.provider.estimateGas({
    ...guardianDeployTx,
    from: deployer.address,
  });
  estimates.push({ label: "2. Deploy EmergencyGuardian", gasUsed: guardianGas });
  console.log(`📦 Deploy EmergencyGuardian:  ${guardianGas.toLocaleString()} gas`);

  // ── 3) ReversoMonitor deployment ──
  // Monitor takes vault address, we use a placeholder (same bytecode size regardless)
  const ReversoMonitor = await ethers.getContractFactory("ReversoMonitor");
  const monitorDeployTx = await ReversoMonitor.getDeployTransaction(
    // Use deployer address as placeholder for vault addr (same gas for address param)
    deployer.address
  );
  const monitorGas = await ethers.provider.estimateGas({
    ...monitorDeployTx,
    from: deployer.address,
  });
  estimates.push({ label: "3. Deploy ReversoMonitor", gasUsed: monitorGas });
  console.log(`📦 Deploy ReversoMonitor:     ${monitorGas.toLocaleString()} gas`);

  // ── 4-6) Post-deploy transactions (estimate from ABI encoding) ──
  // These are simple state-changing calls. We estimate conservatively.

  // transferOwnership(address) — OZ Ownable, ~30k gas
  const transferOwnershipGas = 35000n;
  estimates.push({ label: "4. Vault.transferOwnership()", gasUsed: transferOwnershipGas });
  console.log(`🔐 transferOwnership:         ${transferOwnershipGas.toLocaleString()} gas`);

  // linkVault(address) — Guardian, ~45k gas (SSTORE + checks)
  const linkVaultGas = 50000n;
  estimates.push({ label: "5. Guardian.linkVault()", gasUsed: linkVaultGas });
  console.log(`🔗 linkVault:                 ${linkVaultGas.toLocaleString()} gas`);

  // setGuardian(address) — Monitor, ~30k gas
  const setGuardianGas = 50000n;
  estimates.push({ label: "6. Monitor.setGuardian()", gasUsed: setGuardianGas });
  console.log(`👁️  setGuardian:               ${setGuardianGas.toLocaleString()} gas`);

  // ── TOTALS ──
  const totalGas = estimates.reduce((sum, e) => sum + e.gasUsed, 0n);
  const totalCostWei = totalGas * safeGasPrice;
  const totalCostEther = ethers.formatEther(totalCostWei);

  // Exact cost (without margin)
  const exactCostWei = totalGas * effectiveGasPrice;
  const exactCostEther = ethers.formatEther(exactCostWei);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                        RIEPILOGO COSTI                       ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log(`  Gas totale stimato:       ${totalGas.toLocaleString()} gas`);
  console.log(`  Gas price attuale:        ${ethers.formatUnits(effectiveGasPrice, "gwei")} gwei`);
  console.log(`  Gas price +20% margine:   ${ethers.formatUnits(safeGasPrice, "gwei")} gwei`);
  console.log("");
  console.log(`  Costo esatto:             ${exactCostEther} ${nativeSymbol}`);
  console.log(`  Costo con margine +20%:   ${totalCostEther} ${nativeSymbol}`);
  console.log("");

  // ── USD price estimation ──
  // Fetch from a simple JSON API
  let nativePrice = 0;
  try {
    // Use CoinGecko free API
    const coinId = isBSC ? "binancecoin" : isPolygon ? "matic-network" : "ethereum";
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    const data = await response.json();
    nativePrice = data[coinId]?.usd ?? 0;
  } catch {
    // Fallback hardcoded approximate prices
    nativePrice = isBSC ? 650 : isPolygon ? 0.25 : 2700;
    console.log(`  ⚠️  Prezzo ${nativeSymbol} fallback: $${nativePrice}`);
  }

  if (nativePrice > 0) {
    const exactUSD = parseFloat(exactCostEther) * nativePrice;
    const safeUSD = parseFloat(totalCostEther) * nativePrice;
    console.log(`  Prezzo ${nativeSymbol}:              $${nativePrice.toFixed(2)}`);
    console.log(`  Costo esatto in USD:      $${exactUSD.toFixed(4)}`);
    console.log(`  Costo con margine in USD: $${safeUSD.toFixed(4)}`);
  }

  console.log("");

  // ── Balance check ──
  const deficit = totalCostWei > balance ? totalCostWei - balance : 0n;
  if (deficit > 0n) {
    console.log(`  ❌ FONDI INSUFFICIENTI!`);
    console.log(`  Servono ancora:           ${ethers.formatEther(deficit)} ${nativeSymbol}`);
    if (nativePrice > 0) {
      const deficitUSD = parseFloat(ethers.formatEther(deficit)) * nativePrice;
      console.log(`                            ($${deficitUSD.toFixed(4)} USD)`);
    }
    console.log(`\n  📨 Invia almeno ${ethers.formatEther(totalCostWei)} ${nativeSymbol} a:`);
    console.log(`     ${deployer.address}`);
  } else {
    console.log(`  ✅ FONDI SUFFICIENTI per il deploy!`);
    const remaining = balance - totalCostWei;
    console.log(`  Saldo dopo deploy:        ~${ethers.formatEther(remaining)} ${nativeSymbol}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");

  // ── Detailed breakdown table ──
  console.log("\n  # | Operazione                    | Gas        | Costo (" + nativeSymbol + ")");
  console.log("  ──┼───────────────────────────────┼────────────┼──────────────");
  for (const e of estimates) {
    const cost = ethers.formatEther(e.gasUsed * safeGasPrice);
    const gasStr = e.gasUsed.toLocaleString().padStart(10);
    const label = e.label.padEnd(29);
    console.log(`    | ${label} | ${gasStr} | ${cost}`);
  }
  console.log("  ──┼───────────────────────────────┼────────────┼──────────────");
  const totalStr = totalGas.toLocaleString().padStart(10);
  console.log(`    | TOTALE                        | ${totalStr} | ${totalCostEther}`);
  console.log("");
}

main().catch((error) => {
  console.error("❌ Errore:", error.message || error);
  process.exit(1);
});
