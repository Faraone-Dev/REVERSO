import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ReversoVault, TestToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * ██████╗ ███████╗██╗   ██╗███████╗██████╗ ███████╗ ██████╗ 
 * ██╔══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝██╔═══██╗
 * ██████╔╝█████╗  ██║   ██║█████╗  ██████╔╝███████╗██║   ██║
 * ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║   ██║
 * ██║  ██║███████╗ ╚████╔╝ ███████╗██║  ██║███████║╚██████╔╝
 * ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ 
 * 
 * REVERSO Protocol - Test Suite
 */

describe("ReversoVault", function () {
  let reversoVault: ReversoVault;
  let owner: SignerWithAddress;
  let sender: SignerWithAddress;
  let recipient: SignerWithAddress;
  let treasury: SignerWithAddress;

  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;
  const ONE_ETH = ethers.parseEther("1");
  const TEN_ETH = ethers.parseEther("10");
  const DEFAULT_EXPIRY = ONE_DAY * 30;
  const EXPECTED_FEE = (ONE_ETH * 50n) / 10000n; // 0.5%
  const AMOUNT_AFTER_FEE = ONE_ETH - EXPECTED_FEE;
  const TOKEN_SUPPLY = ethers.parseEther("1000");
  const TOKEN_AMOUNT = ethers.parseEther("10");

  beforeEach(async function () {
    [owner, sender, recipient, treasury] = await ethers.getSigners();

    const ReversoVaultFactory = await ethers.getContractFactory("ReversoVault");
    reversoVault = await ReversoVaultFactory.deploy(treasury.address) as unknown as ReversoVault;
    await reversoVault.waitForDeployment();
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DEPLOYMENT TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("Deployment", function () {
    it("Should set the correct treasury", async function () {
      expect(await reversoVault.treasury()).to.equal(treasury.address);
    });

    it("Should set the correct owner", async function () {
      expect(await reversoVault.owner()).to.equal(owner.address);
    });

    it("Should have zero transfer count initially", async function () {
      expect(await reversoVault.transferCount()).to.equal(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SEND ETH TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("Send ETH", function () {
    it("Should create a reversible transfer", async function () {
      const tx = await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        DEFAULT_EXPIRY,
        sender.address,
        sender.address,
        "Test transfer",
        { value: ONE_ETH }
      );

      await tx.wait();

      const transfer = await reversoVault.getTransfer(1);
      expect(transfer.sender).to.equal(sender.address);
      expect(transfer.recipient).to.equal(recipient.address);
      expect(transfer.status).to.equal(0); // Pending
    });

    it("Should deduct protocol fee", async function () {
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);
      
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        DEFAULT_EXPIRY,
        sender.address,
        sender.address,
        "Test transfer",
        { value: ONE_ETH }
      );

      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(EXPECTED_FEE);
    });

    it("Should emit TransferCreated event", async function () {
      await expect(
        reversoVault.connect(sender).sendETH(
          recipient.address,
          ONE_DAY,
          DEFAULT_EXPIRY,
          sender.address,
          sender.address,
          "Test transfer",
          { value: ONE_ETH }
        )
      ).to.emit(reversoVault, "TransferCreated");
    });

    it("Should reject invalid recipient", async function () {
      await expect(
        reversoVault.connect(sender).sendETH(
          ethers.ZeroAddress,
          ONE_DAY,
          DEFAULT_EXPIRY,
          sender.address,
          sender.address,
          "Test",
          { value: ONE_ETH }
        )
      ).to.be.revertedWithCustomError(reversoVault, "InvalidRecipient");
    });

    it("Should reject self-transfer", async function () {
      await expect(
        reversoVault.connect(sender).sendETH(
          sender.address,
          ONE_DAY,
          DEFAULT_EXPIRY,
          sender.address,
          sender.address,
          "Test",
          { value: ONE_ETH }
        )
      ).to.be.revertedWithCustomError(reversoVault, "InvalidRecipient");
    });

    it("Should reject zero amount", async function () {
      await expect(
        reversoVault.connect(sender).sendETH(
          recipient.address,
          ONE_DAY,
          DEFAULT_EXPIRY,
          sender.address,
          sender.address,
          "Test",
          { value: 0 }
        )
      ).to.be.revertedWithCustomError(reversoVault, "InvalidAmount");
    });

    it("Should reject delay too short", async function () {
      await expect(
        reversoVault.connect(sender).sendETH(
          recipient.address,
          60, // 1 minute, less than 1 hour minimum
          DEFAULT_EXPIRY,
          sender.address,
          sender.address,
          "Test",
          { value: ONE_ETH }
        )
      ).to.be.revertedWithCustomError(reversoVault, "InvalidDelay");
    });

    it("Should reject delay too long", async function () {
      await expect(
        reversoVault.connect(sender).sendETH(
          recipient.address,
          ONE_DAY * 31, // 31 days, more than 30 days maximum
          DEFAULT_EXPIRY,
          sender.address,
          sender.address,
          "Test",
          { value: ONE_ETH }
        )
      ).to.be.revertedWithCustomError(reversoVault, "InvalidDelay");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CANCEL TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("Cancel", function () {
    beforeEach(async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        DEFAULT_EXPIRY,
        sender.address,
        sender.address,
        "Test transfer",
        { value: ONE_ETH }
      );
    });

    it("Should allow sender to cancel before unlock", async function () {
      const senderBalanceBefore = await ethers.provider.getBalance(sender.address);
      
      const tx = await reversoVault.connect(sender).cancel(1);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      
      const senderBalanceAfter = await ethers.provider.getBalance(sender.address);
      const transfer = await reversoVault.getTransfer(1);

      expect(transfer.status).to.equal(2); // Cancelled
      
      // Account for fee already taken
      expect(senderBalanceAfter).to.equal(senderBalanceBefore + AMOUNT_AFTER_FEE - gasCost);
    });

    it("Should emit TransferCancelled event", async function () {
      await expect(reversoVault.connect(sender).cancel(1))
        .to.emit(reversoVault, "TransferCancelled");
    });

    it("Should reject cancel from non-sender", async function () {
      await expect(reversoVault.connect(recipient).cancel(1))
        .to.be.revertedWithCustomError(reversoVault, "NotSender");
    });

    it("Should reject cancel after unlock time", async function () {
      await time.increase(ONE_DAY + 1);
      
      await expect(reversoVault.connect(sender).cancel(1))
        .to.be.revertedWithCustomError(reversoVault, "TransferAlreadyUnlocked");
    });

    it("Should reject cancel of already cancelled transfer", async function () {
      await reversoVault.connect(sender).cancel(1);
      
      await expect(reversoVault.connect(sender).cancel(1))
        .to.be.revertedWithCustomError(reversoVault, "TransferNotPending");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                       CLAIM TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("Claim", function () {
    beforeEach(async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        DEFAULT_EXPIRY,
        sender.address,
        sender.address,
        "Test transfer",
        { value: ONE_ETH }
      );
    });

    it("Should allow recipient to claim after unlock", async function () {
      await time.increase(ONE_DAY + 1);
      
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      const tx = await reversoVault.connect(recipient).claim(1);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      const transfer = await reversoVault.getTransfer(1);

      expect(transfer.status).to.equal(1); // Claimed
      
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + AMOUNT_AFTER_FEE - gasCost);
    });

    it("Should emit TransferClaimed event", async function () {
      await time.increase(ONE_DAY + 1);
      
      await expect(reversoVault.connect(recipient).claim(1))
        .to.emit(reversoVault, "TransferClaimed");
    });

    it("Should reject claim from non-recipient", async function () {
      await time.increase(ONE_DAY + 1);
      
      await expect(reversoVault.connect(sender).claim(1))
        .to.be.revertedWithCustomError(reversoVault, "NotRecipient");
    });

    it("Should reject claim before unlock time", async function () {
      await expect(reversoVault.connect(recipient).claim(1))
        .to.be.revertedWithCustomError(reversoVault, "TransferStillLocked");
    });

    it("Should reject claim of cancelled transfer", async function () {
      await reversoVault.connect(sender).cancel(1);
      await time.increase(ONE_DAY + 1);
      
      await expect(reversoVault.connect(recipient).claim(1))
        .to.be.revertedWithCustomError(reversoVault, "TransferNotPending");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      VIEW FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe("View Functions", function () {
    beforeEach(async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        DEFAULT_EXPIRY,
        sender.address,
        sender.address,
        "Test transfer",
        { value: ONE_ETH }
      );
    });

    it("Should return correct sent transfers", async function () {
      const sentTransfers = await reversoVault.getSentTransfers(sender.address);
      expect(sentTransfers.length).to.equal(1);
      expect(sentTransfers[0]).to.equal(1);
    });

    it("Should return correct received transfers", async function () {
      const receivedTransfers = await reversoVault.getReceivedTransfers(recipient.address);
      expect(receivedTransfers.length).to.equal(1);
      expect(receivedTransfers[0]).to.equal(1);
    });

    it("Should return correct canCancel status", async function () {
      expect(await reversoVault.canCancel(1)).to.equal(true);
      
      await time.increase(ONE_DAY + 1);
      expect(await reversoVault.canCancel(1)).to.equal(false);
    });

    it("Should return correct canClaim status", async function () {
      expect(await reversoVault.canClaim(1)).to.equal(false);
      
      await time.increase(ONE_DAY + 1);
      expect(await reversoVault.canClaim(1)).to.equal(true);
    });

    it("Should return correct time remaining", async function () {
      const timeRemaining = await reversoVault.getTimeRemaining(1);
      expect(timeRemaining).to.be.closeTo(BigInt(ONE_DAY), 10n);
      
      await time.increase(ONE_DAY + 1);
      expect(await reversoVault.getTimeRemaining(1)).to.equal(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      ADMIN FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe("Admin Functions", function () {
    it("Should allow owner to update treasury", async function () {
      await reversoVault.connect(owner).setTreasury(sender.address);
      expect(await reversoVault.treasury()).to.equal(sender.address);
    });

    it("Should allow owner to pause", async function () {
      await reversoVault.connect(owner).pause();
      
      await expect(
        reversoVault.connect(sender).sendETH(
          recipient.address,
          ONE_DAY,
          DEFAULT_EXPIRY,
          sender.address,
          sender.address,
          "Test",
          { value: ONE_ETH }
        )
      ).to.be.revertedWithCustomError(reversoVault, "EnforcedPause");
    });

    it("Should allow owner to unpause", async function () {
      await reversoVault.connect(owner).pause();
      await reversoVault.connect(owner).unpause();
      
      await expect(
        reversoVault.connect(sender).sendETH(
          recipient.address,
          ONE_DAY,
          DEFAULT_EXPIRY,
          sender.address,
          sender.address,
          "Test",
          { value: ONE_ETH }
        )
      ).to.not.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      RESCUE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe("Rescue Abandoned", function () {
    it("Should reduce TVL when late recovery succeeds", async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_HOUR,
        ONE_DAY * 7,
        recipient.address,
        sender.address,
        "Rescue test",
        { value: ONE_ETH }
      );

      // After creation, TVL should equal amount after fee
      expect(await reversoVault.totalValueLocked(ethers.ZeroAddress)).to.equal(AMOUNT_AFTER_FEE);

      // Move past expiry + rescue period
      await time.increase(ONE_HOUR + ONE_DAY * 7 + ONE_DAY * 90 + 1);

      await reversoVault.rescueAbandoned(1);

      // TVL should be zero after successful late recovery
      expect(await reversoVault.totalValueLocked(ethers.ZeroAddress)).to.equal(0);

      const transfer = await reversoVault.getTransfer(1);
      expect(transfer.status).to.equal(3); // Refunded
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TOKEN TRANSFERS
  // ═══════════════════════════════════════════════════════════════

  describe("Send Token", function () {
    it("Should handle ERC20 transfers with fee and tracking", async function () {
      const TokenFactory = await ethers.getContractFactory("TestToken");
      const token = await TokenFactory.connect(sender).deploy("Mock", "MOCK", TOKEN_SUPPLY) as unknown as TestToken;
      await token.waitForDeployment();

      const feeBps = await reversoVault.calculateFeeBps(TOKEN_AMOUNT);
      const expectedFee = (TOKEN_AMOUNT * feeBps) / 10000n;
      const amountAfterFee = TOKEN_AMOUNT - expectedFee;

      await token.connect(sender).approve(await reversoVault.getAddress(), TOKEN_AMOUNT);

      await reversoVault.connect(sender).sendToken(
        await token.getAddress(),
        recipient.address,
        TOKEN_AMOUNT,
        ONE_DAY,
        DEFAULT_EXPIRY,
        sender.address,
        sender.address,
        "Token transfer"
      );

      const transfer = await reversoVault.getTransfer(1);
      expect(transfer.token).to.equal(await token.getAddress());
      expect(transfer.amount).to.equal(amountAfterFee);

      const treasuryBalance = await token.balanceOf(treasury.address);
      expect(treasuryBalance).to.equal(expectedFee);

      const tvlToken = await reversoVault.totalValueLocked(await token.getAddress());
      expect(tvlToken).to.equal(amountAfterFee);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      INSURANCE CLAIMS
  // ═══════════════════════════════════════════════════════════════

  describe("Insurance", function () {
    it("Should pay insurance claim after premium transfer is claimed", async function () {
      await reversoVault.connect(sender).sendETHPremium(
        recipient.address,
        ONE_HOUR,
        ONE_DAY * 7,
        sender.address,
        sender.address,
        "Premium transfer",
        { value: TEN_ETH }
      );

      // Unlock and claim
      await time.increase(ONE_HOUR + 1);
      await reversoVault.connect(recipient).claim(1);

      const insurancePoolBefore = await reversoVault.getInsurancePoolBalance();
      const victimBalanceBefore = await ethers.provider.getBalance(owner.address);

      const victim = owner; // act as payout recipient
      const payout = ethers.parseEther("0.01");

      await reversoVault.connect(owner).payInsuranceClaim(
        1,
        victim.address,
        payout,
        "Verified scam"
      );

      const insurancePoolAfter = await reversoVault.getInsurancePoolBalance();
      expect(insurancePoolBefore - insurancePoolAfter).to.equal(payout);

      const victimBalanceAfter = await ethers.provider.getBalance(victim.address);
      expect(victimBalanceAfter - victimBalanceBefore).to.be.closeTo(payout, ethers.parseEther("0.0001"));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SEND ETH SIMPLE
  // ═══════════════════════════════════════════════════════════════

  describe("Send ETH Simple", function () {
    it("Should create transfer with default parameters", async function () {
      await reversoVault.connect(sender).sendETHSimple(
        recipient.address,
        "Simple transfer",
        { value: ONE_ETH }
      );

      const transfer = await reversoVault.getTransfer(1);
      expect(transfer.sender).to.equal(sender.address);
      expect(transfer.recipient).to.equal(recipient.address);
      expect(transfer.status).to.equal(0); // Pending
      expect(transfer.recoveryAddress1).to.equal(sender.address);
      expect(transfer.recoveryAddress2).to.equal(sender.address);
    });

    it("Should use 24 hour default delay", async function () {
      await reversoVault.connect(sender).sendETHSimple(
        recipient.address,
        "Simple transfer",
        { value: ONE_ETH }
      );
      
      const transfer = await reversoVault.getTransfer(1);
      // Check that unlock is 24 hours from creation
      expect(transfer.unlockAt - transfer.createdAt).to.equal(BigInt(ONE_DAY));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      REFUND EXPIRED
  // ═══════════════════════════════════════════════════════════════

  describe("Refund Expired", function () {
    it("Should refund expired transfer to sender", async function () {
      // expiresAt = unlockAt + expiryPeriod = (createdAt + delay) + expiryPeriod
      const delay = ONE_HOUR;
      const expiryPeriod = ONE_DAY * 7;
      // Total time to expiry from creation: delay + expiryPeriod
      
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        delay,
        expiryPeriod,
        sender.address,
        sender.address,
        "Will expire",
        { value: ONE_ETH }
      );

      // Fast forward past expiry (delay + expiryPeriod + 1)
      await time.increase(delay + expiryPeriod + 1);

      const senderBalanceBefore = await ethers.provider.getBalance(sender.address);
      await reversoVault.connect(owner).refundExpired(1);
      const senderBalanceAfter = await ethers.provider.getBalance(sender.address);

      const transfer = await reversoVault.getTransfer(1);
      expect(transfer.status).to.equal(3); // Refunded
      expect(senderBalanceAfter).to.be.greaterThan(senderBalanceBefore);
    });

    it("Should reject refund before expiry", async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_HOUR,
        ONE_DAY * 7,
        sender.address,
        sender.address,
        "Not expired yet",
        { value: ONE_ETH }
      );

      await expect(
        reversoVault.connect(owner).refundExpired(1)
      ).to.be.revertedWithCustomError(reversoVault, "TransferNotExpired");
    });

    it("Should emit TransferRefunded event", async function () {
      const delay = ONE_HOUR;
      const expiryPeriod = ONE_DAY * 7;
      
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        delay,
        expiryPeriod,
        sender.address,
        sender.address,
        "Will expire",
        { value: ONE_ETH }
      );

      await time.increase(delay + expiryPeriod + 1);

      await expect(reversoVault.connect(owner).refundExpired(1))
        .to.emit(reversoVault, "TransferRefunded");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      BATCH REFUND EXPIRED
  // ═══════════════════════════════════════════════════════════════

  describe("Batch Refund Expired", function () {
    it("Should refund multiple expired transfers", async function () {
      const delay = ONE_HOUR;
      const expiryPeriod = ONE_DAY * 7;
      
      // Create 3 transfers
      for (let i = 0; i < 3; i++) {
        await reversoVault.connect(sender).sendETH(
          recipient.address,
          delay,
          expiryPeriod,
          sender.address,
          sender.address,
          `Transfer ${i}`,
          { value: ethers.parseEther("0.1") }
        );
      }

      await time.increase(delay + expiryPeriod + 1);

      await reversoVault.connect(owner).batchRefundExpired([1, 2, 3]);

      for (let i = 1; i <= 3; i++) {
        const transfer = await reversoVault.getTransfer(i);
        expect(transfer.status).to.equal(3); // Refunded
      }
    });

    it("Should skip non-expired transfers in batch", async function () {
      const delay = ONE_HOUR;
      const shortExpiryPeriod = ONE_DAY * 7;
      const longExpiryPeriod = ONE_DAY * 30;
      
      // Create transfer with shorter expiry
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        delay,
        shortExpiryPeriod,
        sender.address,
        sender.address,
        "Will expire first",
        { value: ONE_ETH }
      );

      // Create non-expired transfer with longer expiry
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        delay,
        longExpiryPeriod,
        sender.address,
        sender.address,
        "Won't expire yet",
        { value: ONE_ETH }
      );

      // Fast forward past first expiry but before second
      await time.increase(delay + shortExpiryPeriod + 1);

      // Batch refund - should only refund first one
      await reversoVault.connect(owner).batchRefundExpired([1, 2]);

      const transfer1 = await reversoVault.getTransfer(1);
      const transfer2 = await reversoVault.getTransfer(2);
      expect(transfer1.status).to.equal(3); // Refunded
      expect(transfer2.status).to.equal(0); // Still Pending
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      FREEZE TRANSFER
  // ═══════════════════════════════════════════════════════════════

  describe("Freeze Transfer", function () {
    it("Should allow guardian to freeze transfer and refund to sender", async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        ONE_DAY * 7,
        sender.address,
        sender.address,
        "Suspicious transfer",
        { value: ONE_ETH }
      );

      // Set owner as guardian
      await reversoVault.connect(owner).setGuardian(owner.address, true);

      const senderBalanceBefore = await ethers.provider.getBalance(sender.address);
      await reversoVault.connect(owner).freezeTransfer(1, "Suspected fraud");
      const senderBalanceAfter = await ethers.provider.getBalance(sender.address);

      const transfer = await reversoVault.getTransfer(1);
      expect(transfer.status).to.equal(2); // Cancelled (freeze = cancel + refund)
      expect(senderBalanceAfter).to.be.greaterThan(senderBalanceBefore);
    });

    it("Should reject freeze from non-guardian", async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        ONE_DAY * 7,
        sender.address,
        sender.address,
        "Normal transfer",
        { value: ONE_ETH }
      );

      await expect(
        reversoVault.connect(sender).freezeTransfer(1, "Trying to freeze")
      ).to.be.revertedWithCustomError(reversoVault, "NotGuardian");
    });

    it("Should emit TransferFrozen event", async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        ONE_DAY * 7,
        sender.address,
        sender.address,
        "Will be frozen",
        { value: ONE_ETH }
      );

      await reversoVault.connect(owner).setGuardian(owner.address, true);

      await expect(reversoVault.connect(owner).freezeTransfer(1, "Fraud detected"))
        .to.emit(reversoVault, "TransferFrozen")
        .withArgs(1, owner.address, "Fraud detected");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      MANUAL REFUND
  // ═══════════════════════════════════════════════════════════════

  describe("Manual Refund", function () {
    it("Should allow owner to manually refund ETH", async function () {
      // First send some ETH to vault via a transfer that gets cancelled
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        ONE_DAY * 7,
        sender.address,
        sender.address,
        "Will be manually refunded",
        { value: ONE_ETH }
      );

      const transfer = await reversoVault.getTransfer(1);
      const amountInVault = transfer.amount;

      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      // Manual refund (transferId, to, token, amount, reason)
      await reversoVault.connect(owner).manualRefund(
        1, 
        recipient.address, 
        ethers.ZeroAddress, // ETH
        amountInVault,
        "Manual refund test"
      );
      
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(amountInVault);
    });

    it("Should reject manual refund from non-owner", async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        ONE_DAY * 7,
        sender.address,
        sender.address,
        "Normal transfer",
        { value: ONE_ETH }
      );

      await expect(
        reversoVault.connect(sender).manualRefund(
          1, 
          sender.address, 
          ethers.ZeroAddress,
          ethers.parseEther("0.5"),
          "Trying to refund"
        )
      ).to.be.revertedWithCustomError(reversoVault, "OwnableUnauthorizedAccount");
    });

    it("Should emit ManualRefundIssued event", async function () {
      await reversoVault.connect(sender).sendETH(
        recipient.address,
        ONE_DAY,
        ONE_DAY * 7,
        sender.address,
        sender.address,
        "Will have manual refund",
        { value: ONE_ETH }
      );

      const transfer = await reversoVault.getTransfer(1);
      const refundAmount = transfer.amount;

      await expect(
        reversoVault.connect(owner).manualRefund(
          1,
          sender.address,
          ethers.ZeroAddress,
          refundAmount,
          "Test manual refund"
        )
      ).to.emit(reversoVault, "ManualRefundIssued")
        .withArgs(1, sender.address, refundAmount, "Test manual refund");
    });
  });
});
