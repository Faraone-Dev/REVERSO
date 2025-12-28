// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EmergencyGuardian
 * @author REVERSO Protocol
 * @notice Guardian contract that protects ReversoVault with multi-layer security
 * @dev Deploy this AFTER ReversoVault, then transfer ReversoVault ownership to this contract
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                    🛡️ EMERGENCY GUARDIAN                      ║
 * ║                                                               ║
 * ║  "Il bodyguard che protegge il tuo contratto 24/7"          ║
 * ║                                                               ║
 * ║  Features:                                                    ║
 * ║  • Multi-signature per azioni critiche                       ║
 * ║  • Timelock 24h su operazioni sensibili                      ║
 * ║  • Emergency pause immediato                                  ║
 * ║  • Recovery system con doppia conferma                       ║
 * ║                                                               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

// Interface per comunicare con ReversoVault
interface IReversoVault {
    function pause() external;
    function unpause() external;
    function setTreasury(address _newTreasury) external;
    function setGuardian(address _guardian, bool _status) external;
    function transferOwnership(address newOwner) external;
    function owner() external view returns (address);
    function paused() external view returns (bool);
    function treasury() external view returns (address);
}

contract EmergencyGuardian is Ownable, ReentrancyGuard {
    
    // ═══════════════════════════════════════════════════════════════
    //                         STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════
    
    /// @notice The protected ReversoVault contract
    IReversoVault public vault;
    
    /// @notice Secondary guardian (backup key)
    address public secondaryGuardian;
    
    /// @notice Timelock duration for critical operations (default 24 hours)
    uint256 public constant TIMELOCK_DURATION = 24 hours;
    
    /// @notice Emergency pause can bypass timelock
    bool public emergencyMode;
    
    /// @notice Mapping of approved guardians who can trigger emergency
    mapping(address => bool) public emergencyGuardians;
    
    /// @notice Count of emergency guardians
    uint256 public guardianCount;
    
    // ═══════════════════════════════════════════════════════════════
    //                      TIMELOCK STRUCTURES
    // ═══════════════════════════════════════════════════════════════
    
    enum ActionType {
        CHANGE_TREASURY,
        UNPAUSE,
        ADD_VAULT_GUARDIAN,
        REMOVE_VAULT_GUARDIAN,
        TRANSFER_VAULT_OWNERSHIP,
        CHANGE_SECONDARY_GUARDIAN
    }
    
    struct TimelockAction {
        ActionType actionType;
        address target;           // Address parameter (if needed)
        uint256 value;            // Value parameter (if needed)
        uint256 executeAfter;     // Timestamp when can execute
        bool executed;
        bool cancelled;
        address proposedBy;
        address confirmedBy;      // Needs second confirmation
    }
    
    /// @notice Pending timelock actions
    mapping(uint256 => TimelockAction) public timelockActions;
    uint256 public actionCount;
    
    // ═══════════════════════════════════════════════════════════════
    //                           EVENTS
    // ═══════════════════════════════════════════════════════════════
    
    event VaultLinked(address indexed vault);
    event EmergencyPauseTriggered(address indexed triggeredBy, string reason);
    event ActionProposed(uint256 indexed actionId, ActionType actionType, address target, uint256 executeAfter);
    event ActionConfirmed(uint256 indexed actionId, address indexed confirmedBy);
    event ActionExecuted(uint256 indexed actionId, ActionType actionType);
    event ActionWasCancelled(uint256 indexed actionId, address indexed cancelledBy);
    event EmergencyGuardianUpdated(address indexed guardian, bool status);
    event SecondaryGuardianChanged(address indexed oldGuardian, address indexed newGuardian);
    event EmergencyModeChanged(bool enabled);
    
    // ═══════════════════════════════════════════════════════════════
    //                           ERRORS
    // ═══════════════════════════════════════════════════════════════
    
    error NotAuthorized();
    error VaultNotLinked();
    error ActionNotFound();
    error ActionAlreadyExecuted();
    error ActionIsCancelled();
    error TimelockNotExpired();
    error NeedsSecondConfirmation();
    error AlreadyConfirmed();
    error InvalidAddress();
    error CannotRemoveLastGuardian();
    
    // ═══════════════════════════════════════════════════════════════
    //                         MODIFIERS
    // ═══════════════════════════════════════════════════════════════
    
    modifier onlyGuardian() {
        if (!emergencyGuardians[msg.sender] && msg.sender != owner() && msg.sender != secondaryGuardian) {
            revert NotAuthorized();
        }
        _;
    }
    
    modifier onlyOwnerOrSecondary() {
        if (msg.sender != owner() && msg.sender != secondaryGuardian) {
            revert NotAuthorized();
        }
        _;
    }
    
    modifier vaultLinked() {
        if (address(vault) == address(0)) revert VaultNotLinked();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════
    //                        CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * @notice Deploy Guardian with primary and secondary owner
     * @param _secondaryGuardian Backup guardian address (hardware wallet recommended)
     */
    constructor(address _secondaryGuardian) Ownable(msg.sender) {
        if (_secondaryGuardian == address(0)) revert InvalidAddress();
        secondaryGuardian = _secondaryGuardian;
        
        // Owner and secondary are emergency guardians by default
        emergencyGuardians[msg.sender] = true;
        emergencyGuardians[_secondaryGuardian] = true;
        guardianCount = 2;
        
        emit SecondaryGuardianChanged(address(0), _secondaryGuardian);
    }
    
    // ═══════════════════════════════════════════════════════════════
    //                      LINK VAULT
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * @notice Link this guardian to a ReversoVault
     * @dev Call this AFTER transferring ReversoVault ownership to this contract
     * @param _vault Address of the ReversoVault
     */
    function linkVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert InvalidAddress();
        vault = IReversoVault(_vault);
        emit VaultLinked(_vault);
    }
    
    // ═══════════════════════════════════════════════════════════════
    //                    EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * @notice 🚨 EMERGENCY PAUSE - Any guardian can trigger immediately
     * @dev No timelock, instant pause to protect funds
     * @param reason Description of why emergency was triggered
     */
    function emergencyPause(string calldata reason) external onlyGuardian vaultLinked {
        vault.pause();
        emergencyMode = true;
        emit EmergencyPauseTriggered(msg.sender, reason);
        emit EmergencyModeChanged(true);
    }
    
    /**
     * @notice Check if vault is currently paused
     */
    function isVaultPaused() external view vaultLinked returns (bool) {
        return vault.paused();
    }
    
    // ═══════════════════════════════════════════════════════════════
    //                    TIMELOCK FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * @notice Propose an action (starts timelock)
     * @dev Only owner or secondary can propose
     */
    function proposeAction(
        ActionType _actionType,
        address _target
    ) external onlyOwnerOrSecondary vaultLinked returns (uint256 actionId) {
        actionId = ++actionCount;
        
        timelockActions[actionId] = TimelockAction({
            actionType: _actionType,
            target: _target,
            value: 0,
            executeAfter: block.timestamp + TIMELOCK_DURATION,
            executed: false,
            cancelled: false,
            proposedBy: msg.sender,
            confirmedBy: address(0)
        });
        
        emit ActionProposed(actionId, _actionType, _target, block.timestamp + TIMELOCK_DURATION);
    }
    
    /**
     * @notice Confirm an action (needs second signature)
     * @dev The OTHER guardian must confirm (not the proposer)
     */
    function confirmAction(uint256 _actionId) external onlyOwnerOrSecondary {
        TimelockAction storage action = timelockActions[_actionId];
        
        if (action.executeAfter == 0) revert ActionNotFound();
        if (action.executed) revert ActionAlreadyExecuted();
        if (action.cancelled) revert ActionIsCancelled();
        if (action.confirmedBy != address(0)) revert AlreadyConfirmed();
        if (action.proposedBy == msg.sender) revert NeedsSecondConfirmation(); // Must be different person
        
        action.confirmedBy = msg.sender;
        emit ActionConfirmed(_actionId, msg.sender);
    }
    
    /**
     * @notice Execute a confirmed action after timelock
     */
    function executeAction(uint256 _actionId) external onlyOwnerOrSecondary vaultLinked nonReentrant {
        TimelockAction storage action = timelockActions[_actionId];
        
        if (action.executeAfter == 0) revert ActionNotFound();
        if (action.executed) revert ActionAlreadyExecuted();
        if (action.cancelled) revert ActionIsCancelled();
        if (block.timestamp < action.executeAfter) revert TimelockNotExpired();
        if (action.confirmedBy == address(0)) revert NeedsSecondConfirmation();
        
        action.executed = true;
        
        // Execute the action
        if (action.actionType == ActionType.CHANGE_TREASURY) {
            vault.setTreasury(action.target);
        } else if (action.actionType == ActionType.UNPAUSE) {
            vault.unpause();
            emergencyMode = false;
            emit EmergencyModeChanged(false);
        } else if (action.actionType == ActionType.ADD_VAULT_GUARDIAN) {
            vault.setGuardian(action.target, true);
        } else if (action.actionType == ActionType.REMOVE_VAULT_GUARDIAN) {
            vault.setGuardian(action.target, false);
        } else if (action.actionType == ActionType.TRANSFER_VAULT_OWNERSHIP) {
            vault.transferOwnership(action.target);
        } else if (action.actionType == ActionType.CHANGE_SECONDARY_GUARDIAN) {
            address oldSecondary = secondaryGuardian;
            emergencyGuardians[oldSecondary] = false;
            secondaryGuardian = action.target;
            emergencyGuardians[action.target] = true;
            emit SecondaryGuardianChanged(oldSecondary, action.target);
        }
        
        emit ActionExecuted(_actionId, action.actionType);
    }
    
    /**
     * @notice Cancel a pending action
     * @dev Either proposer or confirmer can cancel
     */
    function cancelAction(uint256 _actionId) external onlyOwnerOrSecondary {
        TimelockAction storage action = timelockActions[_actionId];
        
        if (action.executeAfter == 0) revert ActionNotFound();
        if (action.executed) revert ActionAlreadyExecuted();
        if (action.cancelled) revert ActionIsCancelled();
        
        action.cancelled = true;
        emit ActionWasCancelled(_actionId, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════
    //                  EMERGENCY GUARDIAN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * @notice Add an emergency guardian (can only pause, not execute)
     * @dev These can trigger emergency pause but cannot execute timelock actions
     */
    function addEmergencyGuardian(address _guardian) external onlyOwner {
        if (_guardian == address(0)) revert InvalidAddress();
        if (!emergencyGuardians[_guardian]) {
            emergencyGuardians[_guardian] = true;
            guardianCount++;
            emit EmergencyGuardianUpdated(_guardian, true);
        }
    }
    
    /**
     * @notice Remove an emergency guardian
     */
    function removeEmergencyGuardian(address _guardian) external onlyOwner {
        if (_guardian == owner() || _guardian == secondaryGuardian) {
            revert CannotRemoveLastGuardian();
        }
        if (emergencyGuardians[_guardian]) {
            emergencyGuardians[_guardian] = false;
            guardianCount--;
            emit EmergencyGuardianUpdated(_guardian, false);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    //                      VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * @notice Get action details
     */
    function getAction(uint256 _actionId) external view returns (
        ActionType actionType,
        address target,
        uint256 executeAfter,
        bool executed,
        bool cancelled,
        address proposedBy,
        address confirmedBy,
        bool canExecute
    ) {
        TimelockAction memory action = timelockActions[_actionId];
        return (
            action.actionType,
            action.target,
            action.executeAfter,
            action.executed,
            action.cancelled,
            action.proposedBy,
            action.confirmedBy,
            !action.executed && 
            !action.cancelled && 
            action.confirmedBy != address(0) && 
            block.timestamp >= action.executeAfter
        );
    }
    
    /**
     * @notice Get time remaining on timelock
     */
    function getTimelockRemaining(uint256 _actionId) external view returns (uint256) {
        TimelockAction memory action = timelockActions[_actionId];
        if (block.timestamp >= action.executeAfter) return 0;
        return action.executeAfter - block.timestamp;
    }
    
    /**
     * @notice Check current vault status
     */
    function getVaultStatus() external view vaultLinked returns (
        address vaultAddress,
        address vaultOwner,
        address vaultTreasury,
        bool isPaused,
        bool isEmergencyMode
    ) {
        return (
            address(vault),
            vault.owner(),
            vault.treasury(),
            vault.paused(),
            emergencyMode
        );
    }
    
    /**
     * @notice Check if address is any type of guardian
     */
    function isGuardian(address _addr) external view returns (bool isEmergency, bool isOwnerOrSecondary) {
        return (
            emergencyGuardians[_addr],
            _addr == owner() || _addr == secondaryGuardian
        );
    }
}
