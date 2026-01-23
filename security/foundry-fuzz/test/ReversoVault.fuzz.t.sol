// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ReversoVault} from "contracts/ReversoVault.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                  FUZZ TESTS - REVERSO VAULT                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Tests random inputs to find edge cases and vulnerabilities               ║
 * ║  1000 runs per test - finds rare edge cases                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract ReversoVaultFuzzTest is Test {
    ReversoVault public vault;
    address public treasury;
    address public sender;
    address public recipient;
    
    uint256 constant MIN_DELAY = 1 hours;
    uint256 constant MAX_DELAY = 30 days;
    uint256 constant MIN_EXPIRY = 7 days;

    function setUp() public {
        treasury = makeAddr("treasury");
        sender = makeAddr("sender");
        recipient = makeAddr("recipient");
        
        vault = new ReversoVault(treasury);
        
        // Fund sender with plenty of ETH
        vm.deal(sender, 10000 ether);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      FEE CALCULATION FUZZ
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Fuzz test fee calculation never overflows
     * @dev Fee should always be <= 0.7% of amount
     */
    function testFuzz_FeeCalculationNoOverflow(uint256 amount) public view {
        // Bound to reasonable range (1 wei to 1 billion ETH)
        amount = bound(amount, 1, 1_000_000_000 ether);
        
        // Should never revert
        uint256 feeBps = vault.calculateFeeBps(amount);
        
        // Fee should be within expected bounds (0.3% to 0.7%)
        assertGe(feeBps, 30, "Fee BPS too low");
        assertLe(feeBps, 70, "Fee BPS too high");
        
        // Calculate actual fee - should not overflow
        uint256 fee = vault.calculateFee(amount);
        assertLe(fee, amount, "Fee exceeds amount");
        
        // Verify fee matches expected calculation
        assertEq(fee, (amount * feeBps) / 10000, "Fee calculation mismatch");
    }

    /**
     * @notice Fuzz test progressive fee tiers are correct
     */
    function testFuzz_FeeTiersCorrect(uint256 amount) public view {
        amount = bound(amount, 1, 1_000_000_000 ether);
        
        uint256 feeBps = vault.calculateFeeBps(amount);
        
        if (amount <= 0.4 ether) {
            assertEq(feeBps, 30, "Retail tier should be 0.3%");
        } else if (amount <= 40 ether) {
            assertEq(feeBps, 50, "Standard tier should be 0.5%");
        } else {
            assertEq(feeBps, 70, "Whale tier should be 0.7%");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                      SEND ETH FUZZ
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Fuzz test sendETH with random parameters
     * @dev The contract calculates fee from msg.value, so:
     *      amount sent = msg.value
     *      fee = calculateFee(msg.value)
     *      amountStored = msg.value - fee
     */
    function testFuzz_SendETH(
        uint256 msgValue,
        uint256 delay,
        uint256 expiryPeriod
    ) public {
        // Bound parameters
        msgValue = bound(msgValue, 0.001 ether, 100 ether);
        delay = bound(delay, MIN_DELAY, MAX_DELAY);
        expiryPeriod = bound(expiryPeriod, MIN_EXPIRY, 365 days);
        
        // Calculate expected stored amount (after fee deduction from msg.value)
        uint256 fee = vault.calculateFee(msgValue);
        uint256 expectedAmount = msgValue - fee;
        
        vm.prank(sender);
        uint256 transferId = vault.sendETH{value: msgValue}(
            recipient,
            delay,
            expiryPeriod,
            sender,
            sender,
            "Fuzz test"
        );
        
        // Verify transfer created correctly
        assertEq(transferId, 1, "First transfer should be ID 1");
        
        ReversoVault.Transfer memory t = vault.getTransfer(transferId);
        assertEq(t.sender, sender, "Sender mismatch");
        assertEq(t.recipient, recipient, "Recipient mismatch");
        assertEq(t.amount, expectedAmount, "Amount mismatch");
        assertEq(t.unlockAt, block.timestamp + delay, "Unlock time mismatch");
    }

    /**
     * @notice Fuzz test that delay bounds are enforced
     */
    function testFuzz_DelayBoundsEnforced(uint256 delay) public {
        vm.assume(delay < MIN_DELAY || delay > MAX_DELAY);
        
        vm.prank(sender);
        vm.expectRevert(ReversoVault.InvalidDelay.selector);
        vault.sendETH{value: 1 ether}(
            recipient,
            delay,
            MIN_EXPIRY,
            sender,
            sender,
            "Should fail"
        );
    }

    /**
     * @notice Fuzz test that too-short expiry is rejected
     * @dev Note: expiryPeriod == 0 is valid (uses DEFAULT_EXPIRY)
     */
    function testFuzz_ExpiryBoundsEnforced(uint256 expiryPeriod) public {
        // Must be > 0 but < MIN_EXPIRY to trigger revert
        // (0 is valid - uses default)
        expiryPeriod = bound(expiryPeriod, 1, MIN_EXPIRY - 1);
        
        vm.prank(sender);
        vm.expectRevert(ReversoVault.InvalidExpiry.selector);
        vault.sendETH{value: 1 ether}(
            recipient,
            MIN_DELAY,
            expiryPeriod,
            sender,
            sender,
            "Should fail"
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //                      CANCEL FUZZ
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Fuzz test cancel returns exact stored amount
     * @dev Sender gets back amountStored (msg.value - fee), not msg.value
     */
    function testFuzz_CancelReturnsExactAmount(uint256 msgValue) public {
        msgValue = bound(msgValue, 0.001 ether, 50 ether);
        
        // Calculate what will be stored
        uint256 fee = vault.calculateFee(msgValue);
        uint256 expectedRefund = msgValue - fee;
        
        vm.prank(sender);
        uint256 transferId = vault.sendETH{value: msgValue}(
            recipient,
            MIN_DELAY,
            MIN_EXPIRY,
            sender,
            sender,
            "To cancel"
        );
        
        uint256 senderBalanceBefore = sender.balance;
        
        vm.prank(sender);
        vault.cancel(transferId);
        
        uint256 senderBalanceAfter = sender.balance;
        
        // Sender should get back the stored amount (msg.value - fee)
        assertEq(senderBalanceAfter - senderBalanceBefore, expectedRefund, "Cancel amount mismatch");
    }

    // ═══════════════════════════════════════════════════════════════
    //                      CLAIM FUZZ
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Fuzz test claim after unlock returns stored amount
     */
    function testFuzz_ClaimAfterUnlock(uint256 msgValue, uint256 delay) public {
        msgValue = bound(msgValue, 0.001 ether, 50 ether);
        delay = bound(delay, MIN_DELAY, MAX_DELAY);
        
        // Calculate expected payout
        uint256 fee = vault.calculateFee(msgValue);
        uint256 expectedPayout = msgValue - fee;
        
        vm.prank(sender);
        uint256 transferId = vault.sendETH{value: msgValue}(
            recipient,
            delay,
            MIN_EXPIRY,
            sender,
            sender,
            "To claim"
        );
        
        // Warp past unlock time
        vm.warp(block.timestamp + delay + 1);
        
        uint256 recipientBalanceBefore = recipient.balance;
        
        vm.prank(recipient);
        vault.claim(transferId);
        
        uint256 recipientBalanceAfter = recipient.balance;
        
        // Recipient should get the stored amount
        assertEq(recipientBalanceAfter - recipientBalanceBefore, expectedPayout, "Claim amount mismatch");
    }

    /**
     * @notice Fuzz test claim before unlock fails
     */
    function testFuzz_ClaimBeforeUnlockFails(uint256 msgValue, uint256 delay, uint256 timeElapsed) public {
        msgValue = bound(msgValue, 0.001 ether, 50 ether);
        delay = bound(delay, MIN_DELAY, MAX_DELAY);
        timeElapsed = bound(timeElapsed, 0, delay - 1);
        
        vm.prank(sender);
        uint256 transferId = vault.sendETH{value: msgValue}(
            recipient,
            delay,
            MIN_EXPIRY,
            sender,
            sender,
            "Too early"
        );
        
        // Warp but not past unlock
        vm.warp(block.timestamp + timeElapsed);
        
        vm.prank(recipient);
        vm.expectRevert(ReversoVault.TransferStillLocked.selector);
        vault.claim(transferId);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      TVL INVARIANT
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Fuzz test TVL equals sum of stored amounts
     * @dev TVL = sum of (msg.value - fee) for each transfer
     */
    function testFuzz_TVLConsistency(uint256 msgValue1, uint256 msgValue2) public {
        msgValue1 = bound(msgValue1, 0.01 ether, 10 ether);
        msgValue2 = bound(msgValue2, 0.01 ether, 10 ether);
        
        // Calculate expected stored amounts
        uint256 stored1 = msgValue1 - vault.calculateFee(msgValue1);
        uint256 stored2 = msgValue2 - vault.calculateFee(msgValue2);
        
        // Create two transfers
        vm.prank(sender);
        vault.sendETH{value: msgValue1}(recipient, MIN_DELAY, MIN_EXPIRY, sender, sender, "1");
        
        vm.prank(sender);
        vault.sendETH{value: msgValue2}(recipient, MIN_DELAY, MIN_EXPIRY, sender, sender, "2");
        
        // TVL should equal sum of stored amounts
        uint256 tvl = vault.totalValueLocked(address(0));
        assertEq(tvl, stored1 + stored2, "TVL mismatch");
    }

    // ═══════════════════════════════════════════════════════════════
    //                      BATCH SIZE LIMIT
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Fuzz test batch size limit enforcement (MAX_BATCH_SIZE = 50)
     */
    function testFuzz_BatchSizeLimitEnforced(uint256 batchSize) public {
        batchSize = bound(batchSize, 51, 1000);
        
        uint256[] memory ids = new uint256[](batchSize);
        for (uint256 i = 0; i < batchSize; i++) {
            ids[i] = i + 1;
        }
        
        vm.expectRevert(ReversoVault.BatchTooLarge.selector);
        vault.batchRefundExpired(ids);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      ADDITIONAL INVARIANTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Fuzz test fee always goes to treasury
     */
    function testFuzz_FeeGoesToTreasury(uint256 msgValue) public {
        msgValue = bound(msgValue, 0.01 ether, 100 ether);
        
        uint256 expectedFee = vault.calculateFee(msgValue);
        uint256 treasuryBefore = treasury.balance;
        
        vm.prank(sender);
        vault.sendETH{value: msgValue}(recipient, MIN_DELAY, MIN_EXPIRY, sender, sender, "Fee test");
        
        uint256 treasuryAfter = treasury.balance;
        assertEq(treasuryAfter - treasuryBefore, expectedFee, "Treasury didn't receive fee");
    }

    /**
     * @notice Fuzz test transfer ID always increments
     */
    function testFuzz_TransferIdAlwaysIncrements(uint256 numTransfers) public {
        numTransfers = bound(numTransfers, 1, 10);
        
        for (uint256 i = 1; i <= numTransfers; i++) {
            vm.prank(sender);
            uint256 id = vault.sendETH{value: 0.1 ether}(
                recipient, MIN_DELAY, MIN_EXPIRY, sender, sender, ""
            );
            assertEq(id, i, "Transfer ID should increment");
        }
    }

    /**
     * @notice Fuzz test amount bounds 
     */
    function testFuzz_ZeroAmountReverts() public {
        vm.prank(sender);
        vm.expectRevert(ReversoVault.InvalidAmount.selector);
        vault.sendETH{value: 0}(recipient, MIN_DELAY, MIN_EXPIRY, sender, sender, "Zero");
    }

    receive() external payable {}
}
