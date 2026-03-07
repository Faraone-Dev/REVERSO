"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const resend_1 = require("resend");
const apiKey_1 = require("../middleware/apiKey");
const errorHandler_1 = require("../middleware/errorHandler");
const types_1 = require("../types");
const resend = process.env.RESEND_API_KEY ? new resend_1.Resend(process.env.RESEND_API_KEY) : null;
exports.authRouter = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const users = new Map();
// Rate limit for quick-key generation (per IP, 3 per hour)
const quickKeyRateLimit = new Map();
/**
 * POST /api/v1/auth/quick-key
 * Generate an API key instantly with just email + company (no password needed).
 * Used by the website form. Returns Starter plan key.
 */
exports.authRouter.post('/quick-key', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, company } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
        throw (0, errorHandler_1.BadRequest)('A valid email is required');
    }
    // Rate limit: max 3 quick-key generations per IP per hour
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const window = quickKeyRateLimit.get(ip);
    if (window && (now - window.ts) < 3600_000) {
        if (window.count >= 10) {
            return res.status(429).json({
                error: 'Too many key requests. Try again in 1 hour.',
                code: 'RATE_LIMITED'
            });
        }
        window.count++;
    }
    else {
        quickKeyRateLimit.set(ip, { ts: now, count: 1 });
    }
    // Check if email already registered — return error
    for (const user of users.values()) {
        if (user.email === email.toLowerCase().trim()) {
            throw (0, errorHandler_1.BadRequest)('Email already registered. Use /auth/login to get a new key.');
        }
    }
    const userId = (0, uuid_1.v4)();
    const autoPassword = crypto_1.default.randomBytes(24).toString('hex');
    const hashedPassword = await bcryptjs_1.default.hash(autoPassword, 4); // Low rounds: auto-generated pwd, user never sees it
    const plan = 'starter';
    const user = {
        id: userId,
        email: email.toLowerCase().trim(),
        hashedPassword,
        company: company || undefined,
        plan,
        apiKeys: [],
        createdAt: new Date()
    };
    // Create API key
    const apiKey = await (0, apiKey_1.createApiKey)(userId, plan);
    user.apiKeys.push(apiKey.id);
    users.set(userId, user);
    // Generate JWT so they can manage their key later
    const token = jsonwebtoken_1.default.sign({ userId, email: user.email, plan }, JWT_SECRET, { expiresIn: '30d' });
    // Send welcome email (non-blocking, no key in email)
    if (resend) {
        const txLimit = types_1.PLAN_CONFIG[plan].txLimit;
        resend.emails.send({
            from: 'REVERSO <noreply@reverso.one>',
            to: user.email,
            subject: 'Welcome to REVERSO — Your API Access is Active',
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; margin: 0; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">REVERSO</h1>
            <p style="color: #6b7280; margin-top: 4px;">Reversible Blockchain Transactions</p>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <h2 style="margin-top: 0; font-size: 20px;">Welcome${company ? `, ${company}` : ''}! 🎉</h2>
            <p>Your API access is now active. Here are your plan details:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Plan</td><td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${plan}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">TX Limit</td><td style="padding: 8px 0; font-weight: 600;">${txLimit === -1 ? 'Unlimited' : txLimit + '/month'}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Supported Chains</td><td style="padding: 8px 0; font-weight: 600;">Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche</td></tr>
            </table>
            <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 16px 0; border-left: 4px solid #f59e0b;">
              <strong>⚠️ Important:</strong> Your API Key and Signing Secret were shown only once on the website. If you didn't save them, generate a new key from the dashboard.
            </div>
          </div>
          <div style="margin-top: 24px;">
            <h3 style="font-size: 16px;">Quick Start</h3>
            <pre style="background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px;">curl -X POST https://reverso-tu3o.onrender.com/api/v1/transfers \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"chainId": 1, "to": "0x...", "amount": "1000000000000000000"}'</pre>
          </div>
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <a href="https://reverso.one" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Documentation</a>
            <span style="color: #d1d5db; margin: 0 12px;">|</span>
            <a href="https://reverso-tu3o.onrender.com/api/v1/auth/plans" style="color: #3b82f6; text-decoration: none; font-weight: 500;">API Plans</a>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">REVERSO — Reversible Transaction Protocol<br/>© 2026 All rights reserved</p>
        </div>
      `
        }).catch(err => console.error('Email send failed:', err));
    }
    res.status(201).json({
        success: true,
        apiKey: apiKey.key,
        signingSecret: apiKey.signingSecret,
        plan,
        txLimit: types_1.PLAN_CONFIG[plan].txLimit,
        expiresAt: apiKey.expiresAt,
        token,
        emailSent: !!resend,
        message: 'Save your API key and signing secret — they are shown only once!'
    });
}));
/**
 * POST /api/v1/auth/register
 * Register new API user
 */
exports.authRouter.post('/register', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, company, plan = 'starter' } = req.body;
    if (!email || !password) {
        throw (0, errorHandler_1.BadRequest)('Email and password are required');
    }
    if (!['starter', 'business', 'enterprise'].includes(plan)) {
        throw (0, errorHandler_1.BadRequest)('Invalid plan. Choose: starter, business, enterprise');
    }
    // Check if user exists
    for (const user of users.values()) {
        if (user.email === email) {
            throw (0, errorHandler_1.BadRequest)('Email already registered');
        }
    }
    // Create user
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const userId = (0, uuid_1.v4)();
    const user = {
        id: userId,
        email,
        hashedPassword,
        company,
        plan: plan,
        apiKeys: [],
        createdAt: new Date()
    };
    // Create initial API key
    const apiKey = await (0, apiKey_1.createApiKey)(userId, plan);
    user.apiKeys.push(apiKey.id);
    users.set(userId, user);
    // Generate JWT
    const token = jsonwebtoken_1.default.sign({ userId, email, plan }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
        success: true,
        user: {
            id: userId,
            email,
            company,
            plan,
            createdAt: user.createdAt
        },
        apiKey: {
            key: apiKey.key, // Only shown once!
            id: apiKey.id,
            plan: apiKey.plan,
            txLimit: types_1.PLAN_CONFIG[apiKey.plan].txLimit,
            expiresAt: apiKey.expiresAt,
            signingSecret: apiKey.signingSecret // only once
        },
        token,
        message: '⚠️ Save your API key! It will only be shown once.'
    });
}));
/**
 * POST /api/v1/auth/login
 * Login existing user
 */
exports.authRouter.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw (0, errorHandler_1.BadRequest)('Email and password are required');
    }
    // Find user
    let foundUser;
    for (const user of users.values()) {
        if (user.email === email) {
            foundUser = user;
            break;
        }
    }
    if (!foundUser) {
        throw (0, errorHandler_1.BadRequest)('Invalid credentials', 'INVALID_CREDENTIALS');
    }
    const isValidPassword = await bcryptjs_1.default.compare(password, foundUser.hashedPassword);
    if (!isValidPassword) {
        throw (0, errorHandler_1.BadRequest)('Invalid credentials', 'INVALID_CREDENTIALS');
    }
    // Generate JWT
    const token = jsonwebtoken_1.default.sign({ userId: foundUser.id, email: foundUser.email, plan: foundUser.plan }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
        success: true,
        user: {
            id: foundUser.id,
            email: foundUser.email,
            company: foundUser.company,
            plan: foundUser.plan
        },
        token,
        apiKeyCount: foundUser.apiKeys.length
    });
}));
/**
 * GET /api/v1/auth/plans
 * Get available plans
 */
exports.authRouter.get('/plans', (req, res) => {
    res.json({
        plans: Object.entries(types_1.PLAN_CONFIG).map(([name, config]) => ({
            name,
            price: `$${config.price}/month`,
            features: {
                txLimit: config.txLimit === -1 ? 'Unlimited' : config.txLimit,
                webhooks: config.webhooks,
                dashboard: config.dashboard,
                whiteLabel: config.whiteLabel,
                sla: config.sla,
                prioritySupport: config.prioritySupport
            }
        }))
    });
});
/**
 * POST /api/v1/auth/api-key
 * Generate new API key (requires JWT)
 */
exports.authRouter.post('/api-key', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_1.BadRequest)('JWT token required');
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = users.get(decoded.userId);
        if (!user) {
            throw (0, errorHandler_1.BadRequest)('User not found');
        }
        const { webhookUrl, allowedOrigins } = req.body;
        const apiKey = await (0, apiKey_1.createApiKey)(user.id, user.plan, webhookUrl, allowedOrigins || []);
        user.apiKeys.push(apiKey.id);
        users.set(user.id, user);
        res.status(201).json({
            success: true,
            apiKey: {
                key: apiKey.key,
                id: apiKey.id,
                plan: apiKey.plan,
                txLimit: types_1.PLAN_CONFIG[apiKey.plan].txLimit,
                webhookUrl: apiKey.webhookUrl,
                allowedOrigins: apiKey.allowedOrigins,
                expiresAt: apiKey.expiresAt,
                signingSecret: apiKey.signingSecret
            },
            message: '⚠️ Save your API key and signing secret! They will only be shown once.'
        });
    }
    catch (error) {
        throw (0, errorHandler_1.BadRequest)('Invalid or expired token');
    }
}));
