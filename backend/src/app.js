import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/environment.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import expertRoutes from './modules/experts/expert.routes.js';
import serviceRoutes from './modules/services/service.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';

// Import legacy routes (to be refactored)
import aiRoutes from '../routes/ai.js';
import paymentRoutes from '../routes/payments.js';
import chatRoutes from '../routes/chat.js';

/**
 * Express Application Setup
 * 
 * Configures middleware, security, and routes
 */

const app = express();

// ========================================
// Security Middleware
// ========================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some resources
}));

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ========================================
// Parsing Middleware
// ========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ========================================
// Request Logging
// ========================================

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// ========================================
// Health Check
// ========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ExpertHub API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// ========================================
// API Routes
// ========================================

// V1 API
// Skip rate limiting in test environment
const authMiddleware = config.env === 'test' ? [] : [authLimiter];
const apiMiddleware = config.env === 'test' ? [] : [apiLimiter];

app.use('/api/v1/auth', ...authMiddleware, authRoutes);
app.use('/api/v1/experts', ...apiMiddleware, expertRoutes);
app.use('/api/v1/services', ...apiMiddleware, serviceRoutes);
app.use('/api/v1', ...apiMiddleware, availabilityRoutes);
app.use('/api/v1/bookings', ...apiMiddleware, bookingRoutes);

// Legacy routes (to be refactored into modules)
app.use('/api/ai', ...authMiddleware, aiRoutes);
app.use('/api/payments', ...apiMiddleware, paymentRoutes);
app.use('/api/chat', ...apiMiddleware, chatRoutes);

// Webhooks (no rate limiting for external services)
app.use('/webhooks', chatRoutes);

// ========================================
// Error Handling
// ========================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
