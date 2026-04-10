# Keeper — ReversoMonitor Event Bridge

## What it does
Listens to `TransferCreated` and `TransferClaimed` events from the ReversoVault
and calls `monitor.recordTransaction(sender, amount)` to feed the anomaly
detection system that was deployed but never wired into the Vault.

## Why it exists
The Vault and Monitor are both deployed and verified on-chain, but the Vault
never calls the Monitor. Since the contracts are immutable, this off-chain
keeper bridges the gap by watching Vault events and forwarding them.

## Requirements
- The keeper wallet must be registered as an `authorizedKeeper` on the Monitor
  contract (call `monitor.setKeeper(keeperAddress, true)` from the owner).

## Setup
```bash
cd keeper
npm install
cp .env.example .env   # fill in RPC_URL, KEEPER_PRIVATE_KEY, etc.
npm run dev
```

## Environment Variables
| Variable | Description |
|----------|-------------|
| `RPC_URL` | WebSocket RPC endpoint (e.g. Alchemy wss://...) |
| `RPC_URL_HTTP` | HTTP fallback for tx sending |
| `VAULT_ADDRESS` | ReversoVault contract address |
| `MONITOR_ADDRESS` | ReversoMonitor contract address |
| `KEEPER_PRIVATE_KEY` | Private key of authorized keeper wallet |
| `CHAIN_ID` | Chain ID (default: 1) |
