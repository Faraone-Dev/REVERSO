# 🔄 REVERSO Protocol

<div align="center">

![REVERSO](https://img.shields.io/badge/REVERSO-Protocol-blue?style=for-the-badge)
![Mainnet](https://img.shields.io/badge/7_Chains-LIVE-brightgreen?style=for-the-badge&logo=ethereum)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Verified](https://img.shields.io/badge/Etherscan-Verified-blue?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-109%20passing-brightgreen?style=for-the-badge)
![Fuzz](https://img.shields.io/badge/Fuzz-13%2C000%2B%20runs-orange?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-3%20Contract%20Stack-red?style=for-the-badge)

**Reversible Transaction Protocol for EVM Chains**

*Time-locked transfers with cancel, recovery, and insurance — deployed on 7 chains.*

### 🌐 [Live Demo](https://reverso.one/) • 📄 [Documentation](#-quick-start) • 🔌 [API](#-enterprise-api) • 🛡️ [Security](#-security-architecture)

</div>

---

## 📊 Project Status

| Component | Status | Details |
|-----------|--------|---------|
| 🔐 **ReversoVault** | ✅ **Deployed on Ethereum** | [Verified on Etherscan](https://etherscan.io/address/0x31ec8EeeCb341c7cefAefA6BC0Dd84BE9Bd11085#code) — 1,194 lines, 5-layer protection |
| 🛡️ **EmergencyGuardian** | ✅ **Deployed on Ethereum** | [Verified on Etherscan](https://etherscan.io/address/0x7F1CB513B7A582A11f3057F104D561E9A9126A7d#code) — Multi-sig + 24h timelock |
| 👁️ **ReversoMonitor** | ✅ **Deployed on Ethereum** | [Verified on Etherscan](https://etherscan.io/address/0x152935935E86ab06ce75b6871c500f6Eb57f5332#code) — Anomaly detection + auto-pause |
| 🧪 **Test Suite** | ✅ 109 tests passing | Unit tests + integration tests + security tests + gas benchmarks |
| 🔌 **Enterprise API** | ✅ [Live](https://reverso-tu3o.onrender.com) | HMAC auth, rate limiting, fraud prevention |
| 🌐 **Website** | ✅ [Live — reverso.one](https://reverso.one/) | Interactive demo with wallet connection |
| ⛓️ **Multi-chain** | ✅ **7 Chains Live** | Ethereum, BSC, Base, Arbitrum, Polygon, Optimism, Avalanche |
| 🔀 **Fuzz Testing** | ✅ 13,000+ runs | 13 property tests × 1,000 random inputs (Foundry) |

> **All 3 contracts deployed and wired on 7 chains: Ethereum, BSC, Base, Arbitrum, Polygon, Optimism, Avalanche.**

---

## 🎯 The Problem

Blockchain transactions are irreversible by design. Phishing, wrong-address sends, lost access, and contract bugs cause significant losses every year. Once confirmed, there is no undo.

REVERSO adds a **time-locked reversibility layer** on top of standard EVM transfers — letting senders cancel, recover, or auto-refund before finalization.

---

## 💡 The Solution

REVERSO introduces **time-locked reversible transfers** with up to **5 layers of protection**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    🔄 REVERSO TRANSFER FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   SEND ──▶ LOCK PERIOD ──▶ CLAIM WINDOW ──▶ COMPLETE           │
│     │          │               │               │                │
│     │    [CANCEL OK]     [RECIPIENT           │                │
│     │                     CLAIMS]              │                │
│     │                          │               │                │
│     └──────────────────────────┴───────────────┘                │
│                                                                 │
│   🛡️ 5 LAYERS OF PROTECTION:                                   │
│   ├── Layer 1: Cancel during lock period                       │
│   ├── Layer 2: Recovery Address 1 (hardware wallet)            │
│   ├── Layer 3: Recovery Address 2 (exchange backup)            │
│   ├── Layer 4: Auto-refund after expiry                        │
│   └── Layer 5: Rescue abandoned funds (90 days)                │
│                                                                 │
│   🏆 PREMIUM INSURANCE (+0.2%):                                 │
│   └── Full refund even if scammer claims your funds!           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🔒 Core Features

| Feature | Description |
|---------|-------------|
| **Reversible Transfers** | Cancel any transfer during lock period |
| **Time-Lock Options** | 1 hour to 30 days - you choose |
| **Triple Recovery** | 2 backup addresses + original sender |
| **Auto-Refund** | Unclaimed transfers return automatically |
| **Multi-Token** | ETH + any ERC-20 token |
| **Multi-Chain** | ETH, BSC, Base, Arbitrum, Polygon, Optimism, Avalanche — all live |

### 💰 Progressive Fee Structure

| Tier | Amount | Fee | Example |
|------|--------|-----|---------|
| 🏠 **Retail** | < $1,000 | 0.3% | $100 → $0.30 fee |
| 💼 **Standard** | $1K - $100K | 0.5% | $10,000 → $50 fee |
| 🐋 **Whale** | > $100,000 | 0.7% | $1M → $7,000 fee |

### 🛡️ Premium Insurance (+0.2%)

```
Pay 0.2% extra → Insurance coverage (subject to pool balance)

Even if scammer claims your funds:
├── You contact us with proof
├── We verify the scam
└── You get refunded from Insurance Pool 💰

Example: 10 ETH with insurance
├── Base fee: 0.05 ETH (0.5%)
├── Insurance: 0.02 ETH (0.2%)
├── Total cost: 0.07 ETH (0.7%)
└── Protection: coverage subject to policy/pool ✓
```

### 🏢 Enterprise Payroll & Stipends (API)

- Pay salaries, stipends and reimbursements with a lock window — cancel before the recipient claims if something goes wrong.
- HMAC/nonce/timestamp API auth: keys stay server-side, no bearer tokens in frontend.
- Recovery addresses and auto-refund: if the recipient doesn't claim, funds return automatically.
- Optional insurance (+0.2%) to cover fraud or erroneous claims.
- Rate limiting and audit-first rollout: mainnet gated until external audit is completed.

---

## 🌐 Supported Chains

| Chain | Status | Chain ID |
|-------|--------|----------|
| Ethereum | ✅ **Deployed & Verified** | 1 |
| BSC | ✅ **Deployed** | 56 |
| Base | ✅ **Deployed** | 8453 |
| Arbitrum | ✅ **Deployed** | 42161 |
| Polygon | ✅ **Deployed** | 137 |
| Optimism | ✅ **Deployed** | 10 |
| Avalanche | ✅ **Deployed** | 43114 |

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Faraone-Dev/REVERSO.git
cd REVERSO

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat run scripts/test-functions.ts --network hardhat

# Deploy locally
npx hardhat run scripts/deploy.ts --network hardhat

# Deploy to testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Deploy multichain (uses hardhat config)
npx hardhat run scripts/deploy-multichain.ts
```

---

## 🚀 Ethereum Mainnet — Live Deployment

> **Full protocol stack deployed and verified on Ethereum Mainnet.** All contracts are source-code verified on Etherscan, ownership has been transferred to the EmergencyGuardian multi-sig, and the monitoring layer is active.

### 📍 Production Contracts

| Contract | Address | Etherscan | Role |
|----------|---------|-----------|------|
| 🔐 **ReversoVault** | `0x31ec8EeeCb341c7cefAefA6BC0Dd84BE9Bd11085` | [✅ Verified Source](https://etherscan.io/address/0x31ec8EeeCb341c7cefAefA6BC0Dd84BE9Bd11085#code) | Core vault — reversible transfers, fees, insurance |
| 🛡️ **EmergencyGuardian** | `0x7F1CB513B7A582A11f3057F104D561E9A9126A7d` | [✅ Verified Source](https://etherscan.io/address/0x7F1CB513B7A582A11f3057F104D561E9A9126A7d#code) | Multi-sig owner of Vault — timelock + emergency pause |
| 👁️ **ReversoMonitor** | `0x152935935E86ab06ce75b6871c500f6Eb57f5332` | [✅ Verified Source](https://etherscan.io/address/0x152935935E86ab06ce75b6871c500f6Eb57f5332#code) | Anomaly detection — auto-pause on critical alerts |
| 💰 **Treasury** | `0x211a8C2d4f5924d4378162b48bC759a3E3e57dD8` | [View](https://etherscan.io/address/0x211a8C2d4f5924d4378162b48bC759a3E3e57dD8) | Receives protocol fees |

---

## 🌐 Multi-Chain Deployments

> **Deployed February 24, 2026.** Same 3-contract stack on every chain.

### BSC (BNB Smart Chain)

| Contract | Address |
|----------|---------|
| 🔐 **ReversoVault** | `0x6Ec438bEfE7f956d115c4Aa2B9eB80996df4d322` |
| 🛡️ **EmergencyGuardian** | `0x7C962938cce85737eB25147667279117f40dE23a` |
| 👁️ **ReversoMonitor** | `0x1610DA56f09555a388AB8a095F180A2069FDA4F1` |

### Base

| Contract | Address |
|----------|---------|
| 🔐 **ReversoVault** | `0x1610DA56f09555a388AB8a095F180A2069FDA4F1` |
| 🛡️ **EmergencyGuardian** | `0x038516Fd2EbF5AC7c6E4A85858CDaF908F4650C9` |
| 👁️ **ReversoMonitor** | `0xA8854b60A3c150BA0b4FB7418eD7b15d577a129b` |

### Arbitrum

| Contract | Address |
|----------|---------|
| 🔐 **ReversoVault** | `0x6Ec438bEfE7f956d115c4Aa2B9eB80996df4d322` |
| 🛡️ **EmergencyGuardian** | `0x7C962938cce85737eB25147667279117f40dE23a` |
| 👁️ **ReversoMonitor** | `0x1610DA56f09555a388AB8a095F180A2069FDA4F1` |

### Polygon

| Contract | Address |
|----------|---------|
| 🔐 **ReversoVault** | `0x6Ec438bEfE7f956d115c4Aa2B9eB80996df4d322` |
| 🛡️ **EmergencyGuardian** | `0x7C962938cce85737eB25147667279117f40dE23a` |
| 👁️ **ReversoMonitor** | `0x1610DA56f09555a388AB8a095F180A2069FDA4F1` |

### Optimism

| Contract | Address |
|----------|---------|
| 🔐 **ReversoVault** | `0x6Ec438bEfE7f956d115c4Aa2B9eB80996df4d322` |
| 🛡️ **EmergencyGuardian** | `0x7C962938cce85737eB25147667279117f40dE23a` |
| 👁️ **ReversoMonitor** | `0x1610DA56f09555a388AB8a095F180A2069FDA4F1` |

### Avalanche (C-Chain)

| Contract | Address |
|----------|---------|
| 🔐 **ReversoVault** | `0x6Ec438bEfE7f956d115c4Aa2B9eB80996df4d322` |
| 🛡️ **EmergencyGuardian** | `0x7C962938cce85737eB25147667279117f40dE23a` |
| 👁️ **ReversoMonitor** | `0x1610DA56f09555a388AB8a095F180A2069FDA4F1` |

### 🔗 Contract Wiring (On-Chain)

```
ReversoVault.owner()     → EmergencyGuardian  ✅
EmergencyGuardian.vault  → ReversoVault        ✅
ReversoMonitor.guardian  → EmergencyGuardian  ✅
```

**Deploy Block:** [24520800](https://etherscan.io/block/24520800) · **Compiler:** Solidity 0.8.20 · **Optimizer:** 200 runs

---

## 🌐 Testnet Deployment & Live Tests (Sepolia)

### 📍 Deployed Contracts

| Contract | Address | Network | Status |
|----------|---------|---------|--------|
| **ReversoVault v1** | `0x2F5c8E09FBf360777153dd6F7F636077890e61DF` | Sepolia | ✅ [Verified](https://sepolia.etherscan.io/address/0x2F5c8E09FBf360777153dd6F7F636077890e61DF#code) |
| **ReversoVault v2** | `0x3D1f9d1cEaf350885A91f7Fb05c99a78Bc544ED8` | Sepolia | ✅ Deployed |
| **TestToken (TTK)** | `0x72E847D973f9b215C7F561CD059CBd7a1601Fe3C` | Sepolia | ✅ [Verified](https://sepolia.etherscan.io/address/0x72E847D973f9b215C7F561CD059CBd7a1601Fe3C#code) |
| **Treasury** | `0x6a5729177bF2AE13351F43af0999767B59d9b059` | Sepolia | ✅ Receives fees |

**Deploy Date:** December 29, 2025

### ✅ Live Testnet Tests Passed

#### Test 1: sendETH() - Reversible Transfer Creation
| | |
|--|--|
| **TX Hash** | [`0x3176b0d6...`](https://sepolia.etherscan.io/tx/0x3176b0d65b3d4b5d4fc6f23f9fad6b76ffdf58ae5b42ee0558b4b79dda0cbc84) |
| **Amount Sent** | 0.001 ETH |
| **Amount After Fee** | 0.000997 ETH (0.3% fee) |
| **Recipient** | `0x...dEaD` (burn address for test) |
| **Delay** | 1 hour |
| **Memo** | "Test REVERSO" |
| **Gas Used** | 383,452 |
| **Status** | ✅ **SUCCESS** - Transfer created with status `Pending` |

#### Test 2: cancel() - Reversal & Refund
| | |
|--|--|
| **TX Hash** | [`0x3c4fcf76...`](https://sepolia.etherscan.io/tx/0x3c4fcf76e41c93a56980fdbcbc2f3975d23012291a2838a8fb2a53c5410e692e) |
| **Transfer ID** | 1 |
| **Action** | Cancel pending transfer |
| **Gas Used** | 64,138 |
| **Result** | ✅ **SUCCESS** - Funds returned to sender, status changed to `Cancelled` |

#### Test 3: sendETH() - Additional Transfer Test
| | |
|--|--|
| **TX Hash** | [`0x325757b3...`](https://sepolia.etherscan.io/tx/0x325757b3f4d90f19eebf) |
| **Transfer ID** | 3 |
| **Gas Used** | 332,176 |
| **Status** | ✅ **SUCCESS** - Then cancelled to recover funds |

#### Test 4: sendETHPremium() - Transfer with Insurance (+0.2%)
| | |
|--|--|
| **TX Hash** | [`0x824265692f...`](https://sepolia.etherscan.io/tx/0x824265692f710929bc67) |
| **Transfer ID** | 4 |
| **Amount After Fees** | 0.000995 ETH (0.5% fee + 0.2% insurance) |
| **Has Insurance** | ✅ `true` |
| **Insurance Pool** | Increased by +0.000002 ETH |
| **Gas Used** | 358,128 |
| **Status** | ✅ **SUCCESS** - Premium transfer with insurance flag, then cancelled |

#### Test 5: cancel() - Multiple Cancel Tests
| | |
|--|--|
| **Tested** | Cancel on transfers #3 and #4 |
| **Gas Used** | ~64,000 |
| **Result** | ✅ **SUCCESS** - All cancelled transfers refunded correctly |

#### Test 6: sendToken() - ERC20 Reversible Transfer
| | |
|--|--|
| **Token** | TestToken (TTK) - [`0x72E847D9...`](https://sepolia.etherscan.io/address/0x72E847D973f9b215C7F561CD059CBd7a1601Fe3C#code) |
| **Vault** | [`0x3D1f9d1c...`](https://sepolia.etherscan.io/address/0x3D1f9d1cEaf350885A91f7Fb05c99a78Bc544ED8) |
| **Approve TX** | `0xac3168a9...` |
| **sendToken TX** | `0x3ecacf50...` |
| **Amount** | 100 TTK |
| **Gas Used** | 433,095 |
| **Cancel TX** | `0x91d099ab...` (67,951 gas) |
| **Status** | ✅ **SUCCESS** - ERC20 transfer created, cancelled, tokens refunded |

### 📊 Test Summary

```
═══════════════════════════════════════════════════════════════
              🌐 SEPOLIA TESTNET - LIVE TESTS
═══════════════════════════════════════════════════════════════

✅ Test 1: sendETH()        → PASSED (383,452 gas)
   └── 0.001 ETH sent with 1h delay, 0.3% fee collected

✅ Test 2: cancel()         → PASSED (64,138 gas)  
   └── Funds returned to sender, status = Cancelled

✅ Test 3: sendETH()        → PASSED (332,176 gas)
   └── Additional transfer test, cancelled to recover

✅ Test 4: sendETHPremium() → PASSED (358,128 gas)
   └── Insurance flag set, pool increased +0.000002 ETH

✅ Test 5: cancel()         → PASSED (multiple)
   └── All pending transfers successfully cancelled

✅ Test 6: sendToken()      → PASSED (433,095 gas)
   └── ERC20 (TestToken) transfer + cancel working

✅ Test 7: claim()          → PASSED (190,303 gas)
   └── Recipient claimed after 1h unlock period!

═══════════════════════════════════════════════════════════════
                    7/7 TESTS PASSED ✅
═══════════════════════════════════════════════════════════════
```

#### Test 7: claim() - Recipient Claims After Unlock
| | |
|--|--|
| **TX Hash** | [`0x3e866e52...`](https://sepolia.etherscan.io/tx/0x3e866e52bfae77b3526a5e9f928b6f5b2946e45e9c6bbb8d90b9031f658bea63) |
| **Vault** | [`0x3D1f9d1c...`](https://sepolia.etherscan.io/address/0x3D1f9d1cEaf350885A91f7Fb05c99a78Bc544ED8) |
| **Transfer ID** | 2 |
| **Claimer** | `0xb9279e38f6eab17f986E7133C60a46DE527628e3` (receiver wallet) |
| **Amount Claimed** | 0.001994 ETH |
| **Wait Time** | 1 hour (unlock period) |
| **Gas Used** | 190,303 |
| **Status** | ✅ **SUCCESS** - Transfer status changed to `Claimed`, funds transferred to recipient |

### 🔜 Pending Tests (Time-Dependent)

| Test | Function | Description | Status |
|------|----------|-------------|--------|
| 8 | `refundExpired()` | Auto-refund after expiry | ⏳ Requires 7+ days |
| 9 | `recoverToBackup()` | Recovery address claim | ⏳ Requires expiry |
| 10 | `freezeTransfer()` | Guardian blocks suspicious transfer | ⏳ Requires Guardian setup |
| 11 | `rescueAbandoned()` | Rescue funds after 90+ days | ❌ Not feasible on testnet |

**Note:** Tests 8-11 are verified in local Hardhat tests (see section below). On testnet they require real wait times.

### 🔑 Test Wallets

| Wallet | Address | Purpose |
|--------|---------|---------|
| **Sender** | `0x6a5729177bF2AE13351F43af0999767B59d9b059` | Deploys contracts, sends transfers |
| **Receiver** | `0xb9279e38f6eab17f986E7133C60a46DE527628e3` | Claims transfers (for claim() test) |
| **Treasury** | `0x6a5729177bF2AE13351F43af0999767B59d9b059` | Receives protocol fees |

### ⚠️ Test Notes

- **claim()**: Cannot send to self (`_recipient != msg.sender` check). Using 2nd wallet as recipient.
- **Time-dependent tests**: Testnet doesn't allow time manipulation. Must wait real time.
- **rescueAbandoned()**: Requires 90+ days - verified in local Hardhat tests only.

---

## ✅ Test Results (Verified)
Local Hardhat suite (ETH + ERC20 + insurance + rescue):

```
═══════════════════════════════════════════════════════════════
                 🧪 REVERSO - TEST RESULTS
═══════════════════════════════════════════════════════════════

TEST 1: CREATE TRANSFER (sendETH)
💸 Sending: 1 ETH
👤 To: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
⏱️  Delay: 1 hour
✅ Transfer created!
📋 Transfer ID: 1
💰 Amount after fee: 0.995 ETH (0.5% fee applied)

═══════════════════════════════════════════════════════════════
TEST 2: CANCEL TRANSFER
💰 Sender balance before: 9998.99 ETH
✅ Transfer CANCELLED!
💰 Sender balance after: 9999.99 ETH
🔙 Refunded: ~0.995 ETH ✓

═══════════════════════════════════════════════════════════════
TEST 3: CLAIM TRANSFER
💰 Recipient balance before: 10000.0 ETH
✅ Transfer CLAIMED!
💰 Recipient balance after: 10000.497 ETH
📊 Status: Claimed ✓

═══════════════════════════════════════════════════════════════
TEST 4: FEE COLLECTION
📊 Total Transfers: 2
🏦 Treasury received fees ✓

TEST 5: ERC20 TRANSFER
🔁 sendToken with fee tier
🏦 Treasury gets token fee
📈 TVL tracks token amount after fee

TEST 6: INSURANCE CLAIM
🛡️ sendETHPremium → claim → payInsuranceClaim
🏦 Insurance pool debits payout
👤 Victim receives compensation

TEST 7: RESCUE (TVL)
🧹 rescueAbandoned reduces TVL after late recovery

═══════════════════════════════════════════════════════════════
                    ✅ ALL TESTS PASSED!
═══════════════════════════════════════════════════════════════
```

### Verified Functions

| Function | Status | Description |
|----------|--------|-------------|
| `sendETH()` | ✅ Passed | Create reversible transfer with delay |
| `sendETHSimple()` | ✅ Passed | Quick transfer with 24h default |
| `cancel()` | ✅ Passed | Cancel and receive full refund |
| `claim()` | ✅ Passed | Recipient claims after delay |
| `calculateFee()` | ✅ Passed | Progressive fee calculation |
| Fee Collection | ✅ Passed | Treasury receives fees automatically |

---

### Basic Usage

```solidity
// SIMPLE: Send with default 24h delay
reversoVault.sendETHSimple{value: 1 ether}(
    recipient,      // address to receive
    "Payment #123"  // optional memo
);

// ADVANCED: Custom delay, expiry, and DOUBLE recovery addresses
reversoVault.sendETH{value: 1 ether}(
    recipient,      // address to receive
    6 hours,        // delay before claim (min 1h, max 30d)
    30 days,        // expiry - time to claim (min 7d)
    ledgerAddr,     // recovery address 1 (your hardware wallet)
    coinbaseAddr,   // recovery address 2 (your exchange)
    "Payment #123"  // optional memo
);

// 🌟 PREMIUM: Full insurance coverage (recommended for large transfers)
reversoVault.sendETHPremium{value: 10 ether}(
    recipient,      // address to receive
    7 days,         // delay
    30 days,        // expiry
    ledgerAddr,     // recovery 1
    coinbaseAddr,   // recovery 2
    "Large payment" // memo
);
// Pays: 0.5% base + 0.2% insurance = 0.7% total
// Gets: Scam/theft coverage from insurance pool

// Cancel before delay expires (FREE!)
reversoVault.cancel(transferId);

// Claim after delay (recipient calls)
reversoVault.claim(transferId);

// Refund expired transfer (anyone can call after expiry)
reversoVault.refundExpired(transferId);

// Rescue abandoned funds (anyone can call after 90 days post-expiry)
reversoVault.rescueAbandoned(transferId);
```

### Delay Options

| Delay | Best For |
|-------|----------|
| **1 hour** | Urgent but want minimal protection |
| **6 hours** | Daily transactions |
| **24 hours** | Standard protection (DEFAULT) |
| **7 days** | Large amounts |
| **30 days** | Escrow, major purchases |

---

## 🔌 Enterprise API

REST API for programmatic access to reversible transfers.

### Base URL

```
Production: https://reverso-tu3o.onrender.com/api/v1
Development: http://localhost:3000/api/v1
```

### Authentication

```bash
curl -H "Authorization: Bearer rsk_business_xxx..." \
  https://reverso-tu3o.onrender.com/api/v1/transfers
```

### Quick Example

```javascript
// 1. Register for API key
const register = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'dev@company.com',
    password: 'secure123',
    company: 'Acme Inc',
    plan: 'business'
  })
});
const { apiKey } = await register.json();
// ⚠️ Save apiKey.key - shown only once!

// 2. Create reversible transfer
const transfer = await fetch('/api/v1/transfers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey.key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    chainId: 1,           // Ethereum
    to: '0x...',          // Recipient
    amount: '1000000000000000000', // 1 ETH in wei
    withInsurance: true   // +0.2% for full protection
  })
});

const { transaction } = await transfer.json();
// Sign `transaction` with ethers.js and broadcast!
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account & get API key |
| `POST` | `/auth/login` | Login existing user |
| `GET` | `/auth/plans` | List subscription plans |
| `POST` | `/transfers` | Create reversible transfer |
| `GET` | `/transfers/:id` | Get transfer status |
| `GET` | `/transfers` | List all transfers |
| `POST` | `/transfers/:id/cancel` | Generate cancel transaction |
| `POST` | `/transfers/:id/confirm` | Confirm after blockchain tx |
| `GET` | `/webhooks` | List webhooks (Business+) |
| `POST` | `/webhooks` | Create webhook (Business+) |
| `GET` | `/admin/usage` | View API usage (Business+) |
| `GET` | `/admin/stats` | Analytics (Enterprise) |
| `PUT` | `/admin/branding` | White-label config (Enterprise) |
| `GET` | `/admin/sla` | SLA status (Enterprise) |

### Webhooks

Receive real-time notifications for transfer events:

```json
{
  "type": "transfer.claimed",
  "data": {
    "id": "uuid",
    "txHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "amount": "1000000000000000000",
    "status": "claimed"
  },
  "createdAt": "2025-12-26T12:00:00Z"
}
```

**Available Events:**
- `transfer.created` - New transfer created
- `transfer.claimed` - Recipient claimed funds
- `transfer.cancelled` - Sender cancelled transfer
- `transfer.refunded` - Expired transfer refunded

### Run API Locally

```bash
cd api
npm install
cp .env.example .env
npm run dev

# Server runs on http://localhost:3000
```


### API Security (HMAC)

All protected endpoints require these headers:
- `Authorization: Bearer <apiKey>`
- `x-reverso-timestamp`: Epoch milliseconds (±5 minutes tolerance)
- `x-reverso-nonce`: Unique UUID to prevent replay attacks
- `x-reverso-signature`: HMAC-SHA256 of `timestamp.nonce.METHOD.URL.sha256(body)` signed with `signingSecret`

**Rate Limiting:** 300 req/min per API key + transaction limit per plan.

### Multi-Chain Configuration

- Config source: [api/config/chains.json](api/config/chains.json) + `.env` variables for RPC and vault addresses
- After deployment, update `.env` with actual contract addresses

### Transaction Encoding

```solidity
// ETH transfers
sendETH(recipient, delay, expiryPeriod, recovery1, recovery2, memo)

// ERC20 transfers  
sendToken(token, recipient, amount, delay, expiryPeriod, recovery1, recovery2, memo)
```

**Note:** Memo max 256 characters; recovery addresses cannot be zero address.
```

---

## 🔐 Security

### Security Architecture (3-Contract System)

REVERSO uses a **3-layer security architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    🏗️ REVERSO SECURITY STACK                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   👁️ ReversoMonitor                     │   │
│   │  • Anomaly detection (volume spikes, suspicious tx)     │   │
│   │  • Auto-pause on CRITICAL alerts                        │   │
│   │  • Watchlist management                                 │   │
│   │  • Chainlink Automation compatible                      │   │
│   └─────────────────────┬───────────────────────────────────┘   │
│                         │ triggers                              │
│   ┌─────────────────────▼───────────────────────────────────┐   │
│   │                  🛡️ EmergencyGuardian                   │   │
│   │  • Multi-signature (2-of-2 for critical actions)       │   │
│   │  • 24-hour timelock on admin changes                    │   │
│   │  • Instant emergency pause                              │   │
│   │  • Recovery system with dual confirmation               │   │
│   └─────────────────────┬───────────────────────────────────┘   │
│                         │ owns                                  │
│   ┌─────────────────────▼───────────────────────────────────┐   │
│   │                   🔐 ReversoVault                        │   │
│   │  • Core reversible transfer logic                       │   │
│   │  • 5-layer user protection                              │   │
│   │  • Progressive fees + insurance                         │   │
│   │  • Circuit breaker                                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Contract Details

| Contract | Lines | Purpose |
|----------|-------|---------|
| **ReversoVault.sol** | 1,119 | Core vault - reversible transfers, fees, insurance |
| **EmergencyGuardian.sol** | 401 | Multi-sig owner, timelock, emergency controls |
| **ReversoMonitor.sol** | 320 | Real-time monitoring, anomaly detection, auto-pause |

### EmergencyGuardian Features

```solidity
// 🚨 INSTANT - Any guardian can pause immediately
guardian.emergencyPause("Suspicious activity detected");

// ⏱️ TIMELOCK - Critical actions need 24h + dual confirmation
guardian.proposeAction(ActionType.CHANGE_TREASURY, newTreasury);
// ... 24 hours later, DIFFERENT guardian confirms ...
guardian.confirmAction(actionId);
guardian.executeAction(actionId);

// 🔐 MULTI-SIG - Two keys required for sensitive operations
// Primary key: Hot wallet (daily operations)
// Secondary key: Hardware wallet (backup, confirms critical actions)
```

### ReversoMonitor Features

```solidity
// 📊 Automatic anomaly detection
monitor.recordTransaction(sender, amount);
// Triggers alerts on:
// - Single tx > 50 ETH (HIGH alert)
// - Hourly volume > 100 ETH (HIGH alert)  
// - Hourly volume > 200 ETH (CRITICAL → auto-pause)
// - Watchlisted address activity (MEDIUM alert)

// 🤖 Chainlink Automation compatible
(bool upkeepNeeded, bytes memory data) = monitor.checkUpkeep("");
```

### Smart Contract Security

- ✅ ReentrancyGuard on all external functions
- ✅ Pausable for emergency stops
- ✅ Circuit breaker (auto-pause on suspicious activity)
- ✅ Timelock on admin changes (24 hours via Guardian)
- ✅ Multi-signature for critical operations
- ✅ Guardian system for freezing suspicious transfers
- ✅ OpenZeppelin battle-tested contracts
- ✅ Anomaly detection with auto-pause

### Web & API Security

| Protection | Layer | Description |
|-----------|-------|-------------|
| **Content Security Policy** | Website | Strict CSP blocking unauthorized scripts, iframes, and connections |
| **X-Content-Type-Options** | Website | Prevents MIME-type sniffing attacks |
| **Referrer Policy** | Website | Controls information leakage to external sites |
| **Frame-ancestors: none** | Website | Anti-clickjacking — prevents iframe embedding |
| **Upgrade-insecure-requests** | Website | Forces HTTPS on all resources |
| **XSS Sanitizer** | Website | `escapeHtml()` on all user-interpolated data |
| **CORS Lockdown** | API | Restricted to `reverso.one` only (no wildcard) |
| **Helmet.js** | API | HSTS (1 year + preload), CSP, referrer policy |
| **HMAC-SHA256** | API | Request signature verification with timestamp + nonce |
| **Replay Protection** | API | Nonce-based deduplication prevents replay attacks |
| **Rate Limiting** | API | Global: 1000 req/15min — Per-key: 300 req/min |
| **Bcrypt (10 rounds)** | API | Industry-standard hashing for API key credentials |
| **JWT Auth** | API | 30-day token expiry with strong secret |
| **Error Masking** | API | 500 errors masked in production, no path leakage |
| **Input Validation** | API | Email regex, address regex, amount checks |

### 5-Layer User Protection System

```
Layer 1: CANCEL
├── Sender can cancel anytime during lock period
└── 100% refund, zero questions asked

Layer 2: RECOVERY ADDRESS 1
├── If sender loses access, funds go here
└── Recommended: Hardware wallet (Ledger, Trezor)

Layer 3: RECOVERY ADDRESS 2
├── If recovery 1 fails, try recovery 2
└── Recommended: Exchange account (Coinbase, Binance)

Layer 4: AUTO-REFUND
├── If recipient never claims, auto-refund after expiry
└── Anyone can trigger (gas incentive)

Layer 5: RESCUE
├── After 90 days post-expiry, rescue abandoned funds
└── Tries all 3 addresses, then treasury for manual handling
```

### Audit Status

🔒 **Security First Approach — Mainnet Live**

- Smart contract follows OpenZeppelin best practices
- ReentrancyGuard, Pausable, SafeERC20 implemented

**Current Status:**
- ✅ Ethereum Mainnet deployed (all 3 contracts verified on Etherscan)
- ✅ **7 chains live** — Ethereum, BSC, Base, Arbitrum, Polygon, Optimism, Avalanche
- ✅ Testnet validation completed (Sepolia — 7/7 live tests passed)
- ✅ **109 Hardhat tests** passing (unit + integration + security + gas benchmarks)
- ✅ **13,000+ Foundry fuzz runs** (13 property-based tests × 1,000 random inputs each)
- ✅ Slither static analysis (143 items reviewed, 0 true-positive criticals)
- ✅ Gas benchmarks — all operations within L2-friendly limits
- ✅ Website live at [reverso.one](https://reverso.one)
- ✅ Enterprise API live at [reverso-tu3o.onrender.com](https://reverso-tu3o.onrender.com)
- 🔜 External audit planned (not yet scheduled)

### Bug Bounty

If you find a security vulnerability, please report it responsibly via GitHub Issues or email. Severity-based rewards will be evaluated on a case-by-case basis.

### Insurance Policy

Transfers sent with `hasInsurance = true` are eligible for coverage from the insurance pool if funds are claimed by a confirmed scammer. Coverage is subject to pool balance and requires evidence submission within 30 days.

---

## 📁 Project Structure

```
REVERSO/
├── 📁 contracts/                    # Solidity smart contracts
│   ├── ReversoVault.sol             # Core vault (1,119 lines)
│   ├── EmergencyGuardian.sol        # Multi-sig guardian (401 lines)
│   ├── ReversoMonitor.sol           # Anomaly detection (320 lines)
│   └── interfaces/
│       └── IReversoVault.sol        # Contract interface
├── 📁 test/                         # Test suites
│   ├── ReversoVault.test.ts         # Vault tests
│   ├── SecurityContracts.test.ts    # Guardian + Monitor tests
│   └── GasBenchmarks.test.ts       # Gas benchmarks
├── 📁 api/                          # Enterprise REST API
│   ├── src/
│   │   ├── index.ts                 # Express server
│   │   ├── routes/                  # Transfer, auth, webhooks, admin
│   │   └── middleware/              # HMAC, rate limiting, API keys
│   ├── sdk/                         # JavaScript/TypeScript SDK
│   └── config/                      # Multi-chain configuration
├── 📁 website/                      # Production website (Vite)
│   ├── src/
│   │   ├── main.js                  # App logic
│   │   └── styles/                  # CSS
│   └── index.html                   # Entry point
├── 📁 scripts/                      # Deploy scripts
│   ├── deploy.ts                    # Single chain deploy
│   └── deploy-multichain.ts         # Multi-chain deploy
├── 📄 hardhat.config.ts             # Multi-chain configuration
└── 📄 README.md                     # This file
```

---

## ️ Roadmap

### Phase 1: Foundation (Q4 2025) ✅
- [x] Core smart contracts
- [x] Progressive fee structure
- [x] Insurance system
- [x] Multi-chain configuration (15+ chains)
- [x] Enterprise API
- [x] Basic documentation

### Phase 2: Launch (Q1 2026)
- [x] Ethereum Mainnet deployment (3 contracts verified)
- [x] Testnet validation (Sepolia — 7/7 live tests passed)
- [x] Multi-chain deployments (BSC, Base, Arbitrum, Polygon, Optimism, Avalanche)
- [ ] External security audit
- [ ] SDK release (JavaScript/TypeScript)

---

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Clone repo
git clone https://github.com/Faraone-Dev/REVERSO.git
cd REVERSO

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your keys

# Compile
npx hardhat compile

# Test
npx hardhat test

# Coverage
npx hardhat coverage

# Deploy
npx hardhat run scripts/deploy.ts --network sepolia
```

### Environment Variables

```env
# Required
PRIVATE_KEY=your-deployer-private-key
ETHERSCAN_API_KEY=your-etherscan-key

# Optional (for multi-chain)
ARBISCAN_API_KEY=
BASESCAN_API_KEY=
OPTIMISM_API_KEY=
POLYGONSCAN_API_KEY=
```

---

## 📜 License

MIT License - see [LICENSE](LICENSE)

---

## 🔗 Links

| Resource | Link |
|----------|------|
| 🌐 **Website** | [reverso.one](https://reverso.one/) |
| 🔌 **API (Live)** | [reverso-tu3o.onrender.com](https://reverso-tu3o.onrender.com) |
| 📦 **Repository** | [github.com/Faraone-Dev/REVERSO](https://github.com/Faraone-Dev/REVERSO) |
| 📄 **Documentation** | [This README](#-quick-start) |
| 🔌 **API Docs** | [Enterprise API Section](#-enterprise-api) |

---

## 🚀 What's Included

```
REVERSO/
├── 📁 contracts/           # 3 Solidity smart contracts (1,840 lines total)
│   ├── ReversoVault.sol    # Core vault with 5-layer protection
│   ├── EmergencyGuardian   # Multi-sig + timelock + emergency pause
│   ├── ReversoMonitor      # Anomaly detection + auto-pause
│   └── interfaces/         # Contract interfaces
├── 📁 test/                # Hardhat test suite (109 tests)
├── 📁 security/            # Security suite (Foundry fuzz 13,000+ runs + Slither)
├── 📁 api/                 # Enterprise REST API
│   ├── src/routes/         # Transfer, auth, webhooks, admin
│   ├── src/middleware/     # HMAC, rate limiting, API keys
│   └── sdk/                # JavaScript/TypeScript SDK
├── 📁 website/             # Production website (Vite + vanilla JS)
├── 📁 scripts/             # Deploy scripts (single & multi-chain)
├── 📄 README.md            # This file
└── 📄 hardhat.config.ts    # Multi-chain configuration (15+ chains)
```

---

## 🔧 Deployment

### One-Command Full Stack Deploy

```bash
# Deploy all 3 contracts + wire them together automatically
npx hardhat run scripts/deploy-stack.ts --network ethereum
```

This script performs all 6 steps automatically:
1. Deploy **ReversoVault** (treasury address from `.env`)
2. Deploy **EmergencyGuardian** (secondary guardian from `.env`)
3. `vault.transferOwnership(guardian)` — guardian becomes vault owner
4. `guardian.linkVault(vault)` — guardian knows which vault to protect
5. Deploy **ReversoMonitor** (vault address as constructor arg)
6. `monitor.setGuardian(guardian)` — monitor can trigger guardian alerts

### Manual Step-by-Step

```bash
# 1. Deploy ReversoVault
npx hardhat run scripts/deploy.ts --network ethereum

# 2-6. The deploy-stack.ts script handles wiring automatically.
#      See scripts/deploy-stack.ts for the full deployment flow.
```

---

<div align="center">

### 🛡️ Deployed on Ethereum Mainnet — All Contracts Verified on Etherscan

**[ReversoVault](https://etherscan.io/address/0x31ec8EeeCb341c7cefAefA6BC0Dd84BE9Bd11085#code)** · **[EmergencyGuardian](https://etherscan.io/address/0x7F1CB513B7A582A11f3057F104D561E9A9126A7d#code)** · **[ReversoMonitor](https://etherscan.io/address/0x152935935E86ab06ce75b6871c500f6Eb57f5332#code)**

109 tests passing · 3-contract security stack · Enterprise REST API

---

**Built with ❤️ for a safer crypto future**

*REVERSO Protocol — Because everyone deserves a second chance.*

**© 2024-2026 REVERSO Protocol**

</div>
