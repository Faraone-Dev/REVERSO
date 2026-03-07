"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TooManyRequests = exports.NotFound = exports.Forbidden = exports.Unauthorized = exports.BadRequest = exports.HttpError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
function errorHandler(err, req, res, next) {
    console.error('API Error:', err);
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : (err.message || 'Internal server error');
    const code = err.code || 'INTERNAL_ERROR';
    const response = {
        error: message,
        code,
        timestamp: new Date().toISOString()
    };
    if (process.env.NODE_ENV !== 'production') {
        response.path = req.path;
    }
    res.status(statusCode).json(response);
}
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
class HttpError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code = 'ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'HttpError';
    }
}
exports.HttpError = HttpError;
const BadRequest = (message, code = 'BAD_REQUEST') => new HttpError(message, 400, code);
exports.BadRequest = BadRequest;
const Unauthorized = (message = 'Unauthorized', code = 'UNAUTHORIZED') => new HttpError(message, 401, code);
exports.Unauthorized = Unauthorized;
const Forbidden = (message = 'Forbidden', code = 'FORBIDDEN') => new HttpError(message, 403, code);
exports.Forbidden = Forbidden;
const NotFound = (message = 'Not found', code = 'NOT_FOUND') => new HttpError(message, 404, code);
exports.NotFound = NotFound;
const TooManyRequests = (message = 'Too many requests', code = 'RATE_LIMITED') => new HttpError(message, 429, code);
exports.TooManyRequests = TooManyRequests;
