import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'reverso.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// WAL mode for better concurrent read performance
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ═══════════════════════════════════════════════════════════════
//                         SCHEMA
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    company TEXT,
    plan TEXT NOT NULL DEFAULT 'starter',
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    hashed_key TEXT NOT NULL,
    signing_secret TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan TEXT NOT NULL DEFAULT 'starter',
    tx_limit INTEGER NOT NULL DEFAULT 100,
    tx_used INTEGER NOT NULL DEFAULT 0,
    webhook_url TEXT,
    allowed_origins TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    on_chain_transfer_id INTEGER,
    chain_id INTEGER NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    from_addr TEXT NOT NULL DEFAULT '',
    to_addr TEXT NOT NULL,
    amount TEXT NOT NULL,
    token TEXT NOT NULL DEFAULT 'ETH',
    fee TEXT NOT NULL DEFAULT '0',
    insurance_active INTEGER NOT NULL DEFAULT 0,
    insurance_premium TEXT,
    lock_duration INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT,
    memo TEXT
  );

  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL REFERENCES api_keys(id),
    url TEXT NOT NULL,
    events TEXT NOT NULL DEFAULT '[]',
    secret TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_triggered TEXT,
    fail_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS webhook_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nonces (
    api_key_id TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (api_key_id, nonce)
  );

  CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
  CREATE INDEX IF NOT EXISTS idx_transfers_chain ON transfers(chain_id);
  CREATE INDEX IF NOT EXISTS idx_webhooks_api_key ON webhooks(api_key_id);
  CREATE INDEX IF NOT EXISTS idx_nonces_created ON nonces(created_at);
`);

// ═══════════════════════════════════════════════════════════════
//                     PREPARED STATEMENTS
// ═══════════════════════════════════════════════════════════════

// --- Users ---
export const insertUser = db.prepare(`
  INSERT INTO users (id, email, hashed_password, company, plan)
  VALUES (@id, @email, @hashedPassword, @company, @plan)
`);

export const findUserByEmail = db.prepare(`
  SELECT * FROM users WHERE email = ?
`);

export const findUserById = db.prepare(`
  SELECT * FROM users WHERE id = ?
`);

// --- API Keys ---
export const insertApiKey = db.prepare(`
  INSERT INTO api_keys (id, hashed_key, signing_secret, user_id, plan, tx_limit, tx_used, webhook_url, allowed_origins, expires_at, is_active)
  VALUES (@id, @hashedKey, @signingSecret, @userId, @plan, @txLimit, @txUsed, @webhookUrl, @allowedOrigins, @expiresAt, @isActive)
`);

export const findApiKeyById = db.prepare(`
  SELECT * FROM api_keys WHERE id = ?
`);

export const getAllApiKeys = db.prepare(`
  SELECT * FROM api_keys WHERE is_active = 1 AND expires_at > datetime('now')
`);

export const incrementApiKeyTxUsed = db.prepare(`
  UPDATE api_keys SET tx_used = tx_used + 1 WHERE id = ?
`);

export const updateApiKey = db.prepare(`
  UPDATE api_keys SET plan = @plan, tx_limit = @txLimit, tx_used = @txUsed, 
    webhook_url = @webhookUrl, allowed_origins = @allowedOrigins, is_active = @isActive
  WHERE id = @id
`);

export const countApiKeysByUserId = db.prepare(`
  SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?
`);

// --- Transfers ---
export const insertTransfer = db.prepare(`
  INSERT INTO transfers (id, chain_id, status, from_addr, to_addr, amount, token, fee, insurance_active, insurance_premium, lock_duration, expires_at, metadata, memo)
  VALUES (@id, @chainId, @status, @fromAddr, @toAddr, @amount, @token, @fee, @insuranceActive, @insurancePremium, @lockDuration, @expiresAt, @metadata, @memo)
`);

export const findTransferById = db.prepare(`
  SELECT * FROM transfers WHERE id = ?
`);

export const updateTransfer = db.prepare(`
  UPDATE transfers SET tx_hash = @txHash, from_addr = @fromAddr, status = @status, expires_at = @expiresAt
  WHERE id = @id
`);

export const listTransfers = db.prepare(`
  SELECT * FROM transfers ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

export const listTransfersByStatus = db.prepare(`
  SELECT * FROM transfers WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

export const listTransfersByChain = db.prepare(`
  SELECT * FROM transfers WHERE chain_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

export const listTransfersByStatusAndChain = db.prepare(`
  SELECT * FROM transfers WHERE status = ? AND chain_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

export const countTransfers = db.prepare(`SELECT COUNT(*) as total FROM transfers`);
export const countTransfersByStatus = db.prepare(`SELECT COUNT(*) as total FROM transfers WHERE status = ?`);
export const countTransfersByChain = db.prepare(`SELECT COUNT(*) as total FROM transfers WHERE chain_id = ?`);
export const countTransfersByStatusAndChain = db.prepare(`SELECT COUNT(*) as total FROM transfers WHERE status = ? AND chain_id = ?`);

// --- Webhooks ---
export const insertWebhook = db.prepare(`
  INSERT INTO webhooks (id, api_key_id, url, events, secret, is_active)
  VALUES (@id, @apiKeyId, @url, @events, @secret, @isActive)
`);

export const findWebhookById = db.prepare(`
  SELECT * FROM webhooks WHERE id = ?
`);

export const listWebhooksByApiKey = db.prepare(`
  SELECT * FROM webhooks WHERE api_key_id = ?
`);

export const updateWebhook = db.prepare(`
  UPDATE webhooks SET url = @url, events = @events, is_active = @isActive, 
    last_triggered = @lastTriggered, fail_count = @failCount
  WHERE id = @id
`);

export const deleteWebhook = db.prepare(`
  DELETE FROM webhooks WHERE id = ?
`);

export const listActiveWebhooksByApiKeyAndEvent = db.prepare(`
  SELECT * FROM webhooks WHERE api_key_id = ? AND is_active = 1
`);

export const insertWebhookLog = db.prepare(`
  INSERT INTO webhook_logs (id, type, data) VALUES (@id, @type, @data)
`);

// --- Nonces (replay protection) ---
export const insertNonce = db.prepare(`
  INSERT OR IGNORE INTO nonces (api_key_id, nonce, created_at) VALUES (?, ?, ?)
`);

export const findNonce = db.prepare(`
  SELECT 1 FROM nonces WHERE api_key_id = ? AND nonce = ?
`);

export const cleanOldNonces = db.prepare(`
  DELETE FROM nonces WHERE created_at < ?
`);

export default db;
