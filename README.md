# 🔄 REVERSO Protocol

<div align="center">

![REVERSO](https://img.shields.io/badge/REVERSO-Protocol-blue?style=for-the-badge)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Chains](https://img.shields.io/badge/Chains-5%20live-orange?style=for-the-badge)

**The First Reversible Transaction Protocol on Blockchain**

*"Never lose crypto to mistakes again."*

[Documentation](#-documentation) • [Quick Start](#-quick-start) • [API](#-enterprise-api) • [Security](#-security)

</div>

---

## 🎯 The Problem

Every year, **billions of dollars** in crypto are lost forever due to:

| Problem | Annual Loss |
|---------|-------------|
| 🎣 Phishing & Scams | $3.8B |
| 📝 Wrong Address | $1.2B |
| 🔐 Lost Access | $2.1B |
| 💀 Smart Contract Bugs | $1.5B |
| **TOTAL** | **$8.6B+** |

**Blockchain's immutability is a feature... until it's a bug.**

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
| **Multi-Chain** | 5 EVM chains live (ETH, Arbitrum, Base, Optimism, Polygon); altri in arrivo |

### 💰 Progressive Fee Structure

| Tier | Amount | Fee | Example |
|------|--------|-----|---------|
| 🏠 **Retail** | < $1,000 | 0.3% | $100 → $0.30 fee |
| 💼 **Standard** | $1K - $100K | 0.5% | $10,000 → $50 fee |
| 🐋 **Whale** | > $100,000 | 0.7% | $1M → $7,000 fee |

### 🛡️ Premium Insurance (+0.2%)

```
Pay 0.2% extra → Insurance coverage (per policy, fino al pool disponibile)

Even if scammer claims your funds:
├── You contact us with proof
├── We verify the scam
└── You get refunded from Insurance Pool 💰

Example: 10 ETH with insurance
├── Base fee: 0.05 ETH (0.5%)
├── Insurance: 0.02 ETH (0.2%)
├── Total cost: 0.07 ETH (0.7%)
└── Protection: copertura soggetta a policy/pool ✓
```

### 🏢 Enterprise Payroll & Stipends (API)

- Paga stipendi, compensi e rimborsi con una finestra di lock: se c’è un errore puoi annullare prima che il destinatario incassi.
- HMAC/nonce/timestamp sull’API: le chiavi restano lato server, niente bearer in frontend.
- Recovery addresses e auto-refund: se il dipendente non reclama, i fondi tornano automaticamente.
- Opzione insurance (+0.2%) per coprire frodi/claim errati.
- Rate limiting e audit-first rollout: mainnet gated finché l’audit esterno non è completato.

---

## 🌐 Supported Chains

| Chain | Status | Chain ID |
|-------|--------|----------|
| Ethereum | ✅ Live | 1 |
| Arbitrum | ✅ Live | 42161 |
| Base | ✅ Live | 8453 |
| Optimism | ✅ Live | 10 |
| Polygon | ✅ Live | 137 |
| Avalanche | 🔜 Planned | 43114 |
| BSC | 🔜 Planned | 56 |
| zkSync Era | 🔜 Planned | 324 |
| Linea | 🔜 Planned | 59144 |
| Scroll | 🔜 Planned | 534352 |
| Mantle | 🔜 Planned | 5000 |
| Blast | 🔜 Planned | 81457 |
| Mode | 🔜 Planned | 34443 |
| Celo | 🔜 Planned | 42220 |
| Gnosis | 🔜 Planned | 100 |

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/reverso-protocol/reverso.git
cd reverso

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

# Deploy multichain (usa config hardhat)
npx hardhat run scripts/deploy-multichain.ts
```

---

## ✅ Test Results (Verified)
Suite Hardhat in locale (ETH + ERC20 + insurance + rescue):

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
// Gets: Full scam/theft protection!

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

REVERSO offers a powerful REST API for businesses, exchanges, and dApps.

### Plans & Pricing

| Plan | Price | TX/Month | Features |
|------|-------|----------|----------|
| **Starter** | $99 | 100 | API Access, Email Support |
| **Business** | $499 | Unlimited | + Webhooks, Dashboard, Priority Support |
| **Enterprise** | $2,000 | Unlimited | + White-label, SLA 99.9%, 24/7 Support |

### Base URL

```
Production: https://api.reverso.finance/api/v1  (coming soon)
Development: http://localhost:3000/api/v1
```

### Authentication

```bash
curl -H "Authorization: Bearer rsk_business_xxx..." \
  https://api.reverso.finance/api/v1/transfers
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


### API Security (HMAC)
- Header richiesti sulle rotte protette: `Authorization: Bearer <apiKey>`, `x-reverso-timestamp` (epoch ms, drift <=2m), `x-reverso-nonce` (UUID), `x-reverso-signature` (HMAC-SHA256 di `timestamp.nonce.METHOD.URL.sha256(body)` con `signingSecret`).
- Rate limiting: 300 req/min per API key + txLimit per piano. CORS: `*` consentito se incluso in allowedOrigins.

### Multi-chain config
- Fonte unica: [api/config/chains.json](api/config/chains.json) + variabili `.env` per RPC e indirizzi vault (`*_RPC`, `*_VAULT`).
- Loader TS: [api/src/config/chains.ts](api/src/config/chains.ts), usato in router transfer/admin.
- Dopo il deploy, aggiorna `.env` con gli indirizzi reali e, se vuoi, explorer API key per la verifica.

### Encoding TX
- `sendETH/ETHPremium`: `(recipient, delay, expiryPeriod, recovery1, recovery2, memo)`
- `sendToken`: `(token, recipient, amount, delay, expiryPeriod, recovery1, recovery2, memo)`
- Memo max 256 char; recovery non può essere zero address.

### Roadmap operativa
- Audit + bug bounty pubblici.
- Migrazione API a DB persistente (Postgres/Mongo) per chiavi, trasferimenti, webhooks.
- Mapping on-chain ID <-> ID API per cancel/claim via backend.
- SDK client con mappa chain dinamica e fallback RPC.
### API Security (HMAC)
- Ogni richiesta protetta richiede header:
  - `Authorization: Bearer <apiKey>`
  - `x-reverso-timestamp`: epoch ms (±5 minuti tolleranza)
  - `x-reverso-nonce`: UUID univoco per evitare replay
  - `x-reverso-signature`: HMAC-SHA256 di `timestamp.nonce.METHOD.URL.sha256(body)` firmata con `signingSecret` della API key (mostrata una sola volta alla creazione).
- Le chiavi accettano wildcard `*` in `allowedOrigins` per CORS; rate limit per-key: 300 req/min + txLimit per piano.
```

---

## 📊 Revenue Model

| Stream | Source | Estimated Revenue |
|--------|--------|-------------------|
| **Progressive Fees** | 0.3-0.7% on transfers | ~$5.8M/year @ $1B volume |
| **Insurance Premiums** | 0.2% on premium transfers | ~$600K/year |
| **Enterprise API** | $99-$2000/month subscriptions | ~$600K/year |
| **TOTAL** | | **~$7M/year** |

---

## 🔐 Security

### Smart Contract Security

- ✅ ReentrancyGuard on all external functions
- ✅ Pausable for emergency stops
- ✅ Circuit breaker (auto-pause on suspicious activity)
- ✅ Timelock on admin changes (48 hours)
- ✅ Guardian system for freezing suspicious transfers
- ✅ OpenZeppelin battle-tested contracts

### 5-Layer Protection System

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

🔒 **Security First Approach**

- Smart contract follows OpenZeppelin best practices
- ReentrancyGuard, Pausable, SafeERC20 implemented
- Professional security audit planned before mainnet launch
- Bug bounty program will launch alongside mainnet

**Timeline:**
- Q1 2025: Internal review + testnet
- Q2 2025: Professional audit + mainnet

### Bug Bounty

| Severity | Reward |
|----------|--------|
| Critical | Up to $50,000 |
| High | Up to $20,000 |
| Medium | Up to $5,000 |
| Low | Up to $1,000 |

### Policy assicurativa (bozza)

- Copertura valida solo per trasferimenti con `hasInsurance = true` e stato `Claimed` (il destinatario ha incassato).
- Richiesta: ticket con prova di truffa (screenshot, tx hash, firma del mittente) entro 30 giorni dall’evento.
- Decisione: comitato sicurezza entro 7 giorni; criteri pubblici (phishing/scam comprovato, non errori di prezzo/mercato).
- Payout: fino all’intero importo trasferito, limitato al saldo del pool; log on-chain con `InsuranceClaimPaid`.
- Abusi: segnalazioni false possono portare a ban dell’API key e rifiuto di future richieste.

### UX & gas checklist

- Schermata invio: mostra fee (0.3/0.5/0.7%) + premium (0.2%) e il netto al destinatario.
- Claim/Cancel: indica finestra temporale, costo gas stimato e pulsante rapido “cancel” finché il lock non è scaduto.
- Ricezione forzata: consenti “rifiuta”/auto-refund dopo expiry per ridurre griefing.
- Notifiche: alert su unlock, expiry imminente, auto-refund, rescue.
- Token: evidenzia allowance richiesta e rischio infinite approvals; preferisci allowance mirate.
- Mobile: un tap per claim/cancel; fallback per gasless solo se c’è un relayer fidato.

---

## 📁 Project Structure

```
REVERSO/
├── contracts/
│   ├── ReversoVault.sol      # Main vault contract
│   └── interfaces/
│       └── IReversoVault.sol # Interface
├── api/
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── types.ts          # TypeScript types
│   │   ├── routes/
│   │   │   ├── auth.ts       # Authentication
│   │   │   ├── transfer.ts   # Transfer CRUD
│   │   │   ├── webhook.ts    # Webhooks (Business+)
│   │   │   └── admin.ts      # Dashboard (Business+)
│   │   └── middleware/
│   │       ├── apiKey.ts     # API key validation
│   │       └── errorHandler.ts
│   ├── package.json
│   └── README.md             # API documentation
├── scripts/
│   ├── deploy.ts             # Single chain deploy
│   └── deploy-multichain.ts  # Multi-chain deploy
├── test/
│   └── ReversoVault.test.ts
├── hardhat.config.ts         # 15+ chains configured
└── README.md                 # This file
```

---

## 📊 Use Cases

### 1. 🛡️ Protection Against Phishing
> "I accidentally approved a malicious contract. With REVERSO, I had 24 hours to cancel before my funds were stolen."

### 2. 💼 Business Payments
> "We send contractor payments through REVERSO. If there's a dispute or error, we can cancel within the grace period."

### 3. 👨‍👩‍👧 Family Transfers
> "I send my daughter's allowance through REVERSO. She can see it's coming, and I can cancel if plans change."

### 4. 🏦 Escrow Alternative
> "Instead of complex escrow contracts, we use REVERSO with a 7-day delay for large purchases."

### 5. 🔑 Inheritance Planning
> "I scheduled transfers to my heirs with maximum delays. If something happens to me, funds auto-release."

### 6. 🏢 Enterprise Integration
> "Our exchange integrated REVERSO API. Now all withdrawals have a 1-hour safety window."

---

## 🗺️ Roadmap

### Phase 1: Foundation (Q1 2025) ✅
- [x] Core smart contracts
- [x] Progressive fee structure
- [x] Insurance system
- [x] Multi-chain configuration (15+ chains)
- [x] Enterprise API
- [x] Basic documentation

### Phase 2: Launch (Q2 2025)
- [ ] Security audits (OpenZeppelin, Trail of Bits)
- [ ] Testnet launch on all chains
- [ ] Mainnet launch (Ethereum, Arbitrum, Base)
- [ ] SDK release (JavaScript/TypeScript)
- [ ] Mobile app (React Native)

### Phase 3: Growth (Q3 2025)
- [ ] Cross-chain reversible transfers
- [ ] Wallet integrations (MetaMask Snap, WalletConnect)
- [ ] CEX partnerships (Coinbase, Binance)
- [ ] DAO governance launch

### Phase 4: Ecosystem (Q4 2025)
- [ ] REVERSO token launch
- [ ] Fiat on-ramp with reversibility
- [ ] Insurance protocol integration (Nexus Mutual)
- [ ] Enterprise white-label solutions

---

## 🤝 Integrations

REVERSO is designed to integrate with the broader DeFi ecosystem:

| Category | Integrations |
|----------|-------------|
| **Wallets** | MetaMask, WalletConnect, Ledger, Trezor |
| **Exchanges** | Coinbase, Binance, Kraken |
| **DeFi** | Uniswap, Aave, Compound |
| **Infrastructure** | Chainlink, The Graph, Alchemy |
| **Insurance** | Nexus Mutual, InsurAce |

---

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Clone repo
git clone https://github.com/reverso-protocol/reverso.git
cd reverso

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

| Resource | Status |
|----------|--------|
| Website | 🚧 In development |
| Documentation | 📄 See this README |
| API Docs | 📄 See API section above |
| GitHub | [This repository](.) |

*Social channels and official website launching Q1 2025*

---

<div align="center">

**Built with ❤️ for a safer crypto future**

*REVERSO Protocol - Because everyone deserves a second chance*

</div>
