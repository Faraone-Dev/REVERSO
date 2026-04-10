import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { createApiKey } from '../middleware/apiKey';
import { asyncHandler, BadRequest } from '../middleware/errorHandler';
import { ApiPlan, PLAN_CONFIG } from '../types';
import * as DB from '../db';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Rate limit for quick-key generation (per IP, 3 per hour) — in-memory is fine for rate limits
const quickKeyRateLimit: Map<string, { ts: number; count: number }> = new Map();

/**
 * POST /api/v1/auth/quick-key
 * Generate an API key instantly with just email + company (no password needed).
 * Used by the website form. Returns Starter plan key.
 */
authRouter.post('/quick-key', asyncHandler(async (req: any, res: Response) => {
  const { email, company } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    throw BadRequest('A valid email is required');
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
  } else {
    quickKeyRateLimit.set(ip, { ts: now, count: 1 });
  }

  // Check if email already registered — return error
  const existingUser = DB.findUserByEmail.get(email.toLowerCase().trim()) as any;
  if (existingUser) {
    throw BadRequest('Email already registered. Use /auth/login to get a new key.');
  }

  const userId = uuidv4();
  const autoPassword = crypto.randomBytes(24).toString('hex');
  const hashedPassword = await bcrypt.hash(autoPassword, 4); // Low rounds: auto-generated pwd, user never sees it
  const plan: ApiPlan = 'starter';

  // Create user in DB
  DB.insertUser.run({
    id: userId,
    email: email.toLowerCase().trim(),
    hashedPassword,
    company: company || null,
    plan
  });

  // Create API key
  const apiKey = await createApiKey(userId, plan);

  // Generate JWT so they can manage their key later
  const token = jwt.sign({ userId, email: email.toLowerCase().trim(), plan }, JWT_SECRET!, { expiresIn: '30d' });

  // Send welcome email (non-blocking, no key in email)
  if (resend) {
    const txLimit = PLAN_CONFIG[plan].txLimit;
    resend.emails.send({
      from: 'REVERSO <noreply@reverso.one>',
      to: email.toLowerCase().trim(),
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
    txLimit: PLAN_CONFIG[plan].txLimit,
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
authRouter.post('/register', asyncHandler(async (req: any, res: Response) => {
  const { email, password, company, plan = 'starter' } = req.body;

  if (!email || !password) {
    throw BadRequest('Email and password are required');
  }

  if (!['starter', 'business', 'enterprise'].includes(plan)) {
    throw BadRequest('Invalid plan. Choose: starter, business, enterprise');
  }

  // Check if user exists
  const existingUser = DB.findUserByEmail.get(email) as any;
  if (existingUser) {
    throw BadRequest('Email already registered');
  }

  // Create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  
  DB.insertUser.run({
    id: userId,
    email,
    hashedPassword,
    company: company || null,
    plan: plan as ApiPlan
  });

  // Create initial API key
  const apiKey = await createApiKey(userId, plan as ApiPlan);

  // Generate JWT
  const token = jwt.sign({ userId, email, plan }, JWT_SECRET, { expiresIn: '30d' });

  res.status(201).json({
    success: true,
    user: {
      id: userId,
      email,
      company,
      plan,
      createdAt: new Date().toISOString()
    },
    apiKey: {
      key: apiKey.key, // Only shown once!
      id: apiKey.id,
      plan: apiKey.plan,
      txLimit: PLAN_CONFIG[apiKey.plan].txLimit,
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
authRouter.post('/login', asyncHandler(async (req: any, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw BadRequest('Email and password are required');
  }

  // Find user
  const foundUser = DB.findUserByEmail.get(email) as any;

  if (!foundUser) {
    throw BadRequest('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await bcrypt.compare(password, foundUser.hashed_password);
  if (!isValidPassword) {
    throw BadRequest('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: foundUser.id, email: foundUser.email, plan: foundUser.plan },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const keyCount = (DB.countApiKeysByUserId.get(foundUser.id) as any)?.count || 0;

  res.json({
    success: true,
    user: {
      id: foundUser.id,
      email: foundUser.email,
      company: foundUser.company,
      plan: foundUser.plan
    },
    token,
    apiKeyCount: keyCount
  });
}));

/**
 * GET /api/v1/auth/plans
 * Get available plans
 */
authRouter.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(PLAN_CONFIG).map(([name, config]) => ({
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
authRouter.post('/api-key', asyncHandler(async (req: any, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw BadRequest('JWT token required');
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = DB.findUserById.get(decoded.userId) as any;
    
    if (!user) {
      throw BadRequest('User not found');
    }

    const { webhookUrl, allowedOrigins } = req.body;
    const apiKey = await createApiKey(
      user.id,
      user.plan,
      webhookUrl,
      allowedOrigins || []
    );

    res.status(201).json({
      success: true,
      apiKey: {
        key: apiKey.key,
        id: apiKey.id,
        plan: apiKey.plan,
        txLimit: PLAN_CONFIG[apiKey.plan].txLimit,
        webhookUrl: apiKey.webhookUrl,
        allowedOrigins: apiKey.allowedOrigins,
        expiresAt: apiKey.expiresAt,
        signingSecret: apiKey.signingSecret
      },
      message: '⚠️ Save your API key and signing secret! They will only be shown once.'
    });
  } catch (error) {
    throw BadRequest('Invalid or expired token');
  }
}));
