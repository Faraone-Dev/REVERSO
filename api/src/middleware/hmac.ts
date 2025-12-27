import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from './apiKey';

// Replay protection store: apiKeyId -> Set of recent nonces
const nonceStore: Map<string, Set<string>> = new Map();
const MAX_DRIFT_MS = 2 * 60 * 1000; // 2 minutes

function safeJsonStringify(body: any): string {
  try {
    return typeof body === 'string' ? body : JSON.stringify(body || {});
  } catch {
    return '';
  }
}

export function hmacMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Health and root can skip
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  const apiKey = req.apiKey;
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required before signature check' });
  }

  const tsHeader = req.header('x-reverso-timestamp');
  const nonceHeader = req.header('x-reverso-nonce');
  const sigHeader = req.header('x-reverso-signature');

  if (!tsHeader || !nonceHeader || !sigHeader) {
    return res.status(401).json({ error: 'Missing signature headers', code: 'SIGNATURE_REQUIRED' });
  }

  const timestamp = Number(tsHeader);
  if (!Number.isFinite(timestamp)) {
    return res.status(400).json({ error: 'Invalid timestamp', code: 'INVALID_TIMESTAMP' });
  }

  if (Math.abs(Date.now() - timestamp) > MAX_DRIFT_MS) {
    return res.status(401).json({ error: 'Timestamp drift too large', code: 'TIMESTAMP_DRIFT' });
  }

  // Replay check
  const nonceSet = nonceStore.get(apiKey.id) || new Set<string>();
  if (nonceSet.has(nonceHeader)) {
    return res.status(401).json({ error: 'Replay detected', code: 'REPLAY' });
  }

  // Maintain window size to avoid unbounded growth
  if (nonceSet.size > 1000) {
    nonceSet.clear();
  }
  nonceSet.add(nonceHeader);
  nonceStore.set(apiKey.id, nonceSet);

  const bodyString = safeJsonStringify(req.body);
  const payload = `${timestamp}.${nonceHeader}.${req.method.toUpperCase()}.${req.originalUrl}.${crypto
    .createHash('sha256')
    .update(bodyString)
    .digest('hex')}`;

  const expected = crypto
    .createHmac('sha256', apiKey.signingSecret)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader))) {
    return res.status(401).json({ error: 'Invalid signature', code: 'INVALID_SIGNATURE' });
  }

  next();
}
