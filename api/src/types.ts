// API Plan types
export type ApiPlan = 'starter' | 'business' | 'enterprise';

export interface ApiKey {
  id: string;
  key: string;
  hashedKey: string;
  signingSecret: string; // used for HMAC on requests
  userId: string;
  plan: ApiPlan;
  txLimit: number; // -1 = unlimited
  txUsed: number;
  webhookUrl?: string;
  allowedOrigins: string[];
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  hashedPassword: string;
  company?: string;
  plan: ApiPlan;
  apiKeys: string[];
  createdAt: Date;
  stripeCustomerId?: string;
}

export interface TransferRequest {
  chainId: number;
  from?: string; // sender wallet
  to: string;    // recipient address
  amount: string; // in wei or token units
  token?: string; // ERC20 address, empty = ETH
  lockDuration?: number; // seconds (optional, default 24h)
  expiry?: number;       // seconds after unlock (optional, default 30d)
  recovery1?: string;    // optional recovery address 1
  recovery2?: string;    // optional recovery address 2
  memo?: string;         // optional memo string
  metadata?: Record<string, any>; // custom data
}

export interface TransferResponse {
  id: string;
  chainId: number;
  txHash?: string;
  status: 'pending' | 'submitted' | 'locked' | 'claimed' | 'cancelled' | 'refunded';
  from: string;
  to: string;
  amount: string;
  token: string;
  fee: string;
  insurance?: {
    active: boolean;
    premium: string;
  };
  lockDuration: number;
  expiresAt: number;
  createdAt: Date;
  metadata?: Record<string, any>;
  memo?: string;
}

export interface WebhookEvent {
  id: string;
  type: 'transfer.created' | 'transfer.claimed' | 'transfer.cancelled' | 'transfer.refunded';
  data: TransferResponse;
  createdAt: Date;
}

export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

// Plan configuration
export const PLAN_CONFIG: Record<ApiPlan, {
  price: number;
  txLimit: number;
  webhooks: boolean;
  dashboard: boolean;
  whiteLabel: boolean;
  sla: boolean;
  prioritySupport: boolean;
}> = {
  starter: {
    price: 99,
    txLimit: 100,
    webhooks: false,
    dashboard: false,
    whiteLabel: false,
    sla: false,
    prioritySupport: false
  },
  business: {
    price: 499,
    txLimit: -1, // unlimited
    webhooks: true,
    dashboard: true,
    whiteLabel: false,
    sla: false,
    prioritySupport: true
  },
  enterprise: {
    price: 2000,
    txLimit: -1, // unlimited
    webhooks: true,
    dashboard: true,
    whiteLabel: true,
    sla: true,
    prioritySupport: true
  }
};

// Supported chains
// Chains are now loaded dynamically from config/chains.json
export { loadChains, getChain, ChainConfig } from './config/chains';
