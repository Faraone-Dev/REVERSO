# Contributing to REVERSO Protocol

Thank you for your interest in contributing to REVERSO - the first reversible transaction protocol on blockchain! This document provides comprehensive guidelines for contributing to this critical infrastructure project.

## Table of Contents

- [Overview](#overview)
- [Security First](#security-first)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [How to Contribute](#how-to-contribute)
- [Smart Contract Development](#smart-contract-development)
- [Testing Standards](#testing-standards)
- [Security Reviews](#security-reviews)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Bug Bounty Program](#bug-bounty-program)
- [Community](#community)

## Overview

REVERSO is a **3-contract security stack** that enables reversible transactions on EVM chains:

- **ReversoVault**: Core vault with 5-layer protection (1,194 lines)
- **EmergencyGuardian**: Multi-sig + 24h timelock protection
- **ReversoMonitor**: Anomaly detection with auto-pause capability

Deployed on: Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche

### Why Your Contribution Matters

Every contribution to REVERSO helps protect user funds across 7 blockchains. This is **high-stakes infrastructure** - we prioritize security over speed.

## Security First

⚠️ **CRITICAL**: If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. **DO NOT** discuss in public channels
3. **Email security@reverso.one** with details
4. Wait for acknowledgment before disclosure

We operate a [bug bounty program](#bug-bounty-program) with competitive rewards.

### Security Checklist for Contributors

Before submitting any code:

- [ ] Have you run the full test suite (109+ tests)?
- [ ] Have you tested edge cases and failure modes?
- [ ] Have you considered reentrancy attacks?
- [ ] Have you checked for integer overflow/underflow?
- [ ] Have you verified access control mechanisms?
- [ ] Have you run Slither or Mythril static analysis?
- [ ] Have you checked gas optimization without compromising security?

## Getting Started

### Prerequisites

**Required:**
- Node.js 18+ and npm/yarn
- Hardhat or Foundry
- Git
- Solidity 0.8.20+ knowledge
- Understanding of EVM and smart contract security

**Recommended:**
- Experience with multi-chain deployments
- Knowledge of DeFi protocols
- Familiarity with OpenZeppelin contracts
- Understanding of timelock and multisig patterns

### Repository Structure

```
reverso/
├── contracts/
│   ├── ReversoVault.sol          # Core vault contract
│   ├── EmergencyGuardian.sol     # Emergency controls
│   ├── ReversoMonitor.sol        # Monitoring & auto-pause
│   └── interfaces/               # Contract interfaces
├── test/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── security/                 # Security-focused tests
│   └── gas/                      # Gas benchmark tests
├── scripts/
│   ├── deploy/                   # Deployment scripts
│   ├── verify/                   # Verification scripts
│   └── emergency/                # Emergency procedures
├── docs/
│   ├── architecture/             # Architecture docs
│   ├── api/                      # API documentation
│   └── security/                 # Security audits
└── hardhat.config.js             # Hardhat configuration
```

## Development Environment

### Installation

```bash
# Clone the repository
git clone https://github.com/Faraone-Dev/REVERSO.git
cd REVERSO

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Required for testing
PRIVATE_KEY=your_test_private_key
ALCHEMY_API_KEY=your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key

# Optional: Multi-chain testing
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY

# API Testing
API_BASE_URL=https://reverso-tu3o.onrender.com
API_KEY=your_test_api_key
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:security

# Run with gas reporting
npm run test:gas

# Run with coverage
npm run test:coverage

# Run fuzz tests (requires Foundry)
forge test --fuzz-runs 10000
```

### Local Deployment

```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy/local.js --network localhost

# Run integration tests against local node
npm run test:integration:local
```

## How to Contribute

### Types of Contributions

We welcome:

1. **Security improvements** - Highest priority
2. **Gas optimizations** - Must not compromise security
3. **New chain deployments** - Expand to additional EVM chains
4. **Test coverage** - Increase from current 109 tests
5. **Documentation** - Improve clarity and completeness
6. **Bug fixes** - Fix identified issues
7. **Feature enhancements** - New capabilities (discuss first)

### Contribution Workflow

1. **Check existing issues** - Look for `good first issue` or `help wanted`
2. **Discuss major changes** - Open an issue before significant work
3. **Fork and branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b security/vulnerability-fix
   ```
4. **Write tests first** - TDD approach for new features
5. **Implement changes** - Follow security best practices
6. **Run full test suite** - All 109+ tests must pass
7. **Update documentation** - Reflect changes in docs/
8. **Submit PR** - Use the PR template

## Smart Contract Development

### Security Patterns

We enforce these patterns:

#### 1. Reentrancy Protection

```solidity
// Always use checks-effects-interactions pattern
function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // Effects first
    balances[msg.sender] -= amount;
    
    // Interaction last
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

#### 2. Access Control

```solidity
// Use explicit role-based access
modifier onlyGuardian() {
    require(msg.sender == guardian, "Not guardian");
    _;
}

modifier onlyTimelock() {
    require(msg.sender == timelock, "Not timelock");
    _;
}
```

#### 3. Input Validation

```solidity
function setRecoveryWindow(uint256 _window) external onlyTimelock {
    require(_window >= MIN_WINDOW && _window <= MAX_WINDOW, "Invalid window");
    recoveryWindow = _window;
    emit RecoveryWindowUpdated(_window);
}
```

### Gas Optimization

While security is paramount, we also optimize gas:

```solidity
// Use immutable for compile-time constants
address public immutable vault;
uint256 public immutable deploymentTime;

// Pack variables to save storage slots
struct Transaction {
    address sender;      // 20 bytes
    uint96 amount;       // 12 bytes - packed with sender
    uint256 timestamp;   // 32 bytes - new slot
    bool reversible;     // 1 byte - could be packed
}
```

### Upgradeability

REVERSO contracts use **proxy patterns** for upgrades:

- Never modify storage layout in upgrades
- Use OpenZeppelin's upgrade-safe contracts
- Test upgrade paths thoroughly
- Emergency pause before upgrades

## Testing Standards

### Test Requirements

Every contribution must include:

1. **Unit tests** - Test individual functions
2. **Integration tests** - Test contract interactions
3. **Security tests** - Test attack vectors
4. **Gas benchmarks** - Measure and optimize gas usage

### Test Structure

```javascript
describe("ReversoVault", function() {
  describe("Deposits", function() {
    it("Should accept ETH deposits", async function() {
      // Test implementation
    });
    
    it("Should reject deposits below minimum", async function() {
      // Test edge case
    });
    
    it("Should prevent reentrancy attacks", async function() {
      // Security test
    });
  });
  
  describe("Reversals", function() {
    it("Should allow reversal within window", async function() {
      // Core functionality
    });
    
    it("Should reject reversal after window expires", async function() {
      // Edge case
    });
  });
});
```

### Fuzz Testing

Use Foundry for fuzz testing:

```solidity
function testFuzz_ReversalWindow(uint256 amount, uint256 delay) public {
    vm.assume(amount > 0 && amount < 1000 ether);
    vm.assume(delay > 0 && delay < 365 days);
    
    // Test with random inputs
    vault.deposit{value: amount}();
    
    vm.warp(block.timestamp + delay);
    
    if (delay <= recoveryWindow) {
        vault.reverseTransaction(0);
        // Should succeed
    } else {
        vm.expectRevert("Window expired");
        vault.reverseTransaction(0);
    }
}
```

## Security Reviews

### Automated Analysis

Run before submitting:

```bash
# Slither static analysis
slither contracts/ --config-file slither.config.json

# Mythril symbolic execution
myth analyze contracts/ReversoVault.sol

# Echidna property testing
 echidna-test contracts/ --contract ReversoVault

# Manticore (optional, for formal verification)
manticore contracts/ReversoVault.sol
```

### Manual Review Checklist

- [ ] Reentrancy guards on all external calls
- [ ] Integer overflow/underflow protection (Solidity 0.8+)
- [ ] Proper access control on all sensitive functions
- [ ] Event emissions for all state changes
- [ ] Input validation on all public/external functions
- [ ] Emergency pause functionality tested
- [ ] Timelock delays enforced
- [ ] No delegatecall to untrusted contracts
- [ ] No self-destruct unless explicitly designed

## Code Style

### Solidity Style Guide

Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.20/style-guide.html) with these additions:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ReversoVault
 * @notice Core vault contract for reversible transactions
 * @dev Implements 5-layer protection mechanism
 */
contract ReversoVault is ReentrancyGuard {
    // State variables
    uint256 public constant MIN_DEPOSIT = 0.01 ether;
    uint256 public constant MAX_RECOVERY_WINDOW = 7 days;
    
    // Events
    event Deposit(address indexed sender, uint256 amount, uint256 timestamp);
    event Reversal(address indexed sender, uint256 amount, uint256 timestamp);
    
    // Errors (Solidity 0.8.4+)
    error InsufficientBalance(uint256 requested, uint256 available);
    error RecoveryWindowExpired(uint256 transactionTime, uint256 currentTime);
    
    // Functions
    /**
     * @notice Deposit ETH into the vault
     * @dev Creates a reversible transaction record
     */
    function deposit() external payable nonReentrant {
        // Implementation
    }
}
```

### NatSpec Documentation

All public/external functions must have NatSpec:

```solidity
/**
 * @notice Brief description of what the function does
 * @dev Detailed explanation of implementation details
 * @param paramName Description of parameter
 * @return Description of return value
 * @custom:security Important security consideration
 * @custom:gas Gas optimization note
 */
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Commit Types

- `security`: Security-related changes (highest priority)
- `feat`: New features
- `fix`: Bug fixes
- `gas`: Gas optimizations
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `deploy`: Deployment-related changes

### Examples

```
security: add reentrancy guard to withdraw function

- Implements checks-effects-interactions pattern
- Adds nonReentrant modifier from OpenZeppelin
- Adds test for reentrancy attack prevention

fix: correct recovery window calculation

- Fixes off-by-one error in timestamp comparison
- Updates tests to verify boundary conditions
- Adds additional edge case tests

gas: optimize storage layout in Transaction struct

- Packs address and amount into single slot
- Reduces gas cost by ~2000 per transaction
- Maintains all existing functionality
```

## Pull Request Process

### PR Requirements

1. **All tests passing** (109+ tests)
2. **Coverage maintained** or improved
3. **Security review** completed for sensitive changes
4. **Documentation updated**
5. **Gas benchmarks** included for optimizations

### PR Template

```markdown
## Summary
Brief description of changes

## Type
- [ ] Security fix
- [ ] Bug fix
- [ ] New feature
- [ ] Gas optimization
- [ ] Documentation
- [ ] Tests

## Security Considerations
<!-- Required for any contract changes -->
- [ ] Reentrancy protection verified
- [ ] Access control checked
- [ ] Edge cases tested
- [ ] Static analysis passed

## Testing
- [ ] All existing tests pass
- [ ] New tests added
- [ ] Fuzz tests included (if applicable)
- [ ] Gas benchmarks provided

## Deployment Notes
<!-- For changes affecting deployed contracts -->
- [ ] Upgrade path tested
- [ ] Emergency procedures documented
- [ ] Multi-chain deployment plan included

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### Review Process

1. **Automated checks** run (tests, linting, coverage)
2. **Security review** for contract changes
3. **Code review** by maintainers
4. **Final approval** before merge

## Bug Bounty Program

We reward security researchers who help keep REVERSO safe:

### Scope

- Smart contracts (ReversoVault, EmergencyGuardian, ReversoMonitor)
- API endpoints
- Frontend components handling private keys

### Rewards

| Severity | Reward Range |
|----------|--------------|
| Critical | $10,000 - $50,000 |
| High | $5,000 - $10,000 |
| Medium | $1,000 - $5,000 |
| Low | $100 - $1,000 |

### Rules

- Report to security@reverso.first
- Wait for fix before disclosure
- No social engineering or physical attacks
- No attacks on users or infrastructure
- No duplicate reports

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Security Email**: security@reverso.one (security only)
- **Discord**: [Join our community](https://discord.gg/reverso) (if available)

### Getting Help

1. Check [Documentation](https://reverso.one/docs)
2. Search existing issues
3. Ask in GitHub Discussions
4. For security issues, email security@reverso.one

### Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Invited to core team after sustained contributions
- Eligible for bug bounty rewards

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make blockchain transactions safer! 🔒

For questions not covered here, please open an issue or reach out to the team.
