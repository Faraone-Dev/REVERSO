# DEPLOY INFO

## Hosting

| Servizio | URL | Cosa hosta |
|----------|-----|------------|
| **Cloudflare Pages** | reverso.one | Website (Vite build da `website/dist/`), project `reverso`, build URL `reverso-cyn.pages.dev` |
| **Render** | reverso-tu3o.onrender.com | API Express (Docker da `api/`) |

## Dominio

- **Registrar**: Spaceship
- **Dominio**: reverso.one
- **DNS**: gestiti su Cloudflare (nameservers `kyrie.ns.cloudflare.com`, `lina.ns.cloudflare.com`)
- **Record TXT Google**: `google-site-verification=mzMKrBlsWH0kqThol806YM9MbB2YJbrb8OOCvf3OhCM`
- **Record TXT Resend**: configurato per email da `noreply@reverso.one`

## Stripe (Pagamenti)

- **Account**: reverso.one
- **Modalità**: LIVE
- **Payout**: Revolut (IBAN lituano), EUR, automatico giornaliero
- **Webhook URL**: `https://reverso-tu3o.onrender.com/api/v1/billing/webhook`
- **Eventi webhook**: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`
- **Piani**: Starter $99/mo, Business $499/mo, Enterprise $2000/mo

## Env Vars su Render

- `STRIPE_SECRET_KEY` — chiave live `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` — signing secret webhook live `whsec_...`
- `WEBSITE_URL` — `https://reverso.one`
- `RESEND_API_KEY` — per email di benvenuto con API key
- `API_MASTER_KEY` — chiave admin API
- `HMAC_SECRET` — per firma HMAC delle richieste API

## Email (Resend)

- **Mittente**: `noreply@reverso.one`
- **Uso**: email automatica con API key dopo pagamento Stripe

## Google Search Console

- **Proprietà**: reverso.one (verificata via DNS TXT)
- **Sitemap**: `https://reverso.one/sitemap.xml` (inviata)

## Smart Contracts (Ethereum Mainnet)

- **ReversoVault**: `0x31ec8EeeCb341c7cefAefA6BC0Dd84BE9Bd11085`
- **EmergencyGuardian**: `0x7F1CB513B7A582A11f3057F104D561E9A9126A7d`
- **ReversoMonitor**: `0x152935935E86ab06ce75b6871c500f6Eb57f5332`
- Tutti verificati su Etherscan, deployati su 7 chain

## Build & Deploy

```bash
# Website: build e push (Cloudflare Pages auto-deploya da GitHub, branch main, root `website/`)
git add -A && git commit -m "msg" && git push

# API: push su GitHub (Render auto-deploya da main)
git push

# Test contratti
npx hardhat test  # 109/109
```
