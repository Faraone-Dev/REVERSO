import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, hasFeature } from '../middleware/apiKey';
import { asyncHandler, BadRequest, Forbidden, NotFound } from '../middleware/errorHandler';
import { WebhookEvent } from '../types';

export const webhookRouter = Router();

// Webhook configuration store
interface WebhookConfig {
  id: string;
  apiKeyId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  failCount: number;
}

const webhooks: Map<string, WebhookConfig> = new Map();
const webhookLogs: WebhookEvent[] = [];

/**
 * GET /api/v1/webhooks
 * List configured webhooks
 */
webhookRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;

  // Check plan
  if (!hasFeature(apiKey.plan, 'webhooks')) {
    throw Forbidden('Webhooks require Business or Enterprise plan. Upgrade at /api/v1/auth/plans');
  }

  const userWebhooks = Array.from(webhooks.values())
    .filter(w => w.apiKeyId === apiKey.id)
    .map(w => ({
      id: w.id,
      url: w.url,
      events: w.events,
      isActive: w.isActive,
      createdAt: w.createdAt,
      lastTriggered: w.lastTriggered,
      failCount: w.failCount
    }));

  res.json({ webhooks: userWebhooks });
}));

/**
 * POST /api/v1/webhooks
 * Create new webhook
 */
webhookRouter.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;

  if (!hasFeature(apiKey.plan, 'webhooks')) {
    throw Forbidden('Webhooks require Business or Enterprise plan');
  }

  const { url, events } = req.body;

  if (!url || !url.startsWith('https://')) {
    throw BadRequest('Webhook URL must use HTTPS');
  }

  const validEvents = ['transfer.created', 'transfer.claimed', 'transfer.cancelled', 'transfer.refunded'];
  const selectedEvents = events?.filter((e: string) => validEvents.includes(e)) || validEvents;

  const webhook: WebhookConfig = {
    id: uuidv4(),
    apiKeyId: apiKey.id,
    url,
    events: selectedEvents,
    secret: `whsec_${uuidv4().replace(/-/g, '')}`,
    isActive: true,
    createdAt: new Date(),
    failCount: 0
  };

  webhooks.set(webhook.id, webhook);

  res.status(201).json({
    success: true,
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret, // Only shown once!
      isActive: webhook.isActive
    },
    message: '⚠️ Save your webhook secret! It will only be shown once.'
  });
}));

/**
 * DELETE /api/v1/webhooks/:id
 * Delete webhook
 */
webhookRouter.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;
  const { id } = req.params;

  const webhook = webhooks.get(id);
  if (!webhook) {
    throw NotFound('Webhook not found');
  }

  if (webhook.apiKeyId !== apiKey.id) {
    throw Forbidden('Not authorized to delete this webhook');
  }

  webhooks.delete(id);

  res.json({ success: true, message: 'Webhook deleted' });
}));

/**
 * PATCH /api/v1/webhooks/:id
 * Update webhook
 */
webhookRouter.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;
  const { id } = req.params;
  const { url, events, isActive } = req.body;

  const webhook = webhooks.get(id);
  if (!webhook) {
    throw NotFound('Webhook not found');
  }

  if (webhook.apiKeyId !== apiKey.id) {
    throw Forbidden('Not authorized to update this webhook');
  }

  if (url) {
    if (!url.startsWith('https://')) {
      throw BadRequest('Webhook URL must use HTTPS');
    }
    webhook.url = url;
  }

  if (events) {
    const validEvents = ['transfer.created', 'transfer.claimed', 'transfer.cancelled', 'transfer.refunded'];
    webhook.events = events.filter((e: string) => validEvents.includes(e));
  }

  if (typeof isActive === 'boolean') {
    webhook.isActive = isActive;
  }

  webhooks.set(id, webhook);

  res.json({
    success: true,
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive
    }
  });
}));

/**
 * POST /api/v1/webhooks/:id/test
 * Send test webhook
 */
webhookRouter.post('/:id/test', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;
  const { id } = req.params;

  const webhook = webhooks.get(id);
  if (!webhook) {
    throw NotFound('Webhook not found');
  }

  if (webhook.apiKeyId !== apiKey.id) {
    throw Forbidden('Not authorized');
  }

  // Send test webhook
  const testEvent: WebhookEvent = {
    id: uuidv4(),
    type: 'transfer.created',
    data: {
      id: 'test-transfer-id',
      chainId: 1,
      status: 'locked',
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0987654321098765432109876543210987654321',
      amount: '1000000000000000000',
      token: 'ETH',
      fee: '5000000000000000',
      lockDuration: 86400,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      createdAt: new Date()
    },
    createdAt: new Date()
  };

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Reverso-Signature': generateSignature(testEvent, webhook.secret),
        'X-Reverso-Event': testEvent.type
      },
      body: JSON.stringify(testEvent)
    });

    res.json({
      success: response.ok,
      statusCode: response.status,
      message: response.ok ? 'Test webhook sent successfully' : 'Webhook delivery failed'
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message,
      message: 'Failed to deliver test webhook'
    });
  }
}));

/**
 * GET /api/v1/webhooks/events
 * Get available webhook events
 */
webhookRouter.get('/info/events', (req, res) => {
  res.json({
    events: [
      {
        type: 'transfer.created',
        description: 'Triggered when a new reversible transfer is created'
      },
      {
        type: 'transfer.claimed',
        description: 'Triggered when recipient claims the transfer after lock period'
      },
      {
        type: 'transfer.cancelled',
        description: 'Triggered when sender cancels the transfer'
      },
      {
        type: 'transfer.refunded',
        description: 'Triggered when expired transfer is refunded to sender'
      }
    ]
  });
});

// Helper: Generate webhook signature
function generateSignature(payload: any, secret: string): string {
  const crypto = require('crypto');
  const timestamp = Date.now();
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// Export for use in transfer events
export async function triggerWebhook(apiKeyId: string, event: WebhookEvent): Promise<void> {
  const userWebhooks = Array.from(webhooks.values())
    .filter(w => w.apiKeyId === apiKeyId && w.isActive && w.events.includes(event.type));

  for (const webhook of userWebhooks) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Reverso-Signature': generateSignature(event, webhook.secret),
          'X-Reverso-Event': event.type
        },
        body: JSON.stringify(event)
      });

      if (response.ok) {
        webhook.lastTriggered = new Date();
        webhook.failCount = 0;
      } else {
        webhook.failCount++;
      }
    } catch (error) {
      webhook.failCount++;
      console.error(`Webhook delivery failed for ${webhook.id}:`, error);
    }

    // Disable after 10 consecutive failures
    if (webhook.failCount >= 10) {
      webhook.isActive = false;
    }

    webhooks.set(webhook.id, webhook);
  }

  // Log event
  webhookLogs.push(event);
}
