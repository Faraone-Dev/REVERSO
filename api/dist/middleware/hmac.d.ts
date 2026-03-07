import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './apiKey';
export declare function hmacMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
