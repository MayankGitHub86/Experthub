import { logger } from '../utils/logger.js';
import config from '../config/environment.js';

/**
 * Global Error Handler Middleware
 * 
 * Centralized error handling with consistent response format
 */

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;
  
  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id,
  });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors,
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      status: 'error',
      code: 'DUPLICATE_ERROR',
      message: `${field} already exists`,
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_ID',
      message: 'Invalid resource ID',
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid token',
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      code: 'TOKEN_EXPIRED',
      message: 'Token expired',
    });
  }
  
  // Default error response
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Something went wrong';
  
  // Format based on endpoint (booking endpoints use success: false, others use status: error)
  const isBookingEndpoint = req.path && req.path.includes('/bookings');
  
  if (isBookingEndpoint) {
    return res.status(statusCode).json({
      success: false,
      message,
      code,
      ...(config.isDevelopment && { stack: error.stack }),
    });
  }
  
  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    ...(config.isDevelopment && { stack: error.stack }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { AppError };
export default errorHandler;
