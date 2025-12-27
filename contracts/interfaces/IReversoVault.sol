// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReversoVault
 * @author REVERSO Protocol
 * @notice Interface for the ReversoVault contract
 */
interface IReversoVault {
    
    // ═══════════════════════════════════════════════════════════════
    //                           STRUCTS
    // ═══════════════════════════════════════════════════════════════
    
    struct Transfer {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        uint256 createdAt;
        uint256 unlockAt;
        uint256 expiresAt;
        address recoveryAddress1;      // Primary recovery
        address recoveryAddress2;      // Secondary recovery (backup)
        string memo;
        TransferStatus status;
        bool frozenByGuardian;         // Guardian can freeze suspicious transfers
    }

    enum TransferStatus {
        Pending,
        Claimed,
        Cancelled,
        Refunded,
        Frozen
    }

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
        address indexed refundedTo,
        uint256 amount,
        string reason
    );

    event FeeCollected(
        uint256 indexed transferId,
        address token,
        uint256 feeAmount
    );

    event GuardianUpdated(address indexed guardian, bool status);
    event TransferFrozen(uint256 indexed transferId, address indexed guardian);
    event CircuitBreakerTriggered(uint256 withdrawals, uint256 value);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);

    // ═══════════════════════════════════════════════════════════════
    //                       CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function sendETH(
        address _recipient,
        uint256 _delay,
        uint256 _expiryPeriod,
        address _recoveryAddress1,
        address _recoveryAddress2,
        string calldata _memo
    ) external payable returns (uint256 transferId);

    function sendETHSimple(
        address _recipient,
        string calldata _memo
    ) external payable returns (uint256 transferId);

    function sendToken(
        address _token,
        address _recipient,
        uint256 _amount,
        uint256 _delay,
        uint256 _expiryPeriod,
        address _recoveryAddress1,
        address _recoveryAddress2,
        string calldata _memo
    ) external returns (uint256 transferId);

    function cancel(uint256 _transferId) external;

    function claim(uint256 _transferId) external;

    function refundExpired(uint256 _transferId) external;

    function batchRefundExpired(uint256[] calldata _transferIds) external;

    function freezeTransfer(uint256 _transferId) external;

    function rescueAbandoned(uint256 _transferId) external;

    function manualRefund(
        uint256 _originalTransferId,
        address _to,
        address _token,
        uint256 _amount,
        string calldata _reason
    ) external;

    // ═══════════════════════════════════════════════════════════════
    //                       VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function getTransfer(uint256 _transferId) external view returns (Transfer memory);
    function getSentTransfers(address _user) external view returns (uint256[] memory);
    function getReceivedTransfers(address _user) external view returns (uint256[] memory);
    function canCancel(uint256 _transferId) external view returns (bool);
    function canClaim(uint256 _transferId) external view returns (bool);
    function isExpired(uint256 _transferId) external view returns (bool);
    function getTimeRemaining(uint256 _transferId) external view returns (uint256);
    function getTimeToExpiry(uint256 _transferId) external view returns (uint256);
    function getTransferStatusString(uint256 _transferId) external view returns (string memory);
    function isGuardian(address _addr) external view returns (bool);

    // ═══════════════════════════════════════════════════════════════
    //                       ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function setTreasury(address _newTreasury) external;
    function setProtocolFee(uint256 _newFeeBps) external;
    function setGuardian(address _guardian, bool _status) external;
    function setCircuitBreakerLimits(uint256 _maxWithdrawals, uint256 _maxValue) external;
    function pause() external;
    function unpause() external;

    // ═══════════════════════════════════════════════════════════════
    //                       STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════

    function transferCount() external view returns (uint256);
    function protocolFeeBps() external view returns (uint256);
    function treasury() external view returns (address);
    function totalValueLocked(address token) external view returns (uint256);
    function MIN_DELAY() external view returns (uint256);
    function MAX_DELAY() external view returns (uint256);
    function DEFAULT_EXPIRY() external view returns (uint256);
    function MIN_EXPIRY() external view returns (uint256);
    function RESCUE_PERIOD() external view returns (uint256);
    function maxWithdrawalsPerHour() external view returns (uint256);
    function maxValuePerHour() external view returns (uint256);
}
