import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { ApiKey, ApiPlan, PLAN_CONFIG } from '../types';
import * as DB from '../db';

// In-memory rate limiter only (short-lived, no persistence needed)
const rateWindows: Map<string, { start: number; count: number }> = new Map();
const REQUESTS_PER_MINUTE = 300;

export interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
}

/**
 * API Key middleware - validates and tracks usage
 */
export async function apiKeyMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid API key',
        code: 'UNAUTHORIZED'
      });
    }

    const apiKeyValue = authHeader.substring(7); // Remove 'Bearer '
    
    // Find API key (hash compare against DB)
    let foundKey: ApiKey | undefined;
    const allKeys = DB.getAllApiKeys.all() as any[];
    for (const row of allKeys) {
      const isValid = await bcrypt.compare(apiKeyValue, row.hashed_key);
      if (isValid) {
        foundKey = {
          id: row.id,
          key: '',
          hashedKey: row.hashed_key,
          signingSecret: row.signing_secret,
          userId: row.user_id,
          plan: row.plan as ApiPlan,
          txLimit: row.tx_limit,
          txUsed: row.tx_used,
          webhookUrl: row.webhook_url || undefined,
          allowedOrigins: JSON.parse(row.allowed_origins || '[]'),
          createdAt: new Date(row.created_at),
          expiresAt: new Date(row.expires_at),
          isActive: !!row.is_active,
        };
        break;
      }
    }

    if (!foundKey) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    if (!foundKey.isActive) {
      return res.status(403).json({
        error: 'API key is disabled',
        code: 'API_KEY_DISABLED'
      });
    }

    if (foundKey.expiresAt < new Date()) {
      return res.status(403).json({
        error: 'API key has expired',
        code: 'API_KEY_EXPIRED'
      });
    }

    // Check rate limit based on plan usage cap
    const planConfig = PLAN_CONFIG[foundKey.plan];
    if (planConfig.txLimit !== -1 && foundKey.txUsed >= planConfig.txLimit) {
      return res.status(429).json({
        error: 'Monthly transaction limit exceeded',
        code: 'TX_LIMIT_EXCEEDED',
        details: {
          plan: foundKey.plan,
          limit: planConfig.txLimit,
          used: foundKey.txUsed,
          upgrade: 'Contact sales@reverso.one to upgrade'
        }
      });
    }

    // Per-key rate limit (burst control, 1-minute window)
    const now = Date.now();
    const windowStart = now - 60_000;
    const window = rateWindows.get(foundKey.id);
    if (!window || window.start < windowStart) {
      rateWindows.set(foundKey.id, { start: now, count: 1 });
    } else {
      if (window.count >= REQUESTS_PER_MINUTE) {
        return res.status(429).json({
          error: 'Rate limit exceeded for API key',
          code: 'RATE_LIMITED'
        });
      }
      window.count += 1;
      rateWindows.set(foundKey.id, window);
    }

    // Check origin if configured
    if (foundKey.allowedOrigins.length > 0 && !foundKey.allowedOrigins.includes('*')) {
      const origin = req.headers.origin;
      if (origin && !foundKey.allowedOrigins.includes(origin)) {
        return res.status(403).json({
          error: 'Origin not allowed',
          code: 'ORIGIN_FORBIDDEN'
        });
      }
    }

    req.apiKey = foundKey;
    next();
  } catch (error) {
    console.error('API Key middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Increment transaction counter for API key
 */
export function incrementTxCount(apiKeyId: string): void {
  DB.incrementApiKeyTxUsed.run(apiKeyId);
}

/**
 * Create new API key
 */
export async function createApiKey(
  userId: string,
  plan: ApiPlan,
  webhookUrl?: string,
  allowedOrigins: string[] = []
): Promise<ApiKey> {
  const rawKey = `rsk_${plan}_${uuidv4().replace(/-/g, '')}`;
  const hashedKey = await bcrypt.hash(rawKey, 10);
  const signingSecret = `sig_${uuidv4().replace(/-/g, '')}`;
  
  const apiKey: ApiKey = {
    id: uuidv4(),
    key: rawKey, // Only returned once at creation
    hashedKey,
    signingSecret,
    userId,
    plan,
    txLimit: PLAN_CONFIG[plan].txLimit,
    txUsed: 0,
    webhookUrl,
    allowedOrigins,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    isActive: true
  };

  // Store in DB (hashed key only, raw key returned to caller once)
  DB.insertApiKey.run({
    id: apiKey.id,
    hashedKey: apiKey.hashedKey,
    signingSecret: apiKey.signingSecret,
    userId: apiKey.userId,
    plan: apiKey.plan,
    txLimit: apiKey.txLimit,
    txUsed: 0,
    webhookUrl: apiKey.webhookUrl || null,
    allowedOrigins: JSON.stringify(apiKey.allowedOrigins),
    expiresAt: apiKey.expiresAt.toISOString(),
    isActive: 1,
  });
  return apiKey;
}

/**
 * Get API key by ID
 */
export function getApiKey(id: string): ApiKey | undefined {
  const row = DB.findApiKeyById.get(id) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    key: '',
    hashedKey: row.hashed_key,
    signingSecret: row.signing_secret,
    userId: row.user_id,
    plan: row.plan as ApiPlan,
    txLimit: row.tx_limit,
    txUsed: row.tx_used,
    webhookUrl: row.webhook_url || undefined,
    allowedOrigins: JSON.parse(row.allowed_origins || '[]'),
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    isActive: !!row.is_active,
  };
}

/**
 * Revoke API key
 */
export function revokeApiKey(id: string): boolean {
  const row = DB.findApiKeyById.get(id) as any;
  if (!row) return false;
  DB.updateApiKey.run({
    id,
    plan: row.plan,
    txLimit: row.tx_limit,
    txUsed: row.tx_used,
    webhookUrl: row.webhook_url,
    allowedOrigins: row.allowed_origins,
    isActive: 0,
  });
  return true;
}

/**
 * Check if plan has feature
 */
export function hasFeature(plan: ApiPlan, feature: keyof typeof PLAN_CONFIG.starter): boolean {
  return !!PLAN_CONFIG[plan][feature];
}

// Create demo API key on startup (only if DB is empty)
(async () => {
  const existingKeys = DB.getAllApiKeys.all();
  if (existingKeys.length === 0) {
    // Ensure demo user exists
    const existingUser = DB.findUserById.get('demo-user') as any;
    if (!existingUser) {
      DB.insertUser.run({
        id: 'demo-user',
        email: 'demo@reverso.one',
        hashedPassword: '',
        company: 'Demo',
        plan: 'business',
      });
    }
    const demoKey = await createApiKey('demo-user', 'business', undefined, ['*']);
    console.log(`\n📌 Demo API Key: ${demoKey.key}\n`);
  }
})();
