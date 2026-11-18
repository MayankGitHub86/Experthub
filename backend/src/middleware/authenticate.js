import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/environment.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Middleware
 * 
 * Verifies JWT token and attaches user to request object
 */

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development mode, allow a mock dev token for testing
      if (config.isDevelopment) {
        const devToken = req.headers.authorization?.split(' ')[1];
        if (devToken && devToken.startsWith('dev_mock_token_')) {
          // Create a mock user for development
          req.user = {
            _id: 'dev_user_123',
            id: 'dev_user_123',
            email: 'dev@experthub.com',
            firstName: 'Dev',
            lastName: 'User',
            role: 'client',
            status: 'active'
          };
          req.userId = req.user._id;
          logger.info('Development mode: using mock user for payment API', { userId: req.user._id });
          return next();
        }
      }
      
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'No token provided. Please login.',
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Development mode: allow dev_mock_token_* without verification
    if (config.isDevelopment && token.startsWith('dev_mock_token_')) {
      req.user = {
        _id: 'dev_user_123',
        id: 'dev_user_123',
        email: 'dev@experthub.com',
        firstName: 'Dev',
        lastName: 'User',
        role: 'client',
        status: 'active'
      };
      req.userId = req.user._id;
      logger.info('Development mode: using mock user', { userId: req.user._id });
      return next();
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          code: 'TOKEN_EXPIRED',
          message: 'Token expired. Please refresh your token.',
        });
      }
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Invalid token.',
      });
    }
    
    // Check token type
    if (decoded.type !== 'access') {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN_TYPE',
        message: 'Invalid token type.',
      });
    }
    
    // Get user from database
    const user = await User.findById(decoded.sub);
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_INACTIVE',
        message: `Account is ${user.status}.`,
      });
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      status: 'error',
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed.',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      if (decoded.type === 'access') {
        const user = await User.findById(decoded.sub);
        if (user && user.status === 'active') {
          req.user = user;
          req.userId = user._id;
        }
      }
    } catch (error) {
      // Silently fail for optional auth
      logger.debug('Optional auth token invalid:', error.message);
    }
    
    next();
  } catch (error) {
    // Silently fail and continue
    next();
  }
};

export default authenticate;
