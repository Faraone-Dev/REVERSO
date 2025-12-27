import { Router, Response } from 'express';
import { AuthenticatedRequest, hasFeature } from '../middleware/apiKey';
import { asyncHandler, Forbidden } from '../middleware/errorHandler';
import { PLAN_CONFIG } from '../types';
import { loadChains } from '../config/chains';

export const adminRouter = Router();

/**
 * GET /api/v1/admin/usage
 * Get API usage statistics
 */
adminRouter.get('/usage', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;

  // Check plan for dashboard access
  if (!hasFeature(apiKey.plan, 'dashboard')) {
    throw Forbidden('Dashboard requires Business or Enterprise plan');
  }

  const planConfig = PLAN_CONFIG[apiKey.plan];

  res.json({
    usage: {
      plan: apiKey.plan,
      txUsed: apiKey.txUsed,
      txLimit: planConfig.txLimit === -1 ? 'Unlimited' : planConfig.txLimit,
      txRemaining: planConfig.txLimit === -1 ? 'Unlimited' : planConfig.txLimit - apiKey.txUsed,
      periodStart: new Date(new Date().setDate(1)).toISOString(), // 1st of month
      periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
    },
    features: {
      webhooks: planConfig.webhooks,
      dashboard: planConfig.dashboard,
      whiteLabel: planConfig.whiteLabel,
      sla: planConfig.sla,
      prioritySupport: planConfig.prioritySupport
    },
    apiKey: {
      id: apiKey.id,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      isActive: apiKey.isActive
    }
  });
}));

/**
 * GET /api/v1/admin/stats
 * Get transfer statistics (Enterprise only)
 */
adminRouter.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;

  if (apiKey.plan !== 'enterprise') {
    throw Forbidden('Statistics require Enterprise plan');
  }

  // Minimal real-time-ish stats placeholder (would come from DB/metrics)
  const CHAINS = loadChains();
  res.json({
    stats: {
      totalTransfers: apiKey.txUsed,
      successRate: 'n/a (mock)',
      avgLockTime: 'n/a (mock)',
      byStatus: {
        claimed: 0,
        cancelled: 0,
        refunded: 0,
        pending: 0
      },
      byChain: Object.fromEntries(Object.values(CHAINS).map((c) => [c.name, 0])),
      insurance: {
        premiumsCollected: 'n/a',
        claimsPaid: 'n/a',
        activePolicies: 0
      }
    },
    period: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    }
  });
}));

/**
 * GET /api/v1/admin/branding
 * Get white-label configuration (Enterprise only)
 */
adminRouter.get('/branding', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;

  if (!hasFeature(apiKey.plan, 'whiteLabel')) {
    throw Forbidden('White-label requires Enterprise plan');
  }

  res.json({
    branding: {
      enabled: true,
      companyName: 'Your Company',
      logo: null,
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      domain: null,
      supportEmail: 'support@yourcompany.com'
    },
    customization: {
      hideReversoLogo: true,
      customEmailTemplates: true,
      customLandingPage: true,
      customDomain: true
    }
  });
}));

/**
 * PUT /api/v1/admin/branding
 * Update white-label configuration (Enterprise only)
 */
adminRouter.put('/branding', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;

  if (!hasFeature(apiKey.plan, 'whiteLabel')) {
    throw Forbidden('White-label requires Enterprise plan');
  }

  const { companyName, logo, primaryColor, secondaryColor, domain, supportEmail } = req.body;

  // In production, save to database
  res.json({
    success: true,
    message: 'Branding updated successfully',
    branding: {
      companyName,
      logo,
      primaryColor,
      secondaryColor,
      domain,
      supportEmail
    }
  });
}));

/**
 * GET /api/v1/admin/sla
 * Get SLA status (Enterprise only)
 */
adminRouter.get('/sla', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;

  if (!hasFeature(apiKey.plan, 'sla')) {
    throw Forbidden('SLA reporting requires Enterprise plan');
  }

  res.json({
    sla: {
      uptime: {
        target: '99.9%',
        current: '99.97%',
        status: 'compliant'
      },
      responseTime: {
        target: '200ms',
        current: '45ms',
        status: 'compliant'
      },
      support: {
        target: '1 hour',
        avgResponse: '23 minutes',
        status: 'compliant'
      },
      incidents: {
        last30Days: 0,
        lastIncident: null
      }
    },
    credits: {
      available: 0,
      reason: 'No SLA violations'
    }
  });
}));

/**
 * POST /api/v1/admin/support
 * Create support ticket (Priority for Business/Enterprise)
 */
adminRouter.post('/support', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;
  const { subject, message, priority = 'normal' } = req.body;

  const isPriority = hasFeature(apiKey.plan, 'prioritySupport');

  // In production, create ticket in support system
  res.json({
    success: true,
    ticket: {
      id: `TKT-${Date.now()}`,
      subject,
      message,
      priority: isPriority ? 'high' : priority,
      status: 'open',
      createdAt: new Date().toISOString(),
      expectedResponse: isPriority ? '1 hour' : '24 hours'
    },
    message: isPriority 
      ? '🚀 Priority ticket created. Our team will respond within 1 hour.'
      : 'Ticket created. We will respond within 24 hours.'
  });
}));

/**
 * GET /api/v1/admin/export
 * Export transfer data (Business/Enterprise)
 */
adminRouter.get('/export', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;

  if (!hasFeature(apiKey.plan, 'dashboard')) {
    throw Forbidden('Data export requires Business or Enterprise plan');
  }

  const { format = 'json', startDate, endDate } = req.query;

  // In production, generate export from database
  res.json({
    success: true,
    export: {
      format,
      dateRange: {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString()
      },
      downloadUrl: `/api/v1/admin/export/download?token=${Date.now()}`,
      expiresIn: '1 hour'
    }
  });
}));
