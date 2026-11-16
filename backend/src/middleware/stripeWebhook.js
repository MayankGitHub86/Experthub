/**
 * Stripe Webhook Signature Verification Middleware
 * 
 * Verifies the authenticity of Stripe webhook requests using HMAC-SHA256.
 * 
 * IMPORTANT: This middleware must be applied BEFORE express.json() for this route,
 * so that req.rawBody is available with the exact bytes that Stripe signed.
 * 
 * Security considerations:
 * - Verifies Stripe-Signature header against webhook secret
 * - Preserves exact request body bytes (no re-serialization)
 * - Fails closed if webhook secret is not configured
 * - Never logs sensitive data (secrets, full payloads with PII)
 */

import stripe from 'stripe';
import config from '../config/environment.js';
import { AppError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to verify Stripe webhook signatures
 * 
 * Usage:
 * 1. Add raw-body parser BEFORE this middleware (see app.js setup)
 * 2. Apply this middleware to webhook route
 * 3. Access verified event in req.stripeEvent
 * 
 * Express setup example:
 * ```
 * // Before express.json()
 * app.post('/webhooks/stripe/events',
 *   express.raw({ type: 'application/json' }),
 *   verifyStripeSignature,
 *   stripeWebhookController.handleStripeEvent
 * );
 * ```
 */
export const verifyStripeSignature = (req, res, next) => {
  try {
    // Check webhook secret is configured
    const webhookSecret = config.stripe.webhookSecret;
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured', {
        error: 'Webhook verification impossible; refusing webhook'
      });
      throw new AppError(
        'Webhook configuration missing (no webhook secret)',
        500
      );
    }

    // Get Stripe signature header
    const sig = req.get('stripe-signature');
    if (!sig) {
      logger.warn('Missing Stripe-Signature header', {
        path: req.path,
        ip: req.ip
      });
      throw new AppError('Missing Stripe-Signature header', 400);
    }

    // Get request body
    // req.rawBody must be a Buffer (set by express.raw() middleware)
    let payload;
    if (Buffer.isBuffer(req.body)) {
      // Raw body parser left it as Buffer
      payload = req.body;
    } else if (typeof req.body === 'string') {
      // Fallback: convert string to Buffer
      payload = Buffer.from(req.body);
    } else {
      // Body was already parsed (express.json() ran first - WRONG order)
      logger.error('Request body was pre-parsed before webhook verification', {
        bodyType: typeof req.body,
        error: 'Middleware order is incorrect; raw-body parser must come before verifyStripeSignature'
      });
      throw new AppError(
        'Webhook middleware misconfiguration: body was pre-parsed',
        500
      );
    }

    // Verify signature using Stripe SDK
    // This uses Stripe's official verification method: HMAC-SHA256
    const stripeClient = new stripe(config.stripe.secretKey);
    const event = stripeClient.webhooks.constructEvent(
      payload,
      sig,
      webhookSecret
    );

    // Attach verified event to request
    req.stripeEvent = event;

    logger.info('Stripe webhook signature verified', {
      eventId: event.id,
      eventType: event.type,
      timestamp: event.created
    });

    next();
  } catch (error) {
    // Stripe SDK throws specific errors for verification failures
    if (error.name === 'StripeSignatureVerificationError') {
      logger.warn('Stripe webhook signature verification failed', {
        error: error.message,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        message: 'Webhook signature verification failed'
      });
    }

    // Other errors (config, setup issues)
    if (error.statusCode === 500) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    logger.error('Unexpected error in webhook signature verification', {
      error: error.message,
      stack: error.stack
    });

    res.status(400).json({
      success: false,
      message: 'Webhook verification error'
    });
  }
};

export default verifyStripeSignature;
