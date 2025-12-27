import { ethers, network } from "hardhat";

/**
 * ██████╗ ███████╗██╗   ██╗███████╗██████╗ ███████╗ ██████╗ 
 * ██╔══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝██╔═══██╗
 * ██████╔╝█████╗  ██║   ██║█████╗  ██████╔╝███████╗██║   ██║
 * ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║   ██║
 * ██║  ██║███████╗ ╚████╔╝ ███████╗██║  ██║███████║╚██████╔╝
 * ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ 
 * 
 * REVERSO Protocol - Deployment Script
 */

async function main() {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                    🔄 REVERSO PROTOCOL                        ");
  console.log("                 Reversible Transactions for All               ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`📍 Network: ${network.name}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("\n");

  // Treasury address (deployer for now, change in production)
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  console.log(`🏦 Treasury: ${treasuryAddress}`);
  console.log("\n");

  // Deploy ReversoVault
  console.log("📦 Deploying ReversoVault...");
  const ReversoVault = await ethers.getContractFactory("ReversoVault");
  const reversoVault = await ReversoVault.deploy(treasuryAddress);
  await reversoVault.waitForDeployment();

  const vaultAddress = await reversoVault.getAddress();
  console.log(`✅ ReversoVault deployed to: ${vaultAddress}`);
  console.log("\n");

  // Verify contract info
  const minDelay = await reversoVault.MIN_DELAY();
  const maxDelay = await reversoVault.MAX_DELAY();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                      DEPLOYMENT SUMMARY                        ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`📋 Contract: ReversoVault`);
  console.log(`📍 Address: ${vaultAddress}`);
  console.log(`🌐 Network: ${network.name}`);
  console.log(`💸 Fee Tiers: 0.3% / 0.5% / 0.7% (progressive)`);
  console.log(`🛡️  Insurance: +0.2% optional`);
  console.log(`⏱️  Min Delay: ${Number(minDelay) / 3600} hours`);
  console.log(`⏱️  Max Delay: ${Number(maxDelay) / 86400} days`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n");

  // Verification instructions
  console.log("📝 To verify on block explorer, run:");
  console.log(`npx hardhat verify --network ${network.name} ${vaultAddress} "${treasuryAddress}"`);
  console.log("\n");

  return { reversoVault, vaultAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
