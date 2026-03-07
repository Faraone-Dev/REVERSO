import { Request, Response, NextFunction } from 'express';
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
}
export declare function errorHandler(err: ApiError, req: Request, res: Response, next: NextFunction): void;
export declare function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => void;
export declare class HttpError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare const BadRequest: (message: string, code?: string) => HttpError;
export declare const Unauthorized: (message?: string, code?: string) => HttpError;
export declare const Forbidden: (message?: string, code?: string) => HttpError;
export declare const NotFound: (message?: string, code?: string) => HttpError;
export declare const TooManyRequests: (message?: string, code?: string) => HttpError;
