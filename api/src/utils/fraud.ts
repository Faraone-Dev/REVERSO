import fs from 'fs';
import path from 'path';

// ───── Denylist sources ─────

const DENYLIST_FILE = process.env.DENYLIST_FILE || path.join(__dirname, '..', '..', 'data', 'denylist.json');

// 1. Environment variable (comma-separated)
const envList = (process.env.ADDRESS_DENYLIST || '').split(',').map(a => a.trim().toLowerCase()).filter(Boolean);

// 2. File-based list (hot-reloaded)
let fileList: Set<string> = new Set();
let fileListMtime = 0;

function loadDenylistFile(): void {
  try {
    if (!fs.existsSync(DENYLIST_FILE)) return;
    const stat = fs.statSync(DENYLIST_FILE);
    if (stat.mtimeMs === fileListMtime) return; // No change
    const raw = JSON.parse(fs.readFileSync(DENYLIST_FILE, 'utf-8'));
    const addresses: string[] = Array.isArray(raw) ? raw : (raw.addresses || []);
    fileList = new Set(addresses.map(a => a.trim().toLowerCase()).filter(Boolean));
    fileListMtime = stat.mtimeMs;
  } catch {
    // Silently ignore parse errors so the server doesn't crash
  }
}

// Initial load
loadDenylistFile();

// Hot-reload every 60 seconds
setInterval(loadDenylistFile, 60_000);

// 3. Runtime additions (from admin API, lost on restart)
const runtimeList: Set<string> = new Set();

// ───── Public API ─────

/**
 * Throws if the address is on any denylist (env, file, or runtime).
 */
export function checkDenylist(address: string): void {
  if (!address) return;
  const lower = address.toLowerCase();
  if (envList.includes(lower) || fileList.has(lower) || runtimeList.has(lower)) {
    const err: any = new Error('Recipient is blocked');
    err.status = 400;
    throw err;
  }
}

/**
 * Add an address to the runtime denylist. Persists to the file if writable.
 */
export function addToDenylist(address: string): void {
  const lower = address.trim().toLowerCase();
  if (!lower) return;
  runtimeList.add(lower);
  persistToFile(lower);
}

/**
 * Remove an address from the runtime & file denylist.
 * Cannot remove env-var entries (redeploy required).
 */
export function removeFromDenylist(address: string): boolean {
  const lower = address.trim().toLowerCase();
  runtimeList.delete(lower);
  fileList.delete(lower);
  persistFile();
  return true;
}

/**
 * List all currently blocked addresses (merged, deduplicated).
 */
export function listDenylist(): string[] {
  const merged = new Set([...envList, ...fileList, ...runtimeList]);
  return Array.from(merged);
}

// ───── Helpers ─────

function persistToFile(address: string): void {
  try {
    loadDenylistFile(); // Refresh first
    fileList.add(address);
    persistFile();
  } catch { /* best effort */ }
}

function persistFile(): void {
  try {
    const dir = path.dirname(DENYLIST_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DENYLIST_FILE, JSON.stringify(Array.from(fileList), null, 2));
    fileListMtime = fs.statSync(DENYLIST_FILE).mtimeMs;
  } catch { /* best effort */ }
}
