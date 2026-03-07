import { Request, Response, NextFunction } from 'express';
import { ApiKey, ApiPlan, PLAN_CONFIG } from '../types';
export interface AuthenticatedRequest extends Request {
    apiKey?: ApiKey;
}
/**
 * API Key middleware - validates and tracks usage
 */
export declare function apiKeyMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Increment transaction counter for API key
 */
export declare function incrementTxCount(apiKeyId: string): void;
/**
 * Create new API key
 */
export declare function createApiKey(userId: string, plan: ApiPlan, webhookUrl?: string, allowedOrigins?: string[]): Promise<ApiKey>;
/**
 * Get API key by ID
 */
export declare function getApiKey(id: string): ApiKey | undefined;
/**
 * Revoke API key
 */
export declare function revokeApiKey(id: string): boolean;
/**
 * Check if plan has feature
 */
export declare function hasFeature(plan: ApiPlan, feature: keyof typeof PLAN_CONFIG.starter): boolean;
