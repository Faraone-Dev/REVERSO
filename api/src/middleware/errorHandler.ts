import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('API Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path
  });
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class HttpError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'HttpError';
  }
}

export const BadRequest = (message: string, code = 'BAD_REQUEST') => 
  new HttpError(message, 400, code);

export const Unauthorized = (message: string = 'Unauthorized', code = 'UNAUTHORIZED') => 
  new HttpError(message, 401, code);

export const Forbidden = (message: string = 'Forbidden', code = 'FORBIDDEN') => 
  new HttpError(message, 403, code);

export const NotFound = (message: string = 'Not found', code = 'NOT_FOUND') => 
  new HttpError(message, 404, code);

export const TooManyRequests = (message: string = 'Too many requests', code = 'RATE_LIMITED') => 
  new HttpError(message, 429, code);
