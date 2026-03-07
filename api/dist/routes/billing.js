"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRouter = void 0;
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const errorHandler_1 = require("../middleware/errorHandler");
const crypto_1 = __importDefault(require("crypto"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-02-25.clover'
});
exports.billingRouter = (0, express_1.Router)();
// Plan → Stripe Price mapping (created on first call, cached)
const PLAN_CONFIG = {
    starter: { name: 'REVERSO Starter', price: 9900, features: '100 transfers/month, REST API access' },
    business: { name: 'REVERSO Business', price: 49900, features: 'Unlimited transfers, Dashboard, Priority Support' },
    enterprise: { name: 'REVERSO Enterprise', price: 200000, features: 'White-label, 99.9% SLA, 24/7 Support' }
};
// Cache for Stripe price IDs
let priceCache = {};
/**
 * Get or create Stripe Price for a plan
 */
async function getOrCreatePrice(plan) {
    if (priceCache[plan])
        return priceCache[plan];
    const config = PLAN_CONFIG[plan];
    // Search for existing product
    const products = await stripe.products.search({
        query: `name:"${config.name}" AND active:"true"`
    });
    let productId;
    if (products.data.length > 0) {
        productId = products.data[0].id;
        // Find active recurring price
        const prices = await stripe.prices.list({ product: productId, active: true, type: 'recurring' });
        if (prices.data.length > 0) {
            priceCache[plan] = prices.data[0].id;
            return prices.data[0].id;
        }
    }
    else {
        const product = await stripe.products.create({
            name: config.name,
            description: config.features,
            metadata: { plan }
        });
        productId = product.id;
    }
    const price = await stripe.prices.create({
        product: productId,
        unit_amount: config.price,
        currency: 'usd',
        recurring: { interval: 'month' }
    });
    priceCache[plan] = price.id;
    return price.id;
}
/**
 * POST /api/v1/billing/checkout
 * Create a Stripe Checkout Session for a plan
 * Body: { plan: 'starter' | 'business' | 'enterprise', email?: string }
 */
exports.billingRouter.post('/checkout', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { plan, email } = req.body;
    if (!plan || !PLAN_CONFIG[plan]) {
        return res.status(400).json({ error: 'Invalid plan. Use: starter, business, enterprise' });
    }
    const priceId = await getOrCreatePrice(plan);
    const sessionParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.WEBSITE_URL || 'https://reverso.one'}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.WEBSITE_URL || 'https://reverso.one'}?payment=cancelled`,
        metadata: { plan },
        subscription_data: {
            metadata: { plan }
        }
    };
    if (email) {
        sessionParams.customer_email = email;
    }
    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url, sessionId: session.id });
}));
/**
 * GET /api/v1/billing/plans
 * Return available plans with prices
 */
exports.billingRouter.get('/plans', (req, res) => {
    res.json({
        plans: {
            starter: {
                name: 'Starter',
                price: '$99/month',
                priceAmount: 99,
                currency: 'USD',
                features: [
                    '100 transfers/month',
                    'REST API access',
                    '7-chain support',
                    'Email support'
                ]
            },
            business: {
                name: 'Business',
                price: '$499/month',
                priceAmount: 499,
                currency: 'USD',
                features: [
                    'Unlimited transfers',
                    'REST API access',
                    'Webhook notifications',
                    'Dashboard access',
                    'All-network claiming',
                    'Priority support'
                ]
            },
            enterprise: {
                name: 'Enterprise',
                price: '$2,000/month',
                priceAmount: 2000,
                currency: 'USD',
                features: [
                    'Everything in Business',
                    'White-label solution',
                    '99.9% SLA guarantee',
                    '24/7 dedicated support',
                    'Custom integrations',
                    'Volume discounts'
                ]
            }
        }
    });
});
/**
 * POST /api/v1/billing/webhook
 * Stripe webhook handler — processes payment events
 * NOTE: This needs raw body, handled specially in index.ts
 */
exports.billingRouter.post('/webhook', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook not configured' });
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
    }
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const plan = session.metadata?.plan;
            const customerEmail = session.customer_details?.email;
            const customerId = session.customer;
            console.log(`✅ Payment successful: ${customerEmail} → ${plan} plan (customer: ${customerId})`);
            // Generate API key for the customer
            const apiKey = `rsk_${plan}_${crypto_1.default.randomBytes(16).toString('hex')}`;
            const signingSecret = `rss_${crypto_1.default.randomBytes(32).toString('hex')}`;
            console.log(`🔑 API Key generated for ${customerEmail}: ${apiKey}`);
            // Send welcome email with API key via Resend
            try {
                const { Resend } = await Promise.resolve().then(() => __importStar(require('resend')));
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: 'REVERSO <noreply@reverso.one>',
                    to: customerEmail,
                    subject: `🔑 Your REVERSO ${plan?.charAt(0).toUpperCase()}${plan?.slice(1)} API Key`,
                    html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #00ff88, #00cc6a); padding: 32px; text-align: center;">
                <h1 style="color: #000; margin: 0; font-size: 28px;">🔄 REVERSO</h1>
                <p style="color: #000; margin: 8px 0 0; font-size: 16px;">Payment Confirmed</p>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #00ff88; margin-top: 0;">Welcome to ${plan?.charAt(0).toUpperCase()}${plan?.slice(1)}!</h2>
                <p>Your subscription is active. Here are your credentials:</p>
                
                <div style="background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0 0 12px; color: #888;">API Key</p>
                  <code style="color: #00ff88; font-size: 14px; word-break: break-all;">${apiKey}</code>
                </div>
                
                <div style="background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0 0 12px; color: #888;">Signing Secret (for HMAC)</p>
                  <code style="color: #00ff88; font-size: 14px; word-break: break-all;">${signingSecret}</code>
                </div>
                
                <div style="background: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #ff3b30; font-weight: bold;">⚠️ Save these credentials now!</p>
                  <p style="margin: 8px 0 0; color: #ccc; font-size: 14px;">They won't be shown again. Store them securely.</p>
                </div>
                
                <p style="color: #888; font-size: 14px; margin-top: 24px;">
                  Base URL: <code style="color: #00ff88;">https://reverso-tu3o.onrender.com/api/v1/</code><br>
                  Docs: <a href="https://reverso.one/api" style="color: #00ff88;">reverso.one/api</a>
                </p>
              </div>
              <div style="background: #111; padding: 16px; text-align: center; color: #666; font-size: 12px;">
                REVERSO Protocol — Never lose crypto to mistakes again.
              </div>
            </div>
          `
                });
                console.log(`📧 Welcome email sent to ${customerEmail}`);
            }
            catch (emailErr) {
                console.error('Failed to send welcome email:', emailErr);
            }
            break;
        }
        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const customerEmail = invoice.customer_email;
            console.log(`❌ Payment failed for ${customerEmail}`);
            break;
        }
        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const plan = subscription.metadata?.plan;
            console.log(`🚫 Subscription cancelled: ${subscription.id} (${plan} plan)`);
            break;
        }
        default:
            console.log(`Unhandled event: ${event.type}`);
    }
    res.json({ received: true });
}));
/**
 * GET /api/v1/billing/portal
 * Create Stripe Customer Portal session for managing subscription
 * Query: ?customer_id=cus_xxx
 */
exports.billingRouter.post('/portal', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { customer_id } = req.body;
    if (!customer_id) {
        return res.status(400).json({ error: 'customer_id required' });
    }
    const session = await stripe.billingPortal.sessions.create({
        customer: customer_id,
        return_url: process.env.WEBSITE_URL || 'https://reverso.one'
    });
    res.json({ url: session.url });
}));
