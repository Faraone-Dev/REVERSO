/**
 * ═══════════════════════════════════════════════════════════════
 *  REVERSO RESCUE v2 - Flashbots Anti-Sweeper (Raw HTTP)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Firma le transazioni manualmente e le invia come raw bundle
 * via Flashbots HTTP relay. Compatibile con ethers v6.
 * 
 * 1. SELFDESTRUCT force-send ETH al vecchio wallet (bypassa sweeper)
 * 2. transferOwnership() su EmergencyGuardian → nuovo wallet
 * 3. transferOwnership() su ReversoMonitor → nuovo wallet
 */

import { ethers } from "hardhat";

const EMERGENCY_GUARDIAN = "0x7F1CB513B7A582A11f3057F104D561E9A9126A7d";
const REVERSO_MONITOR = "0x152935935E86ab06ce75b6871c500f6Eb57f5332";
const COMPROMISED_WALLET = "0x8d6102f3DFcB83Bcf77C46d24cDD2A8F416C9242";
const COMPROMISED_KEY = process.env.COMPROMISED_KEY || "";
const FLASHBOTS_RELAY = "https://relay.flashbots.net";
const BUILDER_RELAYS = [
  "https://relay.flashbots.net",
  "https://rpc.titanbuilder.xyz",
  "https://rsync-builder.xyz",
  "https://builder0x69.io",
  "https://rpc.beaverbuild.org",
];

async function flashbotsRPC(method: string, params: any, authSigner: any, relay = FLASHBOTS_RELAY) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [params] });
  const signature = await authSigner.signMessage(ethers.id(body));
  const response = await fetch(relay, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Flashbots-Signature": `${authSigner.address}:${signature}`,
    },
    body,
  });
  return response.json();
}

