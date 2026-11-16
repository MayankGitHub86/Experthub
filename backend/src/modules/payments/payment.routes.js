/**
 * Payment Routes
 * 
 * Base path: /api/v1/payments
 */

import express from 'express';
import {
  createPaymentIntent,
  getPaymentStatus,
  refundPayment
} from './payment.controller.js';
import { handleStripeEvent } from './payment.webhook.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { isAdmin } from '../../middleware/authorize.js';

const router = express.Router();

/**
 * Protected Routes (Authenticated Users)
 */

// Create payment intent for booking
router.post(
  '/create-intent',
  authenticate,
  createPaymentIntent
);

// Get payment status
router.get(
  '/:paymentIntentId/status',
  authenticate,
  getPaymentStatus
);

/**
 * Admin Routes
 */

// Refund a payment
router.post(
  '/:bookingId/refund',
  authenticate,
  isAdmin,
  refundPayment
);

export default router;
