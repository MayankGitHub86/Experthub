import rateLimit from 'express-rate-limit';
import config from '../config/environment.js';

/**
 * Rate Limiting Middleware
 * 
 * Protects against brute force attacks and API abuse
 */

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    status: 'error',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict limiter for auth endpoints
 * 5 attempts per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: {
    status: 'error',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * File upload limiter
 * 10 uploads per 15 minutes
 */
export const uploadLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 10,
  message: {
    status: 'error',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    message: 'Too many uploads, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  apiLimiter,
  authLimiter,
  uploadLimiter,
};
