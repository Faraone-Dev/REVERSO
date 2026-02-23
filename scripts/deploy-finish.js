// Raw ethers.js deploy - bypasses hardhat-ethers bug with legacy tx + empty 'to'
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const VAULT = "0x31ec8EeeCb341c7cefAefA6BC0Dd84BE9Bd11085";
const GUARDIAN = "0x7F1CB513B7A582A11f3057F104D561E9A9126A7d";
const RPC = "https://eth-mainnet.g.alchemy.com/v2/ZBUzT4ZR4-2EL3DaHs4P4";
const PK = "0xd29d69ccb0fd15f4e3db03637e46cee9edbcfdac5e6df3ad958e46a37f12fb33";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Read Monitor artifact
  const monitorArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ReversoMonitor.sol/ReversoMonitor.json"), "utf8")
  );

  // Deploy ReversoMonitor
  console.log("\n📊 Deploying ReversoMonitor...");
  const monitorFactory = new ethers.ContractFactory(monitorArtifact.abi, monitorArtifact.bytecode, wallet);
  const monitor = await monitorFactory.deploy(VAULT, { gasPrice: 200000000 });
  console.log(`  tx: ${monitor.deploymentTransaction().hash}`);
  await monitor.waitForDeployment();
  const monitorAddr = await monitor.getAddress();
  console.log(`  ✅ ReversoMonitor: ${monitorAddr}`);

  // Read Vault artifact
  const vaultArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ReversoVault.sol/ReversoVault.json"), "utf8")
  );
  const vault = new ethers.Contract(VAULT, vaultArtifact.abi, wallet);

  // Read Guardian artifact
  const guardianArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/EmergencyGuardian.sol/EmergencyGuardian.json"), "utf8")
  );
  const guardian = new ethers.Contract(GUARDIAN, guardianArtifact.abi, wallet);

  // Wire: vault.transferOwnership(guardian)
  console.log("\n🔗 vault.transferOwnership(guardian)...");
  const tx1 = await vault.transferOwnership(GUARDIAN, { gasPrice: 200000000 });
  await tx1.wait();
  console.log("  ✅ Done");

  // Wire: guardian.linkVault(vault)
  console.log("🔗 guardian.linkVault(vault)...");
  const tx2 = await guardian.linkVault(VAULT, { gasPrice: 200000000 });
  await tx2.wait();
  console.log("  ✅ Done");

  // Wire: monitor.setGuardian(guardian)
  console.log("🔗 monitor.setGuardian(guardian)...");
  const monitorContract = new ethers.Contract(monitorAddr, monitorArtifact.abi, wallet);
  const tx3 = await monitorContract.setGuardian(GUARDIAN, { gasPrice: 200000000 });
  await tx3.wait();
  console.log("  ✅ Done");

  const finalBalance = await provider.getBalance(wallet.address);
  console.log(`\n🎉 DEPLOYMENT COMPLETE!`);
  console.log(`═════════════════════════════════════════`);
  console.log(`  ReversoVault:       ${VAULT}`);
  console.log(`  EmergencyGuardian:  ${GUARDIAN}`);
  console.log(`  ReversoMonitor:     ${monitorAddr}`);
  console.log(`═════════════════════════════════════════`);
  console.log(`  Remaining balance: ${ethers.formatEther(finalBalance)} ETH`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
