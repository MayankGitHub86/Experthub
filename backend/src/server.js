import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/database.js';
import config from './config/environment.js';
import { logger } from './utils/logger.js';
import { authenticate as socketAuth } from './middleware/authenticate.js';
import ReservationUnit from './models/ReservationUnit.js';
import BookingHold from './models/BookingHold.js';
import chatService from './modules/chat/chat.service.js';
import { Conversation, Message } from './models/index.js';

/**
 * Server Entry Point
 * 
 * Starts Express HTTP server and Socket.io WebSocket server
 */

const httpServer = createServer(app);

// ========================================
// Socket.io Setup
// ========================================

const io = new Server(httpServer, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    // Create fake req object for auth middleware
    const fakeReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    
    const fakeRes = {
      status: (code) => ({
        json: (data) => next(new Error(data?.message || `Authentication failed with status ${code}`)),
      }),
    };
    
    // Use our authenticate middleware
    await socketAuth(fakeReq, fakeRes, (error) => {
      if (error) {
        return next(error);
      }
      
      // Attach user to socket
      socket.userId = fakeReq.user._id.toString();
      socket.userRole = fakeReq.user.role;
      socket.user = fakeReq.user;
      
      next();
    });
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  logger.info(`[Socket] Client connected`, {
    socketId: socket.id,
    userId: socket.userId,
    role: socket.userRole,
  });
  
  // Join user's personal room
  socket.join(`user:${socket.userId}`);
  
  // Join conversation room with authorization
  socket.on('join_conversation', async ({ conversationId }) => {
    try {
      // Verify user is participant
      const conversation = await chatService.joinConversation(socket.userId, conversationId);
      
      socket.join(`conversation:${conversationId}`);
      
      logger.info(`[Socket] User joined conversation`, {
        userId: socket.userId,
        conversationId,
      });
      
      socket.to(`conversation:${conversationId}`).emit('user_joined', {
        user: socket.user.firstName + ' ' + socket.user.lastName,
        time: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Socket] Join conversation error:', error);
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle real-time message - PERSIST TO MONGODB
  socket.on('send_message', async ({ conversationId, content, type = 'text' }) => {
    try {
      // Verify user is participant and save message
      const message = await chatService.saveRealTimeMessage(
        conversationId,
        socket.userId,
        content,
        type
      );
      
      // Broadcast to all participants (message already persisted)
      io.to(`conversation:${conversationId}`).emit('receive_message', {
        _id: message._id,
        id: message._id,
        senderId: message.senderId._id,
        sender: message.senderId,
        senderName: message.senderId.firstName + ' ' + message.senderId.lastName,
        content: message.content,
        type: message.type,
        timestamp: message.createdAt,
        deliveryStatus: 'sent',
      });
      
      logger.info('[Socket] Message sent and persisted', {
        conversationId,
        messageId: message._id,
        userId: socket.userId,
      });
    } catch (error) {
      logger.error('[Socket] Send message error:', error);
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle typing indicators
  socket.on('typing', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('user_typing', { 
      user: socket.user.firstName + ' ' + socket.user.lastName,
    });
  });
  
  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('user_stop_typing', { 
      user: socket.user.firstName + ' ' + socket.user.lastName,
    });
  });
  
  // Handle mark as read
  socket.on('mark_read', async ({ conversationId }) => {
    try {
      const result = await chatService.markConversationRead(conversationId, socket.userId);
      
      logger.info('[Socket] Marked as read', {
        conversationId,
        userId: socket.userId,
        count: result.count,
      });
    } catch (error) {
      logger.error('[Socket] Mark as read error:', error);
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`[Socket] Client disconnected`, {
      socketId: socket.id,
      userId: socket.userId,
    });
  });
});

// ========================================
// Background Job Scheduler
// ========================================

/**
 * Start expiration cleanup scheduler
 * Runs every 30 seconds to cleanup expired holds and reservation units
 */
const startCleanupScheduler = () => {
  const CLEANUP_INTERVAL = 30 * 1000; // 30 seconds
  
  logger.info('🧹 Starting expiration cleanup scheduler');
  
  setInterval(async () => {
    try {
      // Clean up expired reservation units (transitions held → released)
      const unitsReleased = await ReservationUnit.cleanupExpired();
      
      // Clean up expired booking holds (transitions active → expired)
      const holdsExpired = await BookingHold.cleanupExpired();
      
      if (unitsReleased > 0 || holdsExpired > 0) {
        logger.debug('🧹 Expiration cleanup executed', {
          unitsReleased,
          holdsExpired,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('❌ Expiration cleanup error:', {
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      // Continue running despite errors
    }
  }, CLEANUP_INTERVAL);
  
  logger.info(`✅ Cleanup scheduler active: every ${CLEANUP_INTERVAL / 1000} seconds`);
};

// ========================================
// Server Startup
// ========================================

const PORT = config.port;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start cleanup scheduler
    startCleanupScheduler();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`, {
        environment: config.env,
        port: PORT,
        baseUrl: config.baseUrl,
      });
      logger.info(`📋 Health check: ${config.baseUrl}/health`);
      logger.info(`🔐 Auth API: ${config.baseUrl}/api/v1/auth`);
    });
  } catch (error) {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export { io, httpServer };
