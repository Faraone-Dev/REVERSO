import { WebhookEvent } from '../types';
export declare const webhookRouter: import("express-serve-static-core").Router;
export declare function triggerWebhook(apiKeyId: string, event: WebhookEvent): Promise<void>;
