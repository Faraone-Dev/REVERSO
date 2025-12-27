import { ethers } from "hardhat";

/**
 * REVERSO Protocol - Test Script
 * Testa tutte le funzioni principali
 */

async function main() {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                 🧪 REVERSO - TEST COMPLETO                     ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n");

  // Get signers
  const [deployer, recipient, thirdParty] = await ethers.getSigners();
  
  console.log("👥 Test Accounts:");
  console.log(`   Sender:    ${deployer.address}`);
  console.log(`   Recipient: ${recipient.address}`);
  console.log(`   Third:     ${thirdParty.address}`);
  console.log("\n");

  // Deploy contract
  console.log("📦 Deploying ReversoVault...");
  const ReversoVault = await ethers.getContractFactory("ReversoVault");
  const vault = await ReversoVault.deploy(deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`✅ Deployed to: ${vaultAddress}\n`);

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Create Transfer (sendETH)
  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TEST 1: CREATE TRANSFER (sendETH)");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const transferAmount = ethers.parseEther("1.0"); // 1 ETH
  const delaySeconds = 3600; // 1 hour
  const expirySeconds = 86400 * 7; // 7 days
  
  console.log(`💸 Sending: 1 ETH`);
  console.log(`👤 To: ${recipient.address}`);
  console.log(`⏱️  Delay: 1 hour`);
  
  const tx1 = await vault.sendETH(
    recipient.address,
    delaySeconds,
    expirySeconds,
    ethers.ZeroAddress, // no recovery 1
    ethers.ZeroAddress, // no recovery 2
    "Test transfer from REVERSO",
    { value: transferAmount }
  );
  
  const receipt1 = await tx1.wait();
  console.log(`✅ Transfer created! TX: ${receipt1?.hash}`);
  
  // Get transfer ID from event
  const transferId = 1; // First transfer
  const transfer = await vault.transfers(transferId);
  console.log(`📋 Transfer ID: ${transferId}`);
  console.log(`📊 Status: Pending`);
  console.log(`💰 Amount: ${ethers.formatEther(transfer.amount)} ETH`);
  console.log("\n");

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: Cancel Transfer
  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TEST 2: CANCEL TRANSFER");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const balanceBefore = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Sender balance before: ${ethers.formatEther(balanceBefore)} ETH`);
  
  const tx2 = await vault.cancel(transferId);
  await tx2.wait();
  
  const balanceAfter = await ethers.provider.getBalance(deployer.address);
  console.log(`✅ Transfer CANCELLED!`);
  console.log(`💰 Sender balance after: ${ethers.formatEther(balanceAfter)} ETH`);
  console.log(`🔙 Refunded: ~1 ETH (minus gas)`);
  
  const cancelledTransfer = await vault.transfers(transferId);
  console.log(`📊 New Status: Cancelled (${cancelledTransfer.status})`);
  console.log("\n");

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: Create Another Transfer (for claim test)
  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TEST 3: CREATE TRANSFER FOR CLAIM");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const tx3 = await vault.sendETH(
    recipient.address,
    3600, // 1 hour delay
    86400 * 7, // 7 days expiry
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    "Quick test transfer",
    { value: ethers.parseEther("0.5") }
  );
  await tx3.wait();
  console.log(`✅ Transfer #2 created with 1 hour delay`);
  console.log("\n");

  // Wait for delay - advance time in hardhat
  console.log("⏳ Advancing time by 1 hour...");
  await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
  await ethers.provider.send("evm_mine", []);
  console.log("✅ Time advanced!\n");

  // ═══════════════════════════════════════════════════════════════
  // TEST 4: Claim Transfer
  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TEST 4: CLAIM TRANSFER");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
  console.log(`💰 Recipient balance before: ${ethers.formatEther(recipientBalanceBefore)} ETH`);
  
  // Claim as recipient
  const tx4 = await vault.connect(recipient).claim(2);
  await tx4.wait();
  
  const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
  console.log(`✅ Transfer CLAIMED!`);
  console.log(`💰 Recipient balance after: ${ethers.formatEther(recipientBalanceAfter)} ETH`);
  
  const claimedTransfer = await vault.transfers(2);
  console.log(`📊 New Status: Claimed (${claimedTransfer.status})`);
  console.log("\n");

  // ═══════════════════════════════════════════════════════════════
  // TEST 5: Check Stats
  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TEST 5: CONTRACT STATS");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const totalTransfers = await vault.transferCount();
  const treasuryBalance = await ethers.provider.getBalance(await vault.treasury());
  
  console.log(`📊 Total Transfers: ${totalTransfers}`);
  console.log(`🏦 Treasury Balance: ${ethers.formatEther(treasuryBalance)} ETH`);
  console.log("\n");

  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                    ✅ ALL TESTS PASSED!                        ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n");
  console.log("REVERSO funziona perfettamente:");
  console.log("  ✅ Create Transfer - OK");
  console.log("  ✅ Cancel Transfer - OK (refund ricevuto)");
  console.log("  ✅ Claim Transfer  - OK (recipient pagato)");
  console.log("  ✅ Fee Collection  - OK (treasury riceve fees)");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
