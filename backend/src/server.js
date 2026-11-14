import { createServer } from 'http';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/database.js';
import config from './config/environment.js';
import { logger } from './utils/logger.js';
import { authenticate as socketAuth } from './middleware/authenticate.js';
import ReservationUnit from './models/ReservationUnit.js';
import BookingHold from './models/BookingHold.js';

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
    
    const fakeRes = {};
    
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
  
  // Join consultation room with authorization
  socket.on('join_room', async ({ roomId }) => {
    try {
      // TODO: Verify user has access to this room (check booking)
      // For now, basic check
      if (!roomId) {
        return socket.emit('error', { message: 'Room ID required' });
      }
      
      socket.join(roomId);
      logger.info(`[Socket] User joined room`, {
        userId: socket.userId,
        roomId,
      });
      
      socket.to(roomId).emit('user_joined', {
        user: { name: socket.user.name, role: socket.userRole },
        time: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Socket] Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Handle message sending
  socket.on('send_message', ({ roomId, message }) => {
    try {
      const enrichedMessage = {
        id: Date.now() + Math.random(),
        senderId: socket.userId,
        senderName: socket.user.name,
        ...message,
        timestamp: new Date().toISOString(),
      };
      
      // TODO: Save message to database
      
      // Broadcast to room
      io.to(roomId).emit('receive_message', enrichedMessage);
      
      logger.debug('[Socket] Message sent', {
        roomId,
        userId: socket.userId,
      });
    } catch (error) {
      logger.error('[Socket] Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Typing indicators
  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('user_typing', { user: socket.user.name });
  });
  
  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('user_stop_typing', { user: socket.user.name });
  });
  
  // WebRTC signaling
  socket.on('webrtc_signal', ({ roomId, signal }) => {
    socket.to(roomId).emit('webrtc_signal', {
      signal,
      sender: socket.userId,
    });
  });
  
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
