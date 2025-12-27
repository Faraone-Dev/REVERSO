import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApiKey } from '../middleware/apiKey';
import { asyncHandler, BadRequest } from '../middleware/errorHandler';
import { ApiPlan, PLAN_CONFIG } from '../types';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'reverso-secret-key-change-in-prod';

// In-memory user store (use DB in production)
interface User {
  id: string;
  email: string;
  hashedPassword: string;
  company?: string;
  plan: ApiPlan;
  apiKeys: string[];
  createdAt: Date;
}

const users: Map<string, User> = new Map();

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
  for (const user of users.values()) {
    if (user.email === email) {
      throw BadRequest('Email already registered');
    }
  }

  // Create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  
  const user: User = {
    id: userId,
    email,
    hashedPassword,
    company,
    plan: plan as ApiPlan,
    apiKeys: [],
    createdAt: new Date()
  };

  // Create initial API key
  const apiKey = await createApiKey(userId, plan as ApiPlan);
  user.apiKeys.push(apiKey.id);

  users.set(userId, user);

  // Generate JWT
  const token = jwt.sign({ userId, email, plan }, JWT_SECRET, { expiresIn: '30d' });

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
  let foundUser: User | undefined;
  for (const user of users.values()) {
    if (user.email === email) {
      foundUser = user;
      break;
    }
  }

  if (!foundUser) {
    throw BadRequest('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await bcrypt.compare(password, foundUser.hashedPassword);
  if (!isValidPassword) {
    throw BadRequest('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: foundUser.id, email: foundUser.email, plan: foundUser.plan },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

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
    const user = users.get(decoded.userId);
    
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

    user.apiKeys.push(apiKey.id);
    users.set(user.id, user);

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
