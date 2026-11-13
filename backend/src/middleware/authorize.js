import { logger } from '../utils/logger.js';

/**
 * Authorization Middleware
 * 
 * Role-based access control and resource-level permissions
 */

/**
 * Check if user has required role(s)
 * @param {string|string[]} roles - Required role(s)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }
    
    // Convert single role to array
    const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource.',
      });
    }
    
    next();
  };
};

/**
 * Check if user is admin
 */
export const isAdmin = authorize('admin');

/**
 * Check if user is expert
 */
export const isExpert = authorize('expert');

/**
 * Check if user is client
 */
export const isClient = authorize('client');

/**
 * Check if user is admin or support
 */
export const isAdminOrSupport = authorize('admin', 'support');

/**
 * Check if user owns the resource
 * Compares user ID with resource owner ID in req.params or req.body
 */
export const isOwner = (ownerField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }
    
    // Get owner ID from params or body
    const ownerId = req.params[ownerField] || req.body[ownerField] || req.resource?.[ownerField];
    
    if (!ownerId) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'Resource owner not specified.',
      });
    }
    
    // Check if user owns the resource or is admin
    if (req.user._id.toString() !== ownerId.toString() && req.user.role !== 'admin') {
      logger.warn('Ownership check failed', {
        userId: req.user._id,
        ownerId,
        path: req.path,
      });
      
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource.',
      });
    }
    
    next();
  };
};

/**
 * Check if user can access booking
 * User must be client, expert, or admin
 */
export const canAccessBooking = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
  }
  
  // Admin can access all bookings
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Check if booking exists in req (should be loaded by previous middleware)
  if (!req.booking) {
    return res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: 'Booking not found.',
    });
  }
  
  // Check if user is client or expert for this booking
  const isClient = req.booking.clientId?.toString() === req.user._id.toString();
  const isExpert = req.booking.expertId?.toString() === req.user._id.toString();
  
  if (!isClient && !isExpert) {
    logger.warn('Booking access denied', {
      userId: req.user._id,
      bookingId: req.booking._id,
      path: req.path,
    });
    
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this booking.',
    });
  }
  
  next();
};

/**
 * Check if user can access conversation
 * User must be participant or admin
 */
export const canAccessConversation = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
  }
  
  // Admin can access all conversations
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Check if conversation exists in req
  if (!req.conversation) {
    return res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: 'Conversation not found.',
    });
  }
  
  // Check if user is participant
  const isParticipant = 
    req.conversation.clientId?.toString() === req.user._id.toString() ||
    req.conversation.expertId?.toString() === req.user._id.toString();
  
  if (!isParticipant) {
    logger.warn('Conversation access denied', {
      userId: req.user._id,
      conversationId: req.conversation._id,
      path: req.path,
    });
    
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this conversation.',
    });
  }
  
  next();
};

export default authorize;
