"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./routes/auth");
const transfer_1 = require("./routes/transfer");
const webhook_1 = require("./routes/webhook");
const admin_1 = require("./routes/admin");
const usecases_1 = require("./routes/usecases");
const billing_1 = require("./routes/billing");
const apiKey_1 = require("./middleware/apiKey");
const hmac_1 = require("./middleware/hmac");
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"]
        }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(o => o && o !== '*');
app.use((0, cors_1.default)({
    origin: allowedOrigins.length > 0 ? allowedOrigins : (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-reverso-signature', 'x-reverso-timestamp', 'x-reverso-nonce']
}));
app.use((0, morgan_1.default)('combined'));
// Raw body for Stripe webhook signature verification
app.use('/api/v1/billing/webhook', express_1.default.raw({ type: 'application/json', limit: '1mb' }), (req, _res, next) => {
    req.rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
// Global rate limit
const globalLimiter = (0, express_rate_limit_1.default)({
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
        documentation: 'https://reverso.one/api',
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
app.use('/api/v1/auth', auth_1.authRouter);
app.use('/api/v1/billing', billing_1.billingRouter);
// Protected routes (require API key + HMAC)
app.use('/api/v1/transfers', apiKey_1.apiKeyMiddleware, hmac_1.hmacMiddleware, transfer_1.transferRouter);
app.use('/api/v1/webhooks', apiKey_1.apiKeyMiddleware, hmac_1.hmacMiddleware, webhook_1.webhookRouter);
app.use('/api/v1/admin', apiKey_1.apiKeyMiddleware, hmac_1.hmacMiddleware, admin_1.adminRouter);
app.use('/api/v1/usecases', apiKey_1.apiKeyMiddleware, hmac_1.hmacMiddleware, usecases_1.usecaseRouter);
// Error handling
app.use(errorHandler_1.errorHandler);
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
║   Documentation: https://reverso.one/api              ║
║                                                           ║
║   Plans:                                                  ║
║   • Starter:    $99/mo  - 100 tx/month                   ║
║   • Business:   $499/mo - Unlimited tx                   ║
║   • Enterprise: $2000/mo - White-label + SLA             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
    // Self-ping every 14 minutes to keep Render free tier awake
    const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    setInterval(() => {
        fetch(`${SELF_URL}/health`).catch(() => { });
    }, 14 * 60 * 1000);
});
exports.default = app;
