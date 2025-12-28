// Sources flattened with hardhat v2.28.0 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC165.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

pragma solidity >=0.4.16;


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

pragma solidity >=0.4.16;


// File @openzeppelin/contracts/interfaces/IERC1363.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

pragma solidity >=0.6.2;


/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}


// File @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.20;


/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}


// File @openzeppelin/contracts/utils/Pausable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/ReversoVault.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;
/**
 * @title ReversoVault
 * @author REVERSO Protocol
 * @notice The first reversible transaction protocol on blockchain
 * @dev Enables time-locked transfers that can be cancelled before expiry
 * 
 * ÔûêÔûêÔûêÔûêÔûêÔûêÔòù ÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔòùÔûêÔûêÔòù   ÔûêÔûêÔòùÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔòùÔûêÔûêÔûêÔûêÔûêÔûêÔòù ÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔòù ÔûêÔûêÔûêÔûêÔûêÔûêÔòù 
 * ÔûêÔûêÔòöÔòÉÔòÉÔûêÔûêÔòùÔûêÔûêÔòöÔòÉÔòÉÔòÉÔòÉÔòØÔûêÔûêÔòæ   ÔûêÔûêÔòæÔûêÔûêÔòöÔòÉÔòÉÔòÉÔòÉÔòØÔûêÔûêÔòöÔòÉÔòÉÔûêÔûêÔòùÔûêÔûêÔòöÔòÉÔòÉÔòÉÔòÉÔòØÔûêÔûêÔòöÔòÉÔòÉÔòÉÔûêÔûêÔòù
 * ÔûêÔûêÔûêÔûêÔûêÔûêÔòöÔòØÔûêÔûêÔûêÔûêÔûêÔòù  ÔûêÔûêÔòæ   ÔûêÔûêÔòæÔûêÔûêÔûêÔûêÔûêÔòù  ÔûêÔûêÔûêÔûêÔûêÔûêÔòöÔòØÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔòùÔûêÔûêÔòæ   ÔûêÔûêÔòæ
 * ÔûêÔûêÔòöÔòÉÔòÉÔûêÔûêÔòùÔûêÔûêÔòöÔòÉÔòÉÔòØ  ÔòÜÔûêÔûêÔòù ÔûêÔûêÔòöÔòØÔûêÔûêÔòöÔòÉÔòÉÔòØ  ÔûêÔûêÔòöÔòÉÔòÉÔûêÔûêÔòùÔòÜÔòÉÔòÉÔòÉÔòÉÔûêÔûêÔòæÔûêÔûêÔòæ   ÔûêÔûêÔòæ
 * ÔûêÔûêÔòæ  ÔûêÔûêÔòæÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔòù ÔòÜÔûêÔûêÔûêÔûêÔòöÔòØ ÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔòùÔûêÔûêÔòæ  ÔûêÔûêÔòæÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔòæÔòÜÔûêÔûêÔûêÔûêÔûêÔûêÔòöÔòØ
 * ÔòÜÔòÉÔòØ  ÔòÜÔòÉÔòØÔòÜÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòØ  ÔòÜÔòÉÔòÉÔòÉÔòØ  ÔòÜÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòØÔòÜÔòÉÔòØ  ÔòÜÔòÉÔòØÔòÜÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòØ ÔòÜÔòÉÔòÉÔòÉÔòÉÔòÉÔòØ 
 *
 * "Never lose crypto to mistakes again."
 */
contract ReversoVault is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                           STRUCTS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    
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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                         STATE VARIABLES
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

    /// @notice Counter for transfer IDs
    uint256 public transferCount;

    /// @notice Fee tiers in basis points
    /// @dev Retail < 1K = 0.3%, Standard 1K-100K = 0.5%, Whale > 100K = 0.7%
    uint256 public constant FEE_RETAIL = 30;      // 0.3%
    uint256 public constant FEE_STANDARD = 50;    // 0.5%
    uint256 public constant FEE_WHALE = 70;       // 0.7%
    
    /// @notice Tier thresholds (in USD value, using ETH as proxy)
    /// @dev $1K Ôëê 0.4 ETH, $100K Ôëê 40 ETH (at ~$2500/ETH)
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

    /// @notice Circuit breaker: max withdrawals per hour before auto-pause
    uint256 public maxWithdrawalsPerHour = 100;

    /// @notice Circuit breaker: max value per hour before auto-pause
    uint256 public maxValuePerHour = 1000 ether;

    /// @notice Withdrawal tracking for circuit breaker
    uint256 public withdrawalsThisHour;
    uint256 public valueWithdrawnThisHour;
    uint256 public currentHourStart;

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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                            EVENTS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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
    event AbandonedFundsRescued(uint256 indexed transferId, address token, uint256 amount);
    event ManualRefundIssued(uint256 indexed transferId, address indexed to, uint256 amount, string reason);
    event InsurancePurchased(uint256 indexed transferId, uint256 premiumPaid);
    event InsuranceClaimPaid(uint256 indexed transferId, address indexed to, uint256 amount, string reason);

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                            ERRORS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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
    error InsufficientFee();

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                          CONSTRUCTOR
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

    constructor(address _treasury) Ownable(msg.sender) {
        if (_treasury == address(0)) revert InvalidRecipient();
        treasury = _treasury;
    }

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                       FEE CALCULATION
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                       CORE FUNCTIONS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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
        Transfer storage transfer = transfers[_transferId];
        
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.recipient != msg.sender) revert NotRecipient();
        if (transfer.status != TransferStatus.Pending) revert TransferNotPending();
        if (block.timestamp < transfer.unlockAt) revert TransferStillLocked();
        if (block.timestamp > transfer.expiresAt) revert TransferNotExpired();

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
     * @dev Tries: 1) recoveryAddress1 ÔåÆ 2) recoveryAddress2 ÔåÆ 3) original sender
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

        // TRIPLE FALLBACK: Try recovery1 ÔåÆ recovery2 ÔåÆ sender
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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                    CIRCUIT BREAKER & SECURITY
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

    /**
     * @notice Check and update circuit breaker
     * @dev Auto-pauses if too many withdrawals in one hour
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
        
        // Trigger circuit breaker if limits exceeded
        if (withdrawalsThisHour > maxWithdrawalsPerHour || 
            valueWithdrawnThisHour > maxValuePerHour) {
            _pause();
            emit CircuitBreakerTriggered(withdrawalsThisHour, valueWithdrawnThisHour);
        }
    }

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                      GUARDIAN FUNCTIONS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                       VIEW FUNCTIONS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                       ADMIN FUNCTIONS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                    INSURANCE CLAIMS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                    ABANDONED FUNDS RESCUE
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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

    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    //                       RECEIVE FUNCTION
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

    receive() external payable {
        revert("Use sendETH function");
    }
}
