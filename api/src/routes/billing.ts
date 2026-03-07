import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { asyncHandler } from '../middleware/errorHandler';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover'
});

export const billingRouter = Router();

// Plan → Stripe Price mapping (created on first call, cached)
const PLAN_CONFIG = {
  starter: { name: 'REVERSO Starter', price: 9900, features: '100 transfers/month, REST API access' },
  business: { name: 'REVERSO Business', price: 49900, features: 'Unlimited transfers, Dashboard, Priority Support' },
  enterprise: { name: 'REVERSO Enterprise', price: 200000, features: 'White-label, 99.9% SLA, 24/7 Support' }
} as const;

// Cache for Stripe price IDs
let priceCache: Record<string, string> = {};

/**
 * Get or create Stripe Price for a plan
 */
async function getOrCreatePrice(plan: keyof typeof PLAN_CONFIG): Promise<string> {
  if (priceCache[plan]) return priceCache[plan];

  const config = PLAN_CONFIG[plan];

  // Search for existing product
  const products = await stripe.products.search({
    query: `name:"${config.name}" AND active:"true"`
  });

  let productId: string;

  if (products.data.length > 0) {
    productId = products.data[0].id;
    // Find active recurring price
    const prices = await stripe.prices.list({ product: productId, active: true, type: 'recurring' });
    if (prices.data.length > 0) {
      priceCache[plan] = prices.data[0].id;
      return prices.data[0].id;
    }
  } else {
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
billingRouter.post('/checkout', asyncHandler(async (req: Request, res: Response) => {
  const { plan, email } = req.body;

  if (!plan || !PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
    return res.status(400).json({ error: 'Invalid plan. Use: starter, business, enterprise' });
  }

  const priceId = await getOrCreatePrice(plan as keyof typeof PLAN_CONFIG);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
billingRouter.get('/plans', (req: Request, res: Response) => {
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
billingRouter.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = session.metadata?.plan;
      const customerEmail = session.customer_details?.email;
      const customerId = session.customer as string;

      console.log(`✅ Payment successful: ${customerEmail} → ${plan} plan (customer: ${customerId})`);

      // Generate API key for the customer
      const apiKey = `rsk_${plan}_${crypto.randomBytes(16).toString('hex')}`;
      const signingSecret = `rss_${crypto.randomBytes(32).toString('hex')}`;

      console.log(`🔑 API Key generated for ${customerEmail}: ${apiKey}`);

      // Send welcome email with API key via Resend
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'REVERSO <noreply@reverso.one>',
          to: customerEmail!,
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
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerEmail = invoice.customer_email;
      console.log(`❌ Payment failed for ${customerEmail}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
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
billingRouter.post('/portal', asyncHandler(async (req: Request, res: Response) => {
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
