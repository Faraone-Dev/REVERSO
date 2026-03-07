"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
exports.triggerWebhook = triggerWebhook;
const express_1 = require("express");
const uuid_1 = require("uuid");
const apiKey_1 = require("../middleware/apiKey");
const errorHandler_1 = require("../middleware/errorHandler");
exports.webhookRouter = (0, express_1.Router)();
const webhooks = new Map();
const webhookLogs = [];
/**
 * GET /api/v1/webhooks
 * List configured webhooks
 */
exports.webhookRouter.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const apiKey = req.apiKey;
    // Check plan
    if (!(0, apiKey_1.hasFeature)(apiKey.plan, 'webhooks')) {
        throw (0, errorHandler_1.Forbidden)('Webhooks require Business or Enterprise plan. Upgrade at /api/v1/auth/plans');
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
exports.webhookRouter.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const apiKey = req.apiKey;
    if (!(0, apiKey_1.hasFeature)(apiKey.plan, 'webhooks')) {
        throw (0, errorHandler_1.Forbidden)('Webhooks require Business or Enterprise plan');
    }
    const { url, events } = req.body;
    if (!url || !url.startsWith('https://')) {
        throw (0, errorHandler_1.BadRequest)('Webhook URL must use HTTPS');
    }
    const validEvents = ['transfer.created', 'transfer.claimed', 'transfer.cancelled', 'transfer.refunded'];
    const selectedEvents = events?.filter((e) => validEvents.includes(e)) || validEvents;
    const webhook = {
        id: (0, uuid_1.v4)(),
        apiKeyId: apiKey.id,
        url,
        events: selectedEvents,
        secret: `whsec_${(0, uuid_1.v4)().replace(/-/g, '')}`,
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
exports.webhookRouter.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const apiKey = req.apiKey;
    const { id } = req.params;
    const webhook = webhooks.get(id);
    if (!webhook) {
        throw (0, errorHandler_1.NotFound)('Webhook not found');
    }
    if (webhook.apiKeyId !== apiKey.id) {
        throw (0, errorHandler_1.Forbidden)('Not authorized to delete this webhook');
    }
    webhooks.delete(id);
    res.json({ success: true, message: 'Webhook deleted' });
}));
/**
 * PATCH /api/v1/webhooks/:id
 * Update webhook
 */
exports.webhookRouter.patch('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const apiKey = req.apiKey;
    const { id } = req.params;
    const { url, events, isActive } = req.body;
    const webhook = webhooks.get(id);
    if (!webhook) {
        throw (0, errorHandler_1.NotFound)('Webhook not found');
    }
    if (webhook.apiKeyId !== apiKey.id) {
        throw (0, errorHandler_1.Forbidden)('Not authorized to update this webhook');
    }
    if (url) {
        if (!url.startsWith('https://')) {
            throw (0, errorHandler_1.BadRequest)('Webhook URL must use HTTPS');
        }
        webhook.url = url;
    }
    if (events) {
        const validEvents = ['transfer.created', 'transfer.claimed', 'transfer.cancelled', 'transfer.refunded'];
        webhook.events = events.filter((e) => validEvents.includes(e));
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
exports.webhookRouter.post('/:id/test', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const apiKey = req.apiKey;
    const { id } = req.params;
    const webhook = webhooks.get(id);
    if (!webhook) {
        throw (0, errorHandler_1.NotFound)('Webhook not found');
    }
    if (webhook.apiKeyId !== apiKey.id) {
        throw (0, errorHandler_1.Forbidden)('Not authorized');
    }
    // Send test webhook
    const testEvent = {
        id: (0, uuid_1.v4)(),
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
    }
    catch (error) {
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
exports.webhookRouter.get('/info/events', (req, res) => {
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
function generateSignature(payload, secret) {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `t=${timestamp},v1=${signature}`;
}
// Export for use in transfer events
async function triggerWebhook(apiKeyId, event) {
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
            }
            else {
                webhook.failCount++;
            }
        }
        catch (error) {
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
