import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { ApiKey, ApiPlan, PLAN_CONFIG } from '../types';

// In-memory store (replace with MongoDB/PostgreSQL in production)
const apiKeys: Map<string, ApiKey> = new Map();

// Simple per-key rate limiter (requests per minute)
const rateWindows: Map<string, { start: number; count: number }> = new Map();
const REQUESTS_PER_MINUTE = 300; // adjust per plan if needed

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
    
    // Find API key (hash compare only)
    let foundKey: ApiKey | undefined;
    for (const [, key] of apiKeys) {
      const isValid = await bcrypt.compare(apiKeyValue, key.hashedKey);
      if (isValid) {
        foundKey = key;
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
          upgrade: 'Contact sales@reverso.finance to upgrade'
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
  const key = apiKeys.get(apiKeyId);
  if (key) {
    key.txUsed++;
    apiKeys.set(apiKeyId, key);
  }
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

  // Store only hashed value to avoid keeping raw key in memory
  apiKeys.set(apiKey.id, { ...apiKey, key: '' });
  return apiKey;
}

/**
 * Get API key by ID
 */
export function getApiKey(id: string): ApiKey | undefined {
  return apiKeys.get(id);
}

/**
 * Revoke API key
 */
export function revokeApiKey(id: string): boolean {
  const key = apiKeys.get(id);
  if (key) {
    key.isActive = false;
    apiKeys.set(id, key);
    return true;
  }
  return false;
}

/**
 * Check if plan has feature
 */
export function hasFeature(plan: ApiPlan, feature: keyof typeof PLAN_CONFIG.starter): boolean {
  return !!PLAN_CONFIG[plan][feature];
}

// Create demo API key on startup
(async () => {
  const demoKey = await createApiKey('demo-user', 'business', undefined, ['*']);
  console.log(`\n📌 Demo API Key: ${demoKey.key}\n`);
})();