async function sendToAllBuilders(method: string, params: any, authSigner: any) {
  const results = await Promise.allSettled(
    BUILDER_RELAYS.map(relay => flashbotsRPC(method, params, authSigner, relay))
  );
  let sent = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && !r.value.error) sent++;
  }
  return sent;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  REVERSO RESCUE v2 - Flashbots Anti-Sweeper");
  console.log("═══════════════════════════════════════════════════════\n");

  const provider = ethers.provider;
  const network = await provider.getNetwork();
  if (network.chainId !== 1n) { console.error("❌ Solo --network ethereum!"); process.exit(1); }

  const newKey = process.env.PRIVATE_KEY!;
  const newWallet = new ethers.Wallet(newKey, provider);
  const compromisedWallet = new ethers.Wallet(COMPROMISED_KEY, provider);
  const authSigner = ethers.Wallet.createRandom().connect(provider);

  console.log(`🆕 Nuovo: ${newWallet.address}`);
  const bal = await provider.getBalance(newWallet.address);
  console.log(`   Balance: ${ethers.formatEther(bal)} ETH`);
  if (bal < ethers.parseEther("0.003")) { console.error("❌ Serve 0.003+ ETH!"); process.exit(1); }

  console.log(`🔓 Compromesso: ${compromisedWallet.address}`);

  // Verifica ownership
  const abi = ["function transferOwnership(address) external", "function owner() view returns (address)"];
  const guardian = new ethers.Contract(EMERGENCY_GUARDIAN, abi, provider);
  const monitor = new ethers.Contract(REVERSO_MONITOR, abi, provider);

  const gOwner = await guardian.owner();
  const mOwner = await monitor.owner();
  console.log(`\n📋 Guardian owner: ${gOwner}`);
  console.log(`📋 Monitor owner:  ${mOwner}`);

  if (gOwner.toLowerCase() !== COMPROMISED_WALLET.toLowerCase()) {
    console.error("❌ Guardian ownership già cambiata!"); process.exit(1);
  }
  if (mOwner.toLowerCase() !== COMPROMISED_WALLET.toLowerCase()) {
    console.error("❌ Monitor ownership già cambiata!"); process.exit(1);
  }
  console.log("\n✅ Ownership ancora al compromesso. Procediamo!\n");

  // Gas
  const block = await provider.getBlock("latest");
  if (!block) throw new Error("No block");
  const baseFee = block.baseFeePerGas!;
  const tip = 3000000000n;
  const maxFee = baseFee * 2n + tip;
  console.log(`⛽ Base: ${ethers.formatUnits(baseFee, "gwei")}gwei Max: ${ethers.formatUnits(maxFee, "gwei")}gwei`);

  const ethNeeded = 80000n * 2n * maxFee * 150n / 100n;
  console.log(`💰 Force-send: ${ethers.formatEther(ethNeeded)} ETH`);

  const newNonce = await provider.getTransactionCount(newWallet.address);
  const oldNonce = await provider.getTransactionCount(COMPROMISED_WALLET);
  console.log(`📝 Nonce nuovo:${newNonce} vecchio:${oldNonce}\n`);

  // SELFDESTRUCT initcode: PUSH20 <addr> SELFDESTRUCT
  const forceCode = "0x73" + COMPROMISED_WALLET.slice(2).toLowerCase() + "ff";
  const txData = guardian.interface.encodeFunctionData("transferOwnership", [newWallet.address]);

  console.log("📝 Firmando transazioni...");

  const tx1 = await newWallet.signTransaction({
    to: null, data: forceCode, value: ethNeeded,
    gasLimit: 100000, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip,
    chainId: 1, type: 2, nonce: newNonce,
  });
  console.log("✅ TX1: Force-send SELFDESTRUCT");

  const tx2 = await compromisedWallet.signTransaction({
    to: EMERGENCY_GUARDIAN, data: txData, value: 0,
    gasLimit: 80000, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip,
    chainId: 1, type: 2, nonce: oldNonce,
  });
  console.log("✅ TX2: Guardian.transferOwnership()");

  const tx3 = await compromisedWallet.signTransaction({
    to: REVERSO_MONITOR, data: txData, value: 0,
    gasLimit: 80000, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip,
    chainId: 1, type: 2, nonce: oldNonce + 1,
  });
  console.log("✅ TX3: Monitor.transferOwnership()");

  const signedTxs = [tx1, tx2, tx3];

  // Simulate
  console.log("\n🔍 Simulazione...");
  const sim = await flashbotsRPC("eth_callBundle", {
    txs: signedTxs,
    blockNumber: "0x" + (block.number + 1).toString(16),
    stateBlockNumber: "latest",
  }, authSigner);

  if (sim.error) {
    console.error("❌ Simulazione errore:", JSON.stringify(sim.error));
    process.exit(1);
  }
  console.log("✅ Simulazione OK!");
  if (sim.result?.results) {
    for (let i = 0; i < sim.result.results.length; i++) {
      const r = sim.result.results[i];
      if (r.error) { console.error(`❌ TX${i+1} revert: ${r.error}`); process.exit(1); }
      console.log(`   TX${i+1}: gas=${r.gasUsed} ✓`);
    }
  }

  // Send bundle - re-sign each attempt with fresh gas and target block
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  🚀 INVIO FLASHBOTS BUNDLE (con re-sign per blocco)");
  console.log("═══════════════════════════════════════════════════════\n");

  const MAX_ATTEMPTS = 25;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const curBlock = await provider.getBlock("latest");
    if (!curBlock) continue;
    const target = curBlock.number + 1;
    
    // Re-calc gas with higher tip each attempt
    const freshBase = curBlock.baseFeePerGas!;
    const freshTip = 3000000000n + BigInt(attempt) * 500000000n; // +0.5 gwei per attempt
    const freshMax = freshBase * 2n + freshTip;
    const freshEth = 80000n * 2n * freshMax * 150n / 100n;

    // Re-sign all 3 transactions for this attempt
    const freshTx1 = await newWallet.signTransaction({
      to: null, data: forceCode, value: freshEth,
      gasLimit: 100000, maxFeePerGas: freshMax, maxPriorityFeePerGas: freshTip,
      chainId: 1, type: 2, nonce: newNonce,
    });
    const freshTx2 = await compromisedWallet.signTransaction({
      to: EMERGENCY_GUARDIAN, data: txData, value: 0,
      gasLimit: 80000, maxFeePerGas: freshMax, maxPriorityFeePerGas: freshTip,
      chainId: 1, type: 2, nonce: oldNonce,
    });
    const freshTx3 = await compromisedWallet.signTransaction({
      to: REVERSO_MONITOR, data: txData, value: 0,
      gasLimit: 80000, maxFeePerGas: freshMax, maxPriorityFeePerGas: freshTip,
      chainId: 1, type: 2, nonce: oldNonce + 1,
    });

    const freshBundle = [freshTx1, freshTx2, freshTx3];
    console.log(`⏳ [${attempt+1}/${MAX_ATTEMPTS}] Block ${target} | tip=${ethers.formatUnits(freshTip,"gwei")}gwei`);

    const sent = await sendToAllBuilders("eth_sendBundle", {
      txs: freshBundle,
      blockNumber: "0x" + target.toString(16),
    }, authSigner);
    console.log(`   📤 Sent to ${sent}/${BUILDER_RELAYS.length} builders`);

    // Wait for block
    await new Promise<void>((resolve) => {
      const poll = async () => {
        if (await provider.getBlockNumber() >= target) resolve();
        else setTimeout(poll, 2000);
      };
      poll();
    });

    // Check success
    const newGOwner = await guardian.owner();
    if (newGOwner.toLowerCase() === newWallet.address.toLowerCase()) {
      console.log("\n🎉🎉🎉 RESCUE RIUSCITO! 🎉🎉🎉\n");
      break;
    }
    console.log(`   ⏭️  Non incluso, riprovo...`);

    if (attempt === MAX_ATTEMPTS - 1) {
      console.log("\n⚠️  Tentativi esauriti. Rilancia lo script.");
    }
  }

  // Verifica finale
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  VERIFICA FINALE");
  console.log("═══════════════════════════════════════════════════════\n");

  const fG = await guardian.owner();
  const fM = await monitor.owner();
  console.log(`Guardian: ${fG} ${fG.toLowerCase() === newWallet.address.toLowerCase() ? "✅ RESCUATO!" : "⚠️"}`);
  console.log(`Monitor:  ${fM} ${fM.toLowerCase() === newWallet.address.toLowerCase() ? "✅ RESCUATO!" : "⚠️"}`);
}

main().then(() => process.exit(0)).catch(e => { console.error("❌", e); process.exit(1); });
