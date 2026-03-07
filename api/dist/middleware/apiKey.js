"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyMiddleware = apiKeyMiddleware;
exports.incrementTxCount = incrementTxCount;
exports.createApiKey = createApiKey;
exports.getApiKey = getApiKey;
exports.revokeApiKey = revokeApiKey;
exports.hasFeature = hasFeature;
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const types_1 = require("../types");
// In-memory store (replace with MongoDB/PostgreSQL in production)
const apiKeys = new Map();
// Simple per-key rate limiter (requests per minute)
const rateWindows = new Map();
const REQUESTS_PER_MINUTE = 300; // adjust per plan if needed
/**
 * API Key middleware - validates and tracks usage
 */
async function apiKeyMiddleware(req, res, next) {
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
        let foundKey;
        for (const [, key] of apiKeys) {
            const isValid = await bcryptjs_1.default.compare(apiKeyValue, key.hashedKey);
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
        const planConfig = types_1.PLAN_CONFIG[foundKey.plan];
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
        }
        else {
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
    }
    catch (error) {
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
function incrementTxCount(apiKeyId) {
    const key = apiKeys.get(apiKeyId);
    if (key) {
        key.txUsed++;
        apiKeys.set(apiKeyId, key);
    }
}
/**
 * Create new API key
 */
async function createApiKey(userId, plan, webhookUrl, allowedOrigins = []) {
    const rawKey = `rsk_${plan}_${(0, uuid_1.v4)().replace(/-/g, '')}`;
    const hashedKey = await bcryptjs_1.default.hash(rawKey, 10);
    const signingSecret = `sig_${(0, uuid_1.v4)().replace(/-/g, '')}`;
    const apiKey = {
        id: (0, uuid_1.v4)(),
        key: rawKey, // Only returned once at creation
        hashedKey,
        signingSecret,
        userId,
        plan,
        txLimit: types_1.PLAN_CONFIG[plan].txLimit,
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
function getApiKey(id) {
    return apiKeys.get(id);
}
/**
 * Revoke API key
 */
function revokeApiKey(id) {
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
function hasFeature(plan, feature) {
    return !!types_1.PLAN_CONFIG[plan][feature];
}
// Create demo API key on startup
(async () => {
    const demoKey = await createApiKey('demo-user', 'business', undefined, ['*']);
    console.log(`\n📌 Demo API Key: ${demoKey.key}\n`);
})();
