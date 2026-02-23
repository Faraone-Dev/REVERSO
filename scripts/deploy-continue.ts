import { ethers } from "hardhat";

const VAULT_ADDRESS = "0x31ec8EeeCb341c7cefAefA6BC0Dd84BE9Bd11085";

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = deployer.provider!;
  const balance = await provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🏦 Vault: ${VAULT_ADDRESS}`);

  const secondaryGuardian = process.env.SECONDARY_GUARDIAN || deployer.address;
  console.log(`🧰 Secondary guardian: ${secondaryGuardian}`);

  // --- Deploy EmergencyGuardian ---
  console.log("\n🛡️ Deploying EmergencyGuardian...");
  const guardianFactory = await ethers.getContractFactory("EmergencyGuardian");
  let guardianAddress: string;

  try {
    const guardian = await guardianFactory.deploy(secondaryGuardian);
    await guardian.waitForDeployment();
    guardianAddress = await guardian.getAddress();
  } catch (e: any) {
    // Workaround: ethers v6 BAD_DATA bug with legacy tx contract creation
    if (e.code === "BAD_DATA" && e.value?.hash) {
      console.log("⚠️ Ethers parsing error (known bug), waiting for tx...");
      const receipt = await provider.waitForTransaction(e.value.hash);
      guardianAddress = receipt!.contractAddress!;
    } else {
      throw e;
    }
  }
  console.log(`✅ EmergencyGuardian: ${guardianAddress!}`);

  // --- Deploy ReversoMonitor ---
  console.log("\n📊 Deploying ReversoMonitor...");
  const monitorFactory = await ethers.getContractFactory("ReversoMonitor");
  let monitorAddress: string;

  try {
    const monitor = await monitorFactory.deploy(VAULT_ADDRESS);
    await monitor.waitForDeployment();
    monitorAddress = await monitor.getAddress();
  } catch (e: any) {
    if (e.code === "BAD_DATA" && e.value?.hash) {
      console.log("⚠️ Ethers parsing error (known bug), waiting for tx...");
      const receipt = await provider.waitForTransaction(e.value.hash);
      monitorAddress = receipt!.contractAddress!;
    } else {
      throw e;
    }
  }
  console.log(`✅ ReversoMonitor: ${monitorAddress!}`);

  // --- Wire contracts together ---
  console.log("\n🔗 Wiring contracts...");

  // 1. Transfer vault ownership to guardian
  console.log("  → vault.transferOwnership(guardian)...");
  const vault = await ethers.getContractAt("ReversoVault", VAULT_ADDRESS);
  const tx1 = await vault.transferOwnership(guardianAddress!);
  await tx1.wait();
  console.log("  ✅ Ownership transferred");

  // 2. Link vault to guardian
  console.log("  → guardian.linkVault(vault)...");
  const guardian = await ethers.getContractAt("EmergencyGuardian", guardianAddress!);
  const tx2 = await guardian.linkVault(VAULT_ADDRESS);
  await tx2.wait();
  console.log("  ✅ Vault linked");

  // 3. Set guardian on monitor
  console.log("  → monitor.setGuardian(guardian)...");
  const monitor = await ethers.getContractAt("ReversoMonitor", monitorAddress!);
  const tx3 = await monitor.setGuardian(guardianAddress!);
  await tx3.wait();
  console.log("  ✅ Guardian set on monitor");

  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("═══════════════════════════════════════");
  console.log(`  ReversoVault:       ${VAULT_ADDRESS}`);
  console.log(`  EmergencyGuardian:  ${guardianAddress!}`);
  console.log(`  ReversoMonitor:     ${monitorAddress!}`);
  console.log("═══════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
