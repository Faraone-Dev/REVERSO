# REVERSO Enterprise API

Enterprise-grade API for reversible blockchain transactions.

## Quick Start

```bash
# Install dependencies
cd api
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## Plans & Pricing

| Plan | Price | TX Limit | Features |
|------|-------|----------|----------|
| **Starter** | $99/mo | 100/month | API access, Email support |
| **Business** | $499/mo | Unlimited | + Webhooks, Dashboard, Priority support |
| **Enterprise** | $2,000/mo | Unlimited | + White-label, SLA, 24/7 support |

## Authentication

All API requests require a Bearer token:

```bash
curl -H "Authorization: Bearer rsk_business_xxx..." \
  https://api.reverso.finance/api/v1/transfers
```

## API Reference

### Auth Endpoints

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "dev@company.com",
  "password": "secure123",
  "company": "Acme Inc",
  "plan": "business"
}
```

Response:
```json
{
  "success": true,
  "user": { "id": "...", "email": "...", "plan": "business" },
  "apiKey": {
    "key": "rsk_business_xxx...",
    "id": "...",
    "txLimit": -1,
    "expiresAt": "..."
  },
  "token": "jwt...",
  "message": "⚠️ Save your API key! It will only be shown once."
}
```

### Transfer Endpoints

#### Create Transfer
```http
POST /api/v1/transfers
Authorization: Bearer rsk_xxx...
Content-Type: application/json

{
  "chainId": 1,
  "to": "0x...",
  "amount": "1000000000000000000",
  "token": null,
  "lockDuration": 86400,
  "withInsurance": true,
  "metadata": { "orderId": "12345" }
}
```

Response:
```json
{
  "success": true,
  "transfer": {
    "id": "uuid",
    "chainId": 1,
    "status": "pending",
    "to": "0x...",
    "amount": "1000000000000000000",
    "fee": "5000000000000000",
    "insurance": { "active": true, "premium": "2000000000000000" }
  },
  "transaction": {
    "to": "0x...",
    "data": "0x...",
    "value": "1000000000000000000",
    "chainId": 1
  },
  "instructions": "Sign and broadcast this transaction with your wallet"
}
```

#### Get Transfer
```http
GET /api/v1/transfers/:id
Authorization: Bearer rsk_xxx...
```

#### List Transfers
```http
GET /api/v1/transfers?status=pending&chainId=1&limit=50
Authorization: Bearer rsk_xxx...
```

#### Cancel Transfer
```http
POST /api/v1/transfers/:id/cancel
Authorization: Bearer rsk_xxx...
```

### Webhook Endpoints

#### Create Webhook (Business/Enterprise only)
```http
POST /api/v1/webhooks
Authorization: Bearer rsk_xxx...
Content-Type: application/json

{
  "url": "https://yourapp.com/webhook",
  "events": ["transfer.created", "transfer.claimed", "transfer.cancelled"]
}
```

Response:
```json
{
  "success": true,
  "webhook": {
    "id": "...",
    "url": "https://yourapp.com/webhook",
    "events": ["transfer.created", "transfer.claimed", "transfer.cancelled"],
    "secret": "whsec_xxx..."
  },
  "message": "⚠️ Save your webhook secret!"
}
```

### Admin Endpoints

#### Get Usage (Business/Enterprise)
```http
GET /api/v1/admin/usage
Authorization: Bearer rsk_xxx...
```

#### Get Statistics (Enterprise only)
```http
GET /api/v1/admin/stats
Authorization: Bearer rsk_xxx...
```

#### Update Branding (Enterprise only)
```http
PUT /api/v1/admin/branding
Authorization: Bearer rsk_xxx...
Content-Type: application/json

{
  "companyName": "Your Brand",
  "primaryColor": "#3B82F6",
  "logo": "https://..."
}
```

## Webhook Events

| Event | Description |
|-------|-------------|
| `transfer.created` | New transfer created |
| `transfer.claimed` | Recipient claimed funds |
| `transfer.cancelled` | Sender cancelled transfer |
| `transfer.refunded` | Expired transfer refunded |

### Webhook Signature Verification

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const [timestamp, sig] = signature.split(',').map(s => s.split('=')[1]);
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return sig === expected;
}
```

## Supported Chains

| Chain ID | Network | Status |
|----------|---------|--------|
| 1 | Ethereum | ✅ |
| 42161 | Arbitrum | ✅ |
| 8453 | Base | ✅ |
| 10 | Optimism | ✅ |
| 137 | Polygon | ✅ |
| 43114 | Avalanche | ✅ |
| 56 | BSC | ✅ |

## Rate Limits

| Plan | Rate Limit |
|------|------------|
| Starter | 100 requests/15 min |
| Business | 1000 requests/15 min |
| Enterprise | 10000 requests/15 min |

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid API key |
| `INVALID_API_KEY` | API key not found |
| `API_KEY_DISABLED` | Key has been revoked |
| `API_KEY_EXPIRED` | Key has expired |
| `TX_LIMIT_EXCEEDED` | Monthly limit reached |
| `ORIGIN_FORBIDDEN` | Origin not in allowlist |
| `BAD_REQUEST` | Invalid request parameters |

## SDKs

Coming soon:
- JavaScript/TypeScript
- Python
- Go
- Rust

## Support

- **Starter**: support@reverso.finance (48h response)
- **Business**: priority@reverso.finance (4h response)
- **Enterprise**: enterprise@reverso.finance (1h response, 24/7)
