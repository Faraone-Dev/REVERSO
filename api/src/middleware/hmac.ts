import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from './apiKey';
import * as DB from '../db';

const MAX_DRIFT_MS = 60 * 1000; // 60 seconds - tight window for security

// Clean old nonces every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - MAX_DRIFT_MS * 2; // Keep 2x window for safety
  DB.cleanOldNonces.run(cutoff);
}, 5 * 60 * 1000);

function safeJsonStringify(body: any): string {
  if (body === undefined || body === null) return '';
  try {
    if (typeof body === 'string') return body;
    const s = JSON.stringify(body);
    return s === '{}' ? '' : s;
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

  // Replay check (DB-backed)
  const existingNonce = DB.findNonce.get(apiKey.id, nonceHeader);
  if (existingNonce) {
    return res.status(401).json({ error: 'Replay detected', code: 'REPLAY' });
  }

  // Store nonce with timestamp for TTL cleanup
  DB.insertNonce.run(apiKey.id, nonceHeader, Date.now());

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
