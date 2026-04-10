import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// ═══════════════════════════════════════════════════════════════
//  REVERSO KEEPER — Vault → Monitor event bridge
//
//  Listens to Vault events on WebSocket, forwards sender+amount
//  to Monitor.recordTransaction() so anomaly detection works.
// ═══════════════════════════════════════════════════════════════

const VAULT_ABI = [
  'event TransferCreated(uint256 indexed transferId, address indexed sender, address indexed recipient, address token, uint256 amount, uint256 unlockAt, uint256 expiresAt, string memo)',
  'event TransferClaimed(uint256 indexed transferId, address indexed recipient, uint256 amount)',
  'event TransferCancelled(uint256 indexed transferId, address indexed sender, uint256 amount)',
];

const MONITOR_ABI = [
  'function recordTransaction(address sender, uint256 amount) external',
  'function authorizedKeepers(address) external view returns (bool)',
  'function currentAlertLevel() external view returns (uint8)',
  'function totalTransactions() external view returns (uint256)',
];

// ─── Config ──────────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
  return val;
}

const RPC_URL = requireEnv('RPC_URL');           // wss://...
const RPC_URL_HTTP = requireEnv('RPC_URL_HTTP'); // https://... (for tx sending)
const VAULT_ADDRESS = requireEnv('VAULT_ADDRESS');
const MONITOR_ADDRESS = requireEnv('MONITOR_ADDRESS');
const KEEPER_PRIVATE_KEY = requireEnv('KEEPER_PRIVATE_KEY');

// ─── State ───────────────────────────────────────────────────

let wsProvider: ethers.WebSocketProvider;
let httpProvider: ethers.JsonRpcProvider;
let keeperWallet: ethers.Wallet;
let vault: ethers.Contract;
let monitor: ethers.Contract;
let pendingTx = false;
let reconnecting = false;

// Stats
let eventsReceived = 0;
let txSent = 0;
let txFailed = 0;

// ─── Core ────────────────────────────────────────────────────

async function forwardToMonitor(sender: string, amount: bigint, eventName: string, transferId: bigint) {
  if (pendingTx) {
    console.log(`  ⏳ Skipping (previous tx pending) — ${eventName} #${transferId}`);
    return;
  }

  try {
    pendingTx = true;
    const tx = await monitor.recordTransaction(sender, amount);
    console.log(`  📡 TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    txSent++;
    console.log(`  ✅ Confirmed in block ${receipt!.blockNumber} (gas: ${receipt!.gasUsed})`);
  } catch (err: any) {
    txFailed++;
    console.error(`  ❌ TX failed: ${err.reason || err.message}`);
  } finally {
    pendingTx = false;
  }
}

function attachListeners() {
  vault.on('TransferCreated', async (transferId, sender, _recipient, _token, amount) => {
    eventsReceived++;
    console.log(`\n🔔 TransferCreated #${transferId} — ${ethers.formatEther(amount)} ETH from ${sender}`);
    await forwardToMonitor(sender, amount, 'TransferCreated', transferId);
  });

  vault.on('TransferClaimed', async (transferId, recipient, amount) => {
    eventsReceived++;
    console.log(`\n🔔 TransferClaimed #${transferId} — ${ethers.formatEther(amount)} ETH by ${recipient}`);
    await forwardToMonitor(recipient, amount, 'TransferClaimed', transferId);
  });

  vault.on('TransferCancelled', async (transferId, sender, amount) => {
    eventsReceived++;
    console.log(`\n🔔 TransferCancelled #${transferId} — ${ethers.formatEther(amount)} ETH by ${sender}`);
    // Cancels are normal — record for volume tracking but lower priority
    await forwardToMonitor(sender, amount, 'TransferCancelled', transferId);
  });
}

// ─── WebSocket reconnection ──────────────────────────────────

async function connect() {
  if (reconnecting) return;
  reconnecting = true;

  try {
    console.log('🔌 Connecting to RPC...');

    wsProvider = new ethers.WebSocketProvider(RPC_URL);
    httpProvider = new ethers.JsonRpcProvider(RPC_URL_HTTP);
    keeperWallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, httpProvider);

    // Read-only vault on WS for events, write monitor on HTTP for txs
    vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wsProvider);
    monitor = new ethers.Contract(MONITOR_ADDRESS, MONITOR_ABI, keeperWallet);

    // Verify keeper authorization
    const isAuthorized = await monitor.authorizedKeepers(keeperWallet.address);
    if (!isAuthorized) {
      console.error(`\n❌ Keeper ${keeperWallet.address} is NOT authorized on Monitor.`);
      console.error(`   Run: monitor.setKeeper("${keeperWallet.address}", true) from owner.`);
      process.exit(1);
    }

    const alertLevel = await monitor.currentAlertLevel();
    const totalTx = await monitor.totalTransactions();
    const network = await httpProvider.getNetwork();
    const balance = await httpProvider.getBalance(keeperWallet.address);

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  👁️  REVERSO KEEPER — Monitor Event Bridge                ║`);
    console.log(`╠═══════════════════════════════════════════════════════════╣`);
    console.log(`║  Chain:    ${network.name} (${network.chainId})`.padEnd(60) + '║');
    console.log(`║  Keeper:   ${keeperWallet.address.slice(0, 20)}...`.padEnd(60) + '║');
    console.log(`║  Balance:  ${ethers.formatEther(balance)} ETH`.padEnd(60) + '║');
    console.log(`║  Vault:    ${VAULT_ADDRESS.slice(0, 20)}...`.padEnd(60) + '║');
    console.log(`║  Monitor:  ${MONITOR_ADDRESS.slice(0, 20)}...`.padEnd(60) + '║');
    console.log(`║  Alert:    Level ${alertLevel} | ${totalTx} total tx recorded`.padEnd(60) + '║');
    console.log(`╚═══════════════════════════════════════════════════════════╝`);
    console.log(`\n⏳ Listening for Vault events...\n`);

    attachListeners();

    // Handle WS disconnect — cast needed because ethers types WebSocketLike without .on()
    const ws = wsProvider.websocket as any;
    ws.on('close', () => {
      console.log('\n⚠️  WebSocket closed. Reconnecting in 5s...');
      vault.removeAllListeners();
      setTimeout(connect, 5000);
    });

    ws.on('error', (err: Error) => {
      console.error('⚠️  WebSocket error:', err.message);
    });
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    console.log('   Retrying in 10s...');
    setTimeout(connect, 10000);
  } finally {
    reconnecting = false;
  }
}

// ─── Stats heartbeat ─────────────────────────────────────────

setInterval(() => {
  if (eventsReceived > 0 || txSent > 0) {
    console.log(`\n📊 Keeper stats: ${eventsReceived} events | ${txSent} tx sent | ${txFailed} failed`);
  }
}, 60_000); // Every minute

// ─── Start ───────────────────────────────────────────────────

connect();
