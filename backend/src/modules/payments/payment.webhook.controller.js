/**
 * Payment Webhook Controller
 * 
 * Handles Stripe webhook events for payment processing.
 * Signature verification is performed in middleware before this controller is invoked.
 * 
 * This controller:
 * - Persists Stripe event ID for idempotency
 * - Routes events to appropriate handlers
 * - Manages database transactions
 * - Returns appropriate HTTP responses
 */

import mongoose from 'mongoose';
import paymentService from './payment.service.js';
import StripeEvent from '../../models/StripeEvent.js';
import Booking from '../../models/Booking.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

/**
 * @route   POST /webhooks/stripe/events
 * @desc    Handle incoming Stripe webhook events
 * @access  Public (Signature verification required)
 * 
 * @param {Request} req - Express request with verified Stripe event in req.stripeEvent
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
export const handleStripeEvent = async (req, res, next) => {
  const session = await mongoose.connection.startSession();
  session.startTransaction();

  try {
    const stripeEvent = req.stripeEvent;

    if (!stripeEvent || !stripeEvent.id) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid Stripe event structure'
      });
    }

    const { id: eventId, type: eventType, data } = stripeEvent;

    logger.info('Stripe webhook event received', {
      eventId,
      eventType,
      objectType: data?.object?.object
    });

    // Check if this event has already been processed (idempotency)
    const existingEvent = await StripeEvent.findOne(
      { stripeEventId: eventId },
      {},
      { session }
    );

    if (existingEvent && existingEvent.processingStatus === 'processed') {
      logger.warn('Duplicate webhook event detected', { eventId });
      await session.abortTransaction();
      return res.status(200).json({
        success: true,
        message: 'Duplicate event - already processed',
        eventId,
        isDuplicate: true
      });
    }

    // Persist the event record
    const eventRecord = new StripeEvent({
      stripeEventId: eventId,
      eventType,
      stripeObject: {
        objectId: data?.object?.id,
        objectType: data?.object?.object
      },
      processingStatus: 'processing',
      rawEventData: stripeEvent,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    await eventRecord.save({ session });

    // Route to appropriate handler based on event type
    let result;
    switch (eventType) {
      case 'payment_intent.succeeded':
        result = await handlePaymentIntentSucceeded(
          data.object,
          eventRecord,
          session
        );
        break;

      case 'payment_intent.payment_failed':
        result = await handlePaymentIntentFailed(
          data.object,
          eventRecord,
          session
        );
        break;

      case 'charge.refunded':
        result = await handleChargeRefunded(
          data.object,
          eventRecord,
          session
        );
        break;

      // Unsupported event types are acknowledged without changing payment state
      default:
        logger.info('Unsupported Stripe event type - acknowledged without processing', {
          eventType,
          eventId
        });
        result = { acknowledged: true };
    }

    // Update event record with result
    eventRecord.processingStatus = 'processed';
    eventRecord.processedAt = new Date();
    if (result.transactionId) {
      eventRecord.transactionId = result.transactionId;
    }
    if (result.bookingId) {
      eventRecord.bookingId = result.bookingId;
    }
    await eventRecord.save({ session });

    // Commit transaction
    await session.commitTransaction();

    logger.info('Stripe webhook event processed successfully', {
      eventId,
      eventType,
      result: result.acknowledged ? 'acknowledged' : 'processed'
    });

    res.status(200).json({
      success: true,
      message: 'Event processed successfully',
      eventId,
      ...result
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Failed to process Stripe webhook event', {
      error: error.message,
      stack: error.stack
    });

    // Return 400 for client errors, 500 for server errors
    // Stripe will retry 5xx errors automatically
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to process webhook event'
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Handle payment_intent.succeeded event
 * 
 * This is the authoritative event that marks a payment as successful.
 * Only one financial settlement per PaymentIntent should occur.
 */
async function handlePaymentIntentSucceeded(paymentIntent, eventRecord, session) {
  const paymentIntentId = paymentIntent.id;

  logger.info('Processing payment_intent.succeeded', { paymentIntentId });

  // Check if this specific PaymentIntent has already been settled
  const existingTransaction = await StripeEvent.findOne(
    {
      'stripeObject.objectId': paymentIntentId,
      eventType: 'payment_intent.succeeded',
      processingStatus: 'processed'
    },
    {},
    { session }
  );

  if (existingTransaction) {
    logger.warn('PaymentIntent already settled by previous event', {
      paymentIntentId
    });
    return {
      acknowledged: true,
      isDuplicate: true
    };
  }

  // Use PaymentService to handle the business logic
  const result = await paymentService.confirmPaymentFromWebhook(
    paymentIntent,
    session
  );

  return {
    transactionId: result.transaction._id,
    bookingId: result.booking._id
  };
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent, eventRecord, session) {
  const paymentIntentId = paymentIntent.id;

  logger.warn('Processing payment_intent.payment_failed', {
    paymentIntentId,
    lastPaymentError: paymentIntent.last_payment_error
  });

  // Do not mark booking as failed; payment will remain pending
  // Client can retry with a new PaymentIntent
  return { acknowledged: true };
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(charge, eventRecord, session) {
  logger.info('Processing charge.refunded', {
    chargeId: charge.id,
    refundAmount: charge.amount_refunded
  });

  // Refund processing would be implemented here
  // For now, acknowledge the event
  return { acknowledged: true };
}

export default {
  handleStripeEvent
};
