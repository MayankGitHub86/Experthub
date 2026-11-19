import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/environment.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { verifyStripeSignature } from './middleware/stripeWebhook.js';
import { handleStripeEvent } from './modules/payments/payment.webhook.controller.js';
import { isConnected } from './config/database.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import expertRoutes from './modules/experts/expert.routes.js';
import serviceRoutes from './modules/services/service.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import chatModuleRoutes from './modules/chat/chat.routes.js';
import paymentModuleRoutes from './modules/payments/payment.routes.js';
import userRoutes from './modules/users/user.routes.js';

// Import legacy routes (to be refactored)
import aiRoutes from '../routes/ai.js';
import chatLegacyRoutes from '../routes/chat.js';

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
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin requests from frontend
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

// IMPORTANT: Stripe webhook endpoint must use raw body for signature verification
// Register BEFORE express.json() so that Stripe-Signature verification middleware can access raw bytes
app.post(
  '/webhooks/stripe/events',
  express.raw({ type: 'application/json', limit: '10mb' }),
  verifyStripeSignature,
  handleStripeEvent
);

// General JSON and URL-encoded body parsing for other routes
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
    database: isConnected() ? 'connected' : 'disconnected',
  });
});

app.get('/ready', (req, res) => {
  const ready = isConnected();
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    database: ready ? 'connected' : 'disconnected',
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
app.use('/api/v1/bookings', ...apiMiddleware, bookingRoutes);
app.use('/api/v1/chat', ...apiMiddleware, chatModuleRoutes);
app.use('/api/v1/payments', ...apiMiddleware, paymentModuleRoutes);
app.use('/api/v1/users', ...apiMiddleware, userRoutes);

// Legacy routes (to be refactored into modules)
app.use('/api/ai', ...authMiddleware, aiRoutes);
app.use('/api/chat', ...apiMiddleware, chatLegacyRoutes);

// Webhooks (no rate limiting for external services)
app.use('/webhooks', chatLegacyRoutes);

// ========================================
// Error Handling
// ========================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
