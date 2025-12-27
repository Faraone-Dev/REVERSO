import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth';
import { transferRouter } from './routes/transfer';
import { webhookRouter } from './routes/webhook';
import { adminRouter } from './routes/admin';
import { usecaseRouter } from './routes/usecases';
import { apiKeyMiddleware } from './middleware/apiKey';
import { hmacMiddleware } from './middleware/hmac';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max 1000 requests per 15 min
  message: { error: 'Too many requests, please try again later' }
});
app.use(globalLimiter);

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Documentation
app.get('/', (req, res) => {
  res.json({
    name: 'REVERSO Enterprise API',
    version: '1.0.0',
    documentation: 'https://docs.reverso.finance/api',
    endpoints: {
      auth: '/api/v1/auth',
      transfers: '/api/v1/transfers',
      webhooks: '/api/v1/webhooks',
      admin: '/api/v1/admin'
    },
    plans: {
      starter: { price: '$99/month', txLimit: 100, features: ['API Access', 'Email Support'] },
      business: { price: '$499/month', txLimit: -1, features: ['Unlimited TX', 'Dashboard', 'Priority Support'] },
      enterprise: { price: '$2000/month', txLimit: -1, features: ['White-label', 'SLA', '24/7 Support', 'Custom Integration', 'Usecase APIs'] }
    }
  });
});

// Public routes
app.use('/api/v1/auth', authRouter);

// Protected routes (require API key + HMAC)
app.use('/api/v1/transfers', apiKeyMiddleware, hmacMiddleware, transferRouter);
app.use('/api/v1/webhooks', apiKeyMiddleware, hmacMiddleware, webhookRouter);
app.use('/api/v1/admin', apiKeyMiddleware, hmacMiddleware, adminRouter);
app.use('/api/v1/usecases', apiKeyMiddleware, hmacMiddleware, usecaseRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔄 REVERSO Enterprise API v1.0.0                        ║
║                                                           ║
║   Server running on port ${PORT}                            ║
║   Documentation: https://docs.reverso.finance/api         ║
║                                                           ║
║   Plans:                                                  ║
║   • Starter:    $99/mo  - 100 tx/month                   ║
║   • Business:   $499/mo - Unlimited tx                   ║
║   • Enterprise: $2000/mo - White-label + SLA             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
