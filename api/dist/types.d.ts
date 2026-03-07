export type ApiPlan = 'starter' | 'business' | 'enterprise';
export interface ApiKey {
    id: string;
    key: string;
    hashedKey: string;
    signingSecret: string;
    userId: string;
    plan: ApiPlan;
    txLimit: number;
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
    from?: string;
    to: string;
    amount: string;
    token?: string;
    lockDuration?: number;
    expiry?: number;
    recovery1?: string;
    recovery2?: string;
    memo?: string;
    metadata?: Record<string, any>;
}
export interface TransferResponse {
    id: string;
    onChainTransferId?: number;
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
export declare const PLAN_CONFIG: Record<ApiPlan, {
    price: number;
    txLimit: number;
    webhooks: boolean;
    dashboard: boolean;
    whiteLabel: boolean;
    sla: boolean;
    prioritySupport: boolean;
}>;
export { loadChains, getChain, ChainConfig } from './config/chains';
