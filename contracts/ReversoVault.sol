// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ReversoVault
 * @author REVERSO Protocol
 * @notice The first reversible transaction protocol on blockchain
 * @dev Enables time-locked transfers that can be cancelled before expiry
 * 
 * ██████╗ ███████╗██╗   ██╗███████╗██████╗ ███████╗ ██████╗ 
 * ██╔══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝██╔═══██╗
 * ██████╔╝█████╗  ██║   ██║█████╗  ██████╔╝███████╗██║   ██║
 * ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║   ██║
 * ██║  ██║███████╗ ╚████╔╝ ███████╗██║  ██║███████║╚██████╔╝
 * ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ 
 *
 * "Never lose crypto to mistakes again."
 */
contract ReversoVault is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════
    //                           STRUCTS
    // ═══════════════════════════════════════════════════════════════
    
    struct Transfer {
        address sender;           // Who sent the funds
        address recipient;        // Who will receive the funds
        address token;            // Token address (address(0) for ETH)
        uint256 amount;           // Amount to transfer
        uint256 createdAt;        // Timestamp when created
        uint256 unlockAt;         // Timestamp when claimable
        uint256 expiresAt;        // Timestamp when auto-refunds to sender
        address recoveryAddress1; // Primary backup address
        address recoveryAddress2; // Secondary backup address (TRIPLE SAFETY)
        string memo;              // Optional memo/note
        TransferStatus status;    // Current status
        bool hasInsurance;        // Premium insurance coverage
    }

    enum TransferStatus {
        Pending,      // Waiting for unlock time
        Claimed,      // Recipient claimed funds
        Cancelled,    // Sender cancelled
        Refunded      // Auto-refunded after expiry (recipient didn't claim)
    }

    // ═══════════════════════════════════════════════════════════════
    //                         STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════

    /// @notice Counter for transfer IDs
    uint256 public transferCount;

    /// @notice Fee tiers in basis points
    /// @dev Retail < 1K = 0.3%, Standard 1K-100K = 0.5%, Whale > 100K = 0.7%
    uint256 public constant FEE_RETAIL = 30;      // 0.3%
    uint256 public constant FEE_STANDARD = 50;    // 0.5%
    uint256 public constant FEE_WHALE = 70;       // 0.7%
    
    /// @notice Tier thresholds (in USD value, using ETH as proxy)
    /// @dev $1K ≈ 0.4 ETH, $100K ≈ 40 ETH (at ~$2500/ETH)
    uint256 public constant TIER_RETAIL_MAX = 0.4 ether;      // ~$1,000
    uint256 public constant TIER_STANDARD_MAX = 40 ether;     // ~$100,000

    /// @notice Insurance premium fee (0.2% extra)
    uint256 public constant INSURANCE_FEE_BPS = 20;           // 0.2%

    /// @notice Insurance pool balance
    uint256 public insurancePool;

    /// @notice Minimum delay allowed (1 hour)
    uint256 public constant MIN_DELAY = 1 hours;

    /// @notice Maximum delay allowed (30 days)
    uint256 public constant MAX_DELAY = 30 days;

    /// @notice Default expiry period after unlock (30 days to claim)
    uint256 public constant DEFAULT_EXPIRY = 30 days;

    /// @notice Minimum expiry period (7 days to claim after unlock)
    uint256 public constant MIN_EXPIRY = 7 days;

    /// @notice Rescue period: after this time, abandoned funds go to treasury
    /// @dev 90 days after expiry = ~4 months total from creation
    uint256 public constant RESCUE_PERIOD = 90 days;

    /// @notice Timelock for admin changes (48 hours)
    uint256 public constant ADMIN_TIMELOCK = 48 hours;

    /// @notice Circuit breaker: max withdrawals per hour before alert
    uint256 public maxWithdrawalsPerHour = 100;

    /// @notice Circuit breaker: max value per hour before alert
    uint256 public maxValuePerHour = 1000 ether;

    /// @notice Withdrawal tracking for circuit breaker
    uint256 public withdrawalsThisHour;
    uint256 public valueWithdrawnThisHour;
    uint256 public currentHourStart;

    /// @notice Per-address rate limiting (anti-DoS)
    uint256 public constant MAX_CLAIMS_PER_ADDRESS_PER_HOUR = 10;
    mapping(address => uint256) public addressClaimsThisHour;
    mapping(address => uint256) public addressHourStart;

    /// @notice Alert threshold for high volume (% of TVL)
    uint256 public alertThresholdBps = 2000; // 20% of TVL triggers alert

    /// @notice Pending admin changes (timelock)
    struct PendingChange {
        address newValue;
        uint256 executeAfter;
        bool exists;
    }
    mapping(bytes32 => PendingChange) public pendingChanges;

    /// @notice Guardians who can freeze suspicious transfers
    mapping(address => bool) public guardians;

    /// @notice Treasury address for fees
    address public treasury;

    /// @notice Mapping of transfer ID to Transfer struct
    mapping(uint256 => Transfer) public transfers;

    /// @notice User's active transfers (sender)
    mapping(address => uint256[]) public userSentTransfers;

    /// @notice User's incoming transfers (recipient)
    mapping(address => uint256[]) public userReceivedTransfers;

    /// @notice Total value locked per token
    mapping(address => uint256) public totalValueLocked;

    // ═══════════════════════════════════════════════════════════════
    //                            EVENTS
    // ═══════════════════════════════════════════════════════════════

    event TransferCreated(
        uint256 indexed transferId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 unlockAt,
        uint256 expiresAt,
        string memo
    );

    event TransferCancelled(
        uint256 indexed transferId,
        address indexed sender,
        uint256 amount
    );

    event TransferClaimed(
        uint256 indexed transferId,
        address indexed recipient,
        uint256 amount
    );

    event TransferRefunded(
        uint256 indexed transferId,
        address indexed sender,
        uint256 amount,
        string reason
    );

    event FeeCollected(
        uint256 indexed transferId,
        address token,
        uint256 feeAmount
    );

    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);
    event GuardianUpdated(address guardian, bool status);
    event TransferFrozen(uint256 indexed transferId, address guardian, string reason);
    event AdminChangeQueued(bytes32 changeId, address newValue, uint256 executeAfter);
    event AdminChangeExecuted(bytes32 changeId, address newValue);
    event CircuitBreakerTriggered(uint256 withdrawals, uint256 value);
    event HighVolumeAlert(address indexed triggeredBy, uint256 withdrawals, uint256 value, uint256 tvlPercent);
    event AddressRateLimited(address indexed addr, uint256 claimsThisHour);
    event AbandonedFundsRescued(uint256 indexed transferId, address token, uint256 amount);
    event ManualRefundIssued(uint256 indexed transferId, address indexed to, uint256 amount, string reason);
    event InsurancePurchased(uint256 indexed transferId, uint256 premiumPaid);
    event InsuranceClaimPaid(uint256 indexed transferId, address indexed to, uint256 amount, string reason);

    // ═══════════════════════════════════════════════════════════════
    //                            ERRORS
    // ═══════════════════════════════════════════════════════════════

    error InvalidRecipient();
    error InvalidAmount();
    error InvalidDelay();
    error InvalidExpiry();
    error TransferNotFound();
    error NotSender();
    error NotRecipient();
    error NotAuthorized();
    error TransferNotPending();
    error TransferStillLocked();
    error TransferAlreadyUnlocked();
    error TransferNotExpired();
    error TransferFrozenByGuardian();
    error NotGuardian();
    error TimelockNotExpired();
    error ChangeNotQueued();
    error CircuitBreakerActive();
    error AddressRateLimitedError(address addr, uint256 claims);
    error InsufficientFee();

    // ═══════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    constructor(address _treasury) Ownable(msg.sender) {
        if (_treasury == address(0)) revert InvalidRecipient();
        treasury = _treasury;
    }

    // ═══════════════════════════════════════════════════════════════
    //                       FEE CALCULATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Calculate fee based on transfer amount (Progressive Fee Structure)
     * @dev Retail (<$1K): 0.3% | Standard ($1K-$100K): 0.5% | Whale (>$100K): 0.7%
     * @param _amount The transfer amount in wei
     * @return feeBps The fee in basis points
     */
    function calculateFeeBps(uint256 _amount) public pure returns (uint256 feeBps) {
        if (_amount <= TIER_RETAIL_MAX) {
            return FEE_RETAIL;      // 0.3% - Help the small guys
        } else if (_amount <= TIER_STANDARD_MAX) {
            return FEE_STANDARD;    // 0.5% - Standard tier
        } else {
            return FEE_WHALE;       // 0.7% - Premium service for whales
        }
    }

    /**
     * @notice Calculate actual fee amount
     * @param _amount The transfer amount
     * @return feeAmount The fee to collect
     */
    function calculateFee(uint256 _amount) public pure returns (uint256 feeAmount) {
        uint256 feeBps = calculateFeeBps(_amount);
        return (_amount * feeBps) / 10000;
    }

    /**
     * @notice Calculate insurance premium
     * @param _amount The transfer amount
     * @return premium The insurance premium (0.2%)
     */
    function calculateInsurancePremium(uint256 _amount) public pure returns (uint256 premium) {
        return (_amount * INSURANCE_FEE_BPS) / 10000;
    }

    // ═══════════════════════════════════════════════════════════════
    //                       CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Send ETH with a reversible delay
     * @param _recipient Address to receive funds after delay
     * @param _delay Time in seconds before funds can be claimed (min 1h, max 30d)
     * @param _expiryPeriod Time after unlock for recipient to claim (min 7d, default 30d)
     * @param _recoveryAddress1 Primary backup address if recipient doesn't claim
     * @param _recoveryAddress2 Secondary backup address (TRIPLE SAFETY)
     * @param _memo Optional memo/note for the transfer
     * @return transferId The ID of the created transfer
     */
    function sendETH(
        address _recipient,
        uint256 _delay,
        uint256 _expiryPeriod,
        address _recoveryAddress1,
        address _recoveryAddress2,
        string calldata _memo
    ) external payable nonReentrant whenNotPaused returns (uint256 transferId) {
        if (_recipient == address(0) || _recipient == msg.sender) revert InvalidRecipient();
        if (msg.value == 0) revert InvalidAmount();
        if (_delay < MIN_DELAY || _delay > MAX_DELAY) revert InvalidDelay();
        
        // Default expiry if not specified
        uint256 expiryPeriod = _expiryPeriod == 0 ? DEFAULT_EXPIRY : _expiryPeriod;
        if (expiryPeriod < MIN_EXPIRY) revert InvalidExpiry();
        
        // Default recovery addresses to sender if not specified
        address recovery1 = _recoveryAddress1 == address(0) ? msg.sender : _recoveryAddress1;
        address recovery2 = _recoveryAddress2 == address(0) ? msg.sender : _recoveryAddress2;

        // Calculate PROGRESSIVE fee based on amount
        uint256 fee = calculateFee(msg.value);
        uint256 amountAfterFee = msg.value - fee;

        // Create transfer
        transferId = ++transferCount;
        
        uint256 unlockTime = block.timestamp + _delay;
        uint256 expiryTime = unlockTime + expiryPeriod;
        
        transfers[transferId] = Transfer({
            sender: msg.sender,
            recipient: _recipient,
            token: address(0), // ETH
            amount: amountAfterFee,
            createdAt: block.timestamp,
            unlockAt: unlockTime,
            expiresAt: expiryTime,
            recoveryAddress1: recovery1,
            recoveryAddress2: recovery2,
            memo: _memo,
            status: TransferStatus.Pending,
            hasInsurance: false
        });

        // Track transfers
        userSentTransfers[msg.sender].push(transferId);
        userReceivedTransfers[_recipient].push(transferId);
        totalValueLocked[address(0)] += amountAfterFee;

        // Send fee to treasury
        if (fee > 0) {
            (bool feeSuccess, ) = treasury.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
            emit FeeCollected(transferId, address(0), fee);
        }

        emit TransferCreated(
            transferId,
            msg.sender,
            _recipient,
            address(0),
            amountAfterFee,
            unlockTime,
            expiryTime,
            _memo
        );
    }

    /**
     * @notice Send ETH with default settings (24h delay, 30d expiry)
     * @param _recipient Address to receive funds after delay
     * @param _memo Optional memo/note for the transfer
     * @return transferId The ID of the created transfer
     */
    function sendETHSimple(
        address _recipient,
        string calldata _memo
    ) external payable nonReentrant whenNotPaused returns (uint256 transferId) {
        if (_recipient == address(0) || _recipient == msg.sender) revert InvalidRecipient();
        if (msg.value == 0) revert InvalidAmount();

        // Calculate PROGRESSIVE fee based on amount
        uint256 fee = calculateFee(msg.value);
        uint256 amountAfterFee = msg.value - fee;

        // Create transfer with defaults: 24h delay, 30d expiry, sender as both recovery
        transferId = ++transferCount;
        
        uint256 unlockTime = block.timestamp + 24 hours;
        uint256 expiryTime = unlockTime + DEFAULT_EXPIRY;
        
        transfers[transferId] = Transfer({
            sender: msg.sender,
            recipient: _recipient,
            token: address(0),
            amount: amountAfterFee,
            createdAt: block.timestamp,
            unlockAt: unlockTime,
            expiresAt: expiryTime,
            recoveryAddress1: msg.sender,
            recoveryAddress2: msg.sender,
            memo: _memo,
            status: TransferStatus.Pending,
            hasInsurance: false
        });

        userSentTransfers[msg.sender].push(transferId);
        userReceivedTransfers[_recipient].push(transferId);
        totalValueLocked[address(0)] += amountAfterFee;

        if (fee > 0) {
            (bool feeSuccess, ) = treasury.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
            emit FeeCollected(transferId, address(0), fee);
        }

        emit TransferCreated(
            transferId,
            msg.sender,
            _recipient,
            address(0),
            amountAfterFee,
            unlockTime,
            expiryTime,
            _memo
        );
    }

    /**
     * @notice Send ERC20 tokens with a reversible delay
     * @param _token ERC20 token address
     * @param _recipient Address to receive funds after delay
     * @param _amount Amount of tokens to send
     * @param _delay Time in seconds before funds can be claimed (min 1h, max 30d)
     * @param _expiryPeriod Time after unlock for recipient to claim (min 7d, default 30d)
     * @param _recoveryAddress1 Primary backup address if recipient doesn't claim
     * @param _recoveryAddress2 Secondary backup address (TRIPLE SAFETY)
     * @param _memo Optional memo/note for the transfer
     * @return transferId The ID of the created transfer
     */
    function sendToken(
        address _token,
        address _recipient,
        uint256 _amount,
        uint256 _delay,
        uint256 _expiryPeriod,
        address _recoveryAddress1,
        address _recoveryAddress2,
        string calldata _memo
    ) external nonReentrant whenNotPaused returns (uint256 transferId) {
        if (_recipient == address(0) || _recipient == msg.sender) revert InvalidRecipient();
        if (_amount == 0) revert InvalidAmount();
        if (_delay < MIN_DELAY || _delay > MAX_DELAY) revert InvalidDelay();

        // Default expiry if not specified
        uint256 expiryPeriod = _expiryPeriod == 0 ? DEFAULT_EXPIRY : _expiryPeriod;
        if (expiryPeriod < MIN_EXPIRY) revert InvalidExpiry();
        
        // Default recovery addresses to sender if not specified
        address recovery1 = _recoveryAddress1 == address(0) ? msg.sender : _recoveryAddress1;
        address recovery2 = _recoveryAddress2 == address(0) ? msg.sender : _recoveryAddress2;

        // Calculate PROGRESSIVE fee based on amount
        // Note: For tokens, fee tier is based on token amount, not USD value
        uint256 fee = (_amount * calculateFeeBps(_amount)) / 10000;
        uint256 amountAfterFee = _amount - fee;

        // Transfer tokens to vault
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Send fee to treasury
        if (fee > 0) {
            IERC20(_token).safeTransfer(treasury, fee);
        }

        // Create transfer
        transferId = ++transferCount;
        
        uint256 unlockTime = block.timestamp + _delay;
        uint256 expiryTime = unlockTime + expiryPeriod;
        
        transfers[transferId] = Transfer({
            sender: msg.sender,
            recipient: _recipient,
            token: _token,
            amount: amountAfterFee,
            createdAt: block.timestamp,
            unlockAt: unlockTime,
            expiresAt: expiryTime,
            recoveryAddress1: recovery1,
            recoveryAddress2: recovery2,
            memo: _memo,
            status: TransferStatus.Pending,
            hasInsurance: false
        });

        // Track transfers
        userSentTransfers[msg.sender].push(transferId);
        userReceivedTransfers[_recipient].push(transferId);
        totalValueLocked[_token] += amountAfterFee;

        if (fee > 0) {
            emit FeeCollected(transferId, _token, fee);
        }

        emit TransferCreated(
            transferId,
            msg.sender,
            _recipient,
            _token,
            amountAfterFee,
            unlockTime,
            expiryTime,
            _memo
        );
    }

    /**
     * @notice Send ETH with PREMIUM insurance coverage
     * @dev Pays extra 0.2% for full scam/theft protection
     * @param _recipient Address to receive funds after delay
     * @param _delay Time in seconds before funds can be claimed
     * @param _expiryPeriod Time after unlock for recipient to claim
     * @param _recoveryAddress1 Primary backup address
     * @param _recoveryAddress2 Secondary backup address
     * @param _memo Optional memo/note
     * @return transferId The ID of the created transfer
     */
    function sendETHPremium(
        address _recipient,
        uint256 _delay,
        uint256 _expiryPeriod,
        address _recoveryAddress1,
        address _recoveryAddress2,
        string calldata _memo
    ) external payable nonReentrant whenNotPaused returns (uint256 transferId) {
        if (_recipient == address(0) || _recipient == msg.sender) revert InvalidRecipient();
        if (msg.value == 0) revert InvalidAmount();
        if (_delay < MIN_DELAY || _delay > MAX_DELAY) revert InvalidDelay();
        
        uint256 expiryPeriod = _expiryPeriod == 0 ? DEFAULT_EXPIRY : _expiryPeriod;
        if (expiryPeriod < MIN_EXPIRY) revert InvalidExpiry();
        
        address recovery1 = _recoveryAddress1 == address(0) ? msg.sender : _recoveryAddress1;
        address recovery2 = _recoveryAddress2 == address(0) ? msg.sender : _recoveryAddress2;

        // Calculate fees: base fee + insurance premium
        uint256 baseFee = calculateFee(msg.value);
        uint256 insurancePremium = calculateInsurancePremium(msg.value);
        uint256 totalFee = baseFee + insurancePremium;
        uint256 amountAfterFee = msg.value - totalFee;

        // Create transfer with PREMIUM features
        transferId = ++transferCount;
        
        uint256 unlockTime = block.timestamp + _delay;
        uint256 expiryTime = unlockTime + expiryPeriod;
        
        transfers[transferId] = Transfer({
            sender: msg.sender,
            recipient: _recipient,
            token: address(0),
            amount: amountAfterFee,
            createdAt: block.timestamp,
            unlockAt: unlockTime,
            expiresAt: expiryTime,
            recoveryAddress1: recovery1,
            recoveryAddress2: recovery2,
            memo: _memo,
            status: TransferStatus.Pending,
            hasInsurance: true
        });

        // Track transfers
        userSentTransfers[msg.sender].push(transferId);
        userReceivedTransfers[_recipient].push(transferId);
        totalValueLocked[address(0)] += amountAfterFee;

        // Send base fee to treasury
        if (baseFee > 0) {
            (bool feeSuccess, ) = treasury.call{value: baseFee}("");
            require(feeSuccess, "Fee transfer failed");
            emit FeeCollected(transferId, address(0), baseFee);
        }

        // Add insurance premium to pool
        if (insurancePremium > 0) {
            insurancePool += insurancePremium;
            emit InsurancePurchased(transferId, insurancePremium);
        }

        emit TransferCreated(
            transferId,
            msg.sender,
            _recipient,
            address(0),
            amountAfterFee,
            unlockTime,
            expiryTime,
            _memo
        );
    }

    /**
     * @notice Cancel a pending transfer and get funds back
     * @dev Only sender can cancel, only before unlock time
     * @param _transferId ID of the transfer to cancel
     */
    function cancel(uint256 _transferId) external nonReentrant {
        Transfer storage transfer = transfers[_transferId];
        
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.sender != msg.sender) revert NotSender();
        if (transfer.status != TransferStatus.Pending) revert TransferNotPending();
        if (block.timestamp >= transfer.unlockAt) revert TransferAlreadyUnlocked();

        // Update status
        transfer.status = TransferStatus.Cancelled;
        totalValueLocked[transfer.token] -= transfer.amount;

        // Return funds
        if (transfer.token == address(0)) {
            (bool success, ) = msg.sender.call{value: transfer.amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(transfer.token).safeTransfer(msg.sender, transfer.amount);
        }

        emit TransferCancelled(_transferId, msg.sender, transfer.amount);
    }

    /**
     * @notice Claim funds after the delay has passed
     * @dev Only recipient can claim, only after unlock time and before expiry
     * @param _transferId ID of the transfer to claim
     */
    function claim(uint256 _transferId) external nonReentrant {
        // Per-address rate limit (prevents single address DoS)
        _checkAddressRateLimit();
        
        Transfer storage transfer = transfers[_transferId];
        
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.recipient != msg.sender) revert NotRecipient();
        if (transfer.status != TransferStatus.Pending) revert TransferNotPending();
        if (block.timestamp < transfer.unlockAt) revert TransferStillLocked();
        if (block.timestamp > transfer.expiresAt) revert TransferNotExpired();

        // Circuit breaker check (alert only, no auto-pause)
        _checkCircuitBreaker(transfer.amount);

        // Update status
        transfer.status = TransferStatus.Claimed;
        totalValueLocked[transfer.token] -= transfer.amount;

        // Send funds to recipient
        if (transfer.token == address(0)) {
            (bool success, ) = msg.sender.call{value: transfer.amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(transfer.token).safeTransfer(msg.sender, transfer.amount);
        }

        emit TransferClaimed(_transferId, msg.sender, transfer.amount);
    }

    /**
     * @notice Refund expired transfer with TRIPLE FALLBACK SYSTEM
     * @dev Tries: 1) recoveryAddress1 → 2) recoveryAddress2 → 3) original sender
     * @param _transferId ID of the transfer to refund
     */
    function refundExpired(uint256 _transferId) external nonReentrant {
        Transfer storage transfer = transfers[_transferId];
        
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.status != TransferStatus.Pending) revert TransferNotPending();
        if (block.timestamp <= transfer.expiresAt) revert TransferNotExpired();

        // Circuit breaker check
        _checkCircuitBreaker(transfer.amount);

        // Update status
        transfer.status = TransferStatus.Refunded;
        totalValueLocked[transfer.token] -= transfer.amount;

        // TRIPLE FALLBACK: Try recovery1 → recovery2 → sender
        address refundTo;
        bool success;
        
        if (transfer.token == address(0)) {
            // Try recovery address 1
            (success, ) = transfer.recoveryAddress1.call{value: transfer.amount}("");
            if (success) {
                refundTo = transfer.recoveryAddress1;
            } else {
                // Try recovery address 2
                (success, ) = transfer.recoveryAddress2.call{value: transfer.amount}("");
                if (success) {
                    refundTo = transfer.recoveryAddress2;
                } else {
                    // Final fallback: original sender
                    (success, ) = transfer.sender.call{value: transfer.amount}("");
                    require(success, "All refund attempts failed");
                    refundTo = transfer.sender;
                }
            }
        } else {
            // For tokens, try each address
            try IERC20(transfer.token).transfer(transfer.recoveryAddress1, transfer.amount) {
                refundTo = transfer.recoveryAddress1;
            } catch {
                try IERC20(transfer.token).transfer(transfer.recoveryAddress2, transfer.amount) {
                    refundTo = transfer.recoveryAddress2;
                } catch {
                    IERC20(transfer.token).safeTransfer(transfer.sender, transfer.amount);
                    refundTo = transfer.sender;
                }
            }
        }

        emit TransferRefunded(_transferId, refundTo, transfer.amount, "Expired - triple fallback refund");
    }

    /**
     * @notice Batch refund multiple expired transfers
     * @dev Useful for cleaning up old transfers
     * @param _transferIds Array of transfer IDs to refund
     */
    function batchRefundExpired(uint256[] calldata _transferIds) external nonReentrant {
        for (uint256 i = 0; i < _transferIds.length; i++) {
            Transfer storage transfer = transfers[_transferIds[i]];
            
            if (transfer.sender == address(0)) continue;
            if (transfer.status != TransferStatus.Pending) continue;
            if (block.timestamp <= transfer.expiresAt) continue;

            transfer.status = TransferStatus.Refunded;
            totalValueLocked[transfer.token] -= transfer.amount;

            // Use recovery1 as primary for batch (gas optimization)
            address refundTo = transfer.recoveryAddress1;
            
            if (transfer.token == address(0)) {
                (bool success, ) = refundTo.call{value: transfer.amount}("");
                if (!success) {
                    // Fallback to sender
                    (success, ) = transfer.sender.call{value: transfer.amount}("");
                    if (success) refundTo = transfer.sender;
                }
                if (success) {
                    emit TransferRefunded(_transferIds[i], refundTo, transfer.amount, "Batch refund");
                }
            } else {
                IERC20(transfer.token).safeTransfer(refundTo, transfer.amount);
                emit TransferRefunded(_transferIds[i], refundTo, transfer.amount, "Batch refund");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    CIRCUIT BREAKER & SECURITY
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Check per-address rate limit
     * @dev Prevents single address from spamming claims (DoS protection)
     */
    function _checkAddressRateLimit() internal {
        // Reset counter if new hour for this address
        if (block.timestamp >= addressHourStart[msg.sender] + 1 hours) {
            addressClaimsThisHour[msg.sender] = 0;
            addressHourStart[msg.sender] = block.timestamp;
        }
        
        addressClaimsThisHour[msg.sender]++;
        
        // Block if address exceeds limit (only affects this address, not others)
        if (addressClaimsThisHour[msg.sender] > MAX_CLAIMS_PER_ADDRESS_PER_HOUR) {
            emit AddressRateLimited(msg.sender, addressClaimsThisHour[msg.sender]);
            revert AddressRateLimitedError(msg.sender, addressClaimsThisHour[msg.sender]);
        }
    }

    /**
     * @notice Check and update circuit breaker (ALERT ONLY, no auto-pause)
     * @dev Emits alert for Guardian to review - prevents DoS via flash loan
     * @param _amount The withdrawal amount
     */
    function _checkCircuitBreaker(uint256 _amount) internal {
        // Reset counter if new hour
        if (block.timestamp >= currentHourStart + 1 hours) {
            currentHourStart = block.timestamp;
            withdrawalsThisHour = 0;
            valueWithdrawnThisHour = 0;
        }
        
        withdrawalsThisHour++;
        valueWithdrawnThisHour += _amount;
        
        // Calculate TVL percentage
        uint256 ethTvl = totalValueLocked[address(0)];
        uint256 tvlPercent = ethTvl > 0 ? (valueWithdrawnThisHour * 10000) / ethTvl : 0;
        
        // ALERT ONLY - Guardian decides whether to pause
        // This prevents flash loan DoS attacks
        if (withdrawalsThisHour > maxWithdrawalsPerHour || 
            valueWithdrawnThisHour > maxValuePerHour ||
            tvlPercent > alertThresholdBps) {
            emit HighVolumeAlert(msg.sender, withdrawalsThisHour, valueWithdrawnThisHour, tvlPercent);
            emit CircuitBreakerTriggered(withdrawalsThisHour, valueWithdrawnThisHour);
            // NO AUTO-PAUSE - Guardian reviews and decides
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                      GUARDIAN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Freeze a suspicious transfer (guardian only)
     * @param _transferId ID of the transfer to freeze
     * @param _reason Reason for freezing
     */
    function freezeTransfer(uint256 _transferId, string calldata _reason) external {
        if (!guardians[msg.sender]) revert NotGuardian();
        
        Transfer storage transfer = transfers[_transferId];
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.status != TransferStatus.Pending) revert TransferNotPending();
        
        // Move to cancelled (frozen) - funds go back to sender
        transfer.status = TransferStatus.Cancelled;
        totalValueLocked[transfer.token] -= transfer.amount;
        
        // Return to sender
        if (transfer.token == address(0)) {
            (bool success, ) = transfer.sender.call{value: transfer.amount}("");
            require(success, "Refund failed");
        } else {
            IERC20(transfer.token).safeTransfer(transfer.sender, transfer.amount);
        }
        
        emit TransferFrozen(_transferId, msg.sender, _reason);
        emit TransferCancelled(_transferId, transfer.sender, transfer.amount);
    }

    // ═══════════════════════════════════════════════════════════════
    //                       VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Get transfer details
     * @param _transferId ID of the transfer
     * @return Transfer struct with all details
     */
    function getTransfer(uint256 _transferId) external view returns (Transfer memory) {
        return transfers[_transferId];
    }

    /**
     * @notice Get all transfers sent by a user
     * @param _user Address of the sender
     * @return Array of transfer IDs
     */
    function getSentTransfers(address _user) external view returns (uint256[] memory) {
        return userSentTransfers[_user];
    }

    /**
     * @notice Get all transfers received by a user
     * @param _user Address of the recipient
     * @return Array of transfer IDs
     */
    function getReceivedTransfers(address _user) external view returns (uint256[] memory) {
        return userReceivedTransfers[_user];
    }

    /**
     * @notice Check if a transfer can be cancelled
     * @param _transferId ID of the transfer
     * @return canCancel Whether the transfer can be cancelled
     */
    function canCancel(uint256 _transferId) external view returns (bool) {
        Transfer memory transfer = transfers[_transferId];
        return transfer.status == TransferStatus.Pending && 
               block.timestamp < transfer.unlockAt;
    }

    /**
     * @notice Check if a transfer can be claimed
     * @param _transferId ID of the transfer
     * @return canClaim Whether the transfer can be claimed
     */
    function canClaim(uint256 _transferId) external view returns (bool) {
        Transfer memory transfer = transfers[_transferId];
        return transfer.status == TransferStatus.Pending && 
               block.timestamp >= transfer.unlockAt &&
               block.timestamp <= transfer.expiresAt;
    }

    /**
     * @notice Check if a transfer is expired and can be refunded
     * @param _transferId ID of the transfer
     * @return isExpired Whether the transfer has expired
     */
    function isExpired(uint256 _transferId) external view returns (bool) {
        Transfer memory transfer = transfers[_transferId];
        return transfer.status == TransferStatus.Pending && 
               block.timestamp > transfer.expiresAt;
    }

    /**
     * @notice Get time remaining until unlock
     * @param _transferId ID of the transfer
     * @return timeRemaining Seconds until unlock (0 if already unlocked)
     */
    function getTimeRemaining(uint256 _transferId) external view returns (uint256) {
        Transfer memory transfer = transfers[_transferId];
        if (block.timestamp >= transfer.unlockAt) return 0;
        return transfer.unlockAt - block.timestamp;
    }

    /**
     * @notice Get time remaining until expiry
     * @param _transferId ID of the transfer
     * @return timeToExpiry Seconds until expiry (0 if already expired)
     */
    function getTimeToExpiry(uint256 _transferId) external view returns (uint256) {
        Transfer memory transfer = transfers[_transferId];
        if (block.timestamp >= transfer.expiresAt) return 0;
        return transfer.expiresAt - block.timestamp;
    }

    /**
     * @notice Get transfer status as string
     * @param _transferId ID of the transfer
     * @return status Human readable status
     */
    function getTransferStatusString(uint256 _transferId) external view returns (string memory) {
        Transfer memory transfer = transfers[_transferId];
        
        if (transfer.status == TransferStatus.Claimed) return "Claimed";
        if (transfer.status == TransferStatus.Cancelled) return "Cancelled";
        if (transfer.status == TransferStatus.Refunded) return "Refunded";
        
        // Pending status - check timing
        if (block.timestamp < transfer.unlockAt) return "Locked";
        if (block.timestamp > transfer.expiresAt) return "Expired (awaiting refund)";
        return "Claimable";
    }

    // ═══════════════════════════════════════════════════════════════
    //                       ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Internal helper to try sending funds to an address
     * @param _to Address to send to
     * @param _token Token address (address(0) for ETH)
     * @param _amount Amount to send
     * @return success Whether the transfer succeeded
     */
    function _trySendFunds(address _to, address _token, uint256 _amount) internal returns (bool success) {
        if (_to == address(0)) return false;
        
        if (_token == address(0)) {
            // ETH transfer with gas limit
            (success, ) = _to.call{value: _amount, gas: 50000}("");
        } else {
            // ERC20 transfer
            try IERC20(_token).transfer(_to, _amount) returns (bool result) {
                success = result;
            } catch {
                success = false;
            }
        }
    }

    /**
     * @notice Update treasury address
     * @param _newTreasury New treasury address
     */
    function setTreasury(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert InvalidRecipient();
        address oldTreasury = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    // NOTE: Protocol fee is now progressive (FEE_RETAIL, FEE_STANDARD, FEE_WHALE)
    // and cannot be changed. This is by design for transparency.

    /**
     * @notice Add or remove a guardian
     * @param _guardian Address of the guardian
     * @param _status True to add, false to remove
     */
    function setGuardian(address _guardian, bool _status) external onlyOwner {
        guardians[_guardian] = _status;
        emit GuardianUpdated(_guardian, _status);
    }

    /**
     * @notice Update circuit breaker limits
     * @param _maxWithdrawals Max withdrawals per hour
     * @param _maxValue Max ETH value per hour
     */
    function setCircuitBreakerLimits(uint256 _maxWithdrawals, uint256 _maxValue) external onlyOwner {
        maxWithdrawalsPerHour = _maxWithdrawals;
        maxValuePerHour = _maxValue;
    }

    /**
     * @notice Update alert threshold (% of TVL that triggers alert)
     * @param _thresholdBps Threshold in basis points (e.g., 2000 = 20%)
     */
    function setAlertThreshold(uint256 _thresholdBps) external onlyOwner {
        require(_thresholdBps <= 10000, "Cannot exceed 100%");
        alertThresholdBps = _thresholdBps;
    }

    /**
     * @notice Pause the contract in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Check if address is a guardian
     */
    function isGuardian(address _addr) external view returns (bool) {
        return guardians[_addr];
    }

    // ═══════════════════════════════════════════════════════════════
    //                    INSURANCE CLAIMS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Pay an insurance claim to a verified victim
     * @dev Only owner can call. For users who had Premium and were scammed
     * @param _originalTransferId The original transfer ID (must have had insurance)
     * @param _to Address to send claim to (victim's new wallet)
     * @param _amount Amount to pay from insurance pool
     * @param _reason Reason for claim (for audit trail)
     */
    function payInsuranceClaim(
        uint256 _originalTransferId,
        address _to,
        uint256 _amount,
        string calldata _reason
    ) external onlyOwner nonReentrant {
        Transfer storage t = transfers[_originalTransferId];
        require(t.hasInsurance, "Transfer did not have insurance");
        require(t.status == TransferStatus.Claimed, "Transfer not claimed");
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0 && _amount <= insurancePool, "Invalid amount or insufficient pool");

        // Deduct from insurance pool
        insurancePool -= _amount;

        // Pay the claim
        (bool success, ) = payable(_to).call{value: _amount}("");
        require(success, "Claim payment failed");

        emit InsuranceClaimPaid(_originalTransferId, _to, _amount, _reason);
    }

    /**
     * @notice Get insurance pool balance
     */
    function getInsurancePoolBalance() external view returns (uint256) {
        return insurancePool;
    }

    /**
     * @notice Withdraw excess from insurance pool to treasury
     * @dev Only withdraw if pool is overfunded (keep 20% of TVL as reserve)
     */
    function withdrawExcessInsurance() external onlyOwner {
        uint256 requiredReserve = (totalValueLocked[address(0)] * 20) / 100; // 20% reserve
        require(insurancePool > requiredReserve, "Pool at minimum reserve");
        
        uint256 excess = insurancePool - requiredReserve;
        insurancePool = requiredReserve;
        
        (bool success, ) = treasury.call{value: excess}("");
        require(success, "Withdrawal failed");
    }

    // ═══════════════════════════════════════════════════════════════
    //                    ABANDONED FUNDS RESCUE
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Rescue abandoned funds after RESCUE_PERIOD (90 days post-expiry)
     * @dev Only for transfers where ALL recovery attempts failed
     *      Funds go to treasury so we can manually refund users who contact us
     * @param _transferId The transfer ID to rescue
     */
    function rescueAbandoned(uint256 _transferId) external nonReentrant {
        Transfer storage t = transfers[_transferId];
        if (t.sender == address(0)) revert TransferNotFound();
        if (t.status != TransferStatus.Pending) revert TransferNotPending();
        
        // Must be 90 days AFTER the expiry date
        require(
            block.timestamp > t.expiresAt + RESCUE_PERIOD,
            "Not abandoned yet - wait 90 days after expiry"
        );
        
        // First, try the normal refund flow one more time
        bool sent = _trySendFunds(t.recoveryAddress1, t.token, t.amount);
        if (!sent) {
            sent = _trySendFunds(t.recoveryAddress2, t.token, t.amount);
        }
        if (!sent) {
            sent = _trySendFunds(t.sender, t.token, t.amount);
        }
        
        // If normal flow worked, great!
        if (sent) {
            t.status = TransferStatus.Refunded;
            // Keep TVL consistent when late recovery succeeds
            totalValueLocked[t.token] -= t.amount;
            emit TransferRefunded(_transferId, t.sender, t.amount, "Late recovery succeeded");
            return;
        }
        
        // If ALL failed, send to treasury for manual handling
        t.status = TransferStatus.Refunded;
        totalValueLocked[t.token] -= t.amount;
        
        if (t.token == address(0)) {
            (bool success, ) = payable(treasury).call{value: t.amount}("");
            require(success, "Treasury transfer failed");
        } else {
            IERC20(t.token).safeTransfer(treasury, t.amount);
        }
        
        emit AbandonedFundsRescued(_transferId, t.token, t.amount);
    }

    /**
     * @notice Manually refund a user who contacts us about rescued funds
     * @dev Only owner can call. For users who lost access but can prove ownership
     * @param _originalTransferId The original transfer ID (for records)
     * @param _to Address to send funds to (verified user's new wallet)
     * @param _token Token address (address(0) for ETH)
     * @param _amount Amount to refund
     * @param _reason Reason for manual refund (for audit trail)
     */
    function manualRefund(
        uint256 _originalTransferId,
        address _to,
        address _token,
        uint256 _amount,
        string calldata _reason
    ) external onlyOwner nonReentrant {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Invalid amount");
        
        if (_token == address(0)) {
            require(address(this).balance >= _amount, "Insufficient ETH");
            (bool success, ) = payable(_to).call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            require(IERC20(_token).balanceOf(address(this)) >= _amount, "Insufficient tokens");
            IERC20(_token).safeTransfer(_to, _amount);
        }
        
        emit ManualRefundIssued(_originalTransferId, _to, _amount, _reason);
    }

    // ═══════════════════════════════════════════════════════════════
    //                       RECEIVE FUNCTION
    // ═══════════════════════════════════════════════════════════════

    receive() external payable {
        revert("Use sendETH function");
    }
}
