import { ethers, network } from "hardhat";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                 🔄 REVERSO STACK DEPLOY                       ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const chain = await ethers.provider.getNetwork();

  console.log(`📍 Network: ${network.name} (chainId=${chain.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  const treasuryAddress = (process.env.TREASURY_ADDRESS || deployer.address).trim();
  const secondaryGuardian = requireEnv("SECONDARY_GUARDIAN");

  console.log(`🏦 Treasury: ${treasuryAddress}`);
  console.log(`🧰 Secondary guardian: ${secondaryGuardian}\n`);

  // 1) Deploy Vault
  console.log("📦 Deploying ReversoVault...");
  const ReversoVault = await ethers.getContractFactory("ReversoVault");
  const vault = await ReversoVault.deploy(treasuryAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`✅ ReversoVault: ${vaultAddress}`);

  // 2) Deploy Guardian
  console.log("\n📦 Deploying EmergencyGuardian...");
  const EmergencyGuardian = await ethers.getContractFactory("EmergencyGuardian");
  const guardian = await EmergencyGuardian.deploy(secondaryGuardian);
  await guardian.waitForDeployment();
  const guardianAddress = await guardian.getAddress();
  console.log(`✅ EmergencyGuardian: ${guardianAddress}`);

  // 3) Transfer Vault ownership to Guardian
  console.log("\n🔐 Transferring ReversoVault ownership to EmergencyGuardian...");
  const transferTx = await vault.transferOwnership(guardianAddress);
  await transferTx.wait();
  console.log(`✅ Ownership transferred (tx=${transferTx.hash})`);

  // 4) Link Vault in Guardian
  console.log("\n🔗 Linking vault in EmergencyGuardian...");
  const linkTx = await guardian.linkVault(vaultAddress);
  await linkTx.wait();
  console.log(`✅ Vault linked (tx=${linkTx.hash})`);

  // 5) Deploy Monitor
  console.log("\n📦 Deploying ReversoMonitor...");
  const ReversoMonitor = await ethers.getContractFactory("ReversoMonitor");
  const monitor = await ReversoMonitor.deploy(vaultAddress);
  await monitor.waitForDeployment();
  const monitorAddress = await monitor.getAddress();
  console.log(`✅ ReversoMonitor: ${monitorAddress}`);

  // 6) Link Guardian in Monitor
  console.log("\n👁️  Setting guardian in ReversoMonitor...");
  const setGuardianTx = await monitor.setGuardian(guardianAddress);
  await setGuardianTx.wait();
  console.log(`✅ Monitor guardian set (tx=${setGuardianTx.hash})`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                      DEPLOYMENT SUMMARY                        ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Network:   ${network.name} (chainId=${chain.chainId})`);
  console.log(`Treasury:  ${treasuryAddress}`);
  console.log(`Vault:     ${vaultAddress}`);
  console.log(`Guardian:  ${guardianAddress}`);
  console.log(`Monitor:   ${monitorAddress}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("📝 Verify (optional):");
  console.log(`npx hardhat verify --network ${network.name} ${vaultAddress} "${treasuryAddress}"`);
  console.log(`npx hardhat verify --network ${network.name} ${guardianAddress} "${secondaryGuardian}"`);
  console.log(`npx hardhat verify --network ${network.name} ${monitorAddress} "${vaultAddress}"`);
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
