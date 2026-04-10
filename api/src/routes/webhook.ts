import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, hasFeature } from '../middleware/apiKey';
import { asyncHandler, BadRequest, Forbidden, NotFound } from '../middleware/errorHandler';
import { WebhookEvent } from '../types';
import * as DB from '../db';

export const webhookRouter = Router();

// Map DB row (snake_case) to API response shape
function mapWebhookRow(row: any): any {
  return {
    id: row.id,
    url: row.url,
    events: JSON.parse(row.events),
    isActive: !!row.is_active,
    createdAt: row.created_at,
    lastTriggered: row.last_triggered,
    failCount: row.fail_count
  };
}

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

  const rows = DB.listWebhooksByApiKey.all(apiKey.id) as any[];
  const userWebhooks = rows.map(mapWebhookRow);

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

  const webhookId = uuidv4();
  const secret = `whsec_${uuidv4().replace(/-/g, '')}`;

  DB.insertWebhook.run({
    id: webhookId,
    apiKeyId: apiKey.id,
    url,
    events: JSON.stringify(selectedEvents),
    secret,
    isActive: 1
  });

  res.status(201).json({
    success: true,
    webhook: {
      id: webhookId,
      url,
      events: selectedEvents,
      secret, // Only shown once!
      isActive: true
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

  const webhook = DB.findWebhookById.get(id) as any;
  if (!webhook) {
    throw NotFound('Webhook not found');
  }

  if (webhook.api_key_id !== apiKey.id) {
    throw Forbidden('Not authorized to delete this webhook');
  }

  DB.deleteWebhook.run(id);

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

  const webhook = DB.findWebhookById.get(id) as any;
  if (!webhook) {
    throw NotFound('Webhook not found');
  }

  if (webhook.api_key_id !== apiKey.id) {
    throw Forbidden('Not authorized to update this webhook');
  }

  let newUrl = webhook.url;
  let newEvents = webhook.events;
  let newIsActive = webhook.is_active;

  if (url) {
    if (!url.startsWith('https://')) {
      throw BadRequest('Webhook URL must use HTTPS');
    }
    newUrl = url;
  }

  if (events) {
    const validEvents = ['transfer.created', 'transfer.claimed', 'transfer.cancelled', 'transfer.refunded'];
    newEvents = JSON.stringify(events.filter((e: string) => validEvents.includes(e)));
  }

  if (typeof isActive === 'boolean') {
    newIsActive = isActive ? 1 : 0;
  }

  DB.updateWebhook.run({
    id,
    url: newUrl,
    events: newEvents,
    isActive: newIsActive,
    lastTriggered: webhook.last_triggered,
    failCount: webhook.fail_count
  });

  res.json({
    success: true,
    webhook: {
      id: webhook.id,
      url: newUrl,
      events: JSON.parse(typeof newEvents === 'string' ? newEvents : JSON.stringify(newEvents)),
      isActive: !!newIsActive
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

  const webhook = DB.findWebhookById.get(id) as any;
  if (!webhook) {
    throw NotFound('Webhook not found');
  }

  if (webhook.api_key_id !== apiKey.id) {
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
  const allWebhooks = DB.listActiveWebhooksByApiKeyAndEvent.all(apiKeyId) as any[];
  const matching = allWebhooks.filter(w => {
    const events = JSON.parse(w.events);
    return events.includes(event.type);
  });

  for (const webhook of matching) {
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
        DB.updateWebhook.run({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.is_active,
          lastTriggered: new Date().toISOString(),
          failCount: 0
        });
      } else {
        DB.updateWebhook.run({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          isActive: (webhook.fail_count + 1) >= 10 ? 0 : webhook.is_active,
          lastTriggered: webhook.last_triggered,
          failCount: webhook.fail_count + 1
        });
      }
    } catch (error) {
      const newFailCount = webhook.fail_count + 1;
      DB.updateWebhook.run({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: newFailCount >= 10 ? 0 : webhook.is_active,
        lastTriggered: webhook.last_triggered,
        failCount: newFailCount
      });
      console.error(`Webhook delivery failed for ${webhook.id}:`, error);
    }
  }

  // Log event
  DB.insertWebhookLog.run({
    id: uuidv4(),
    type: event.type,
    data: JSON.stringify(event.data)
  });
}
