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
import Transaction from '../../models/Transaction.js';
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
  // Retry logic for transient transaction errors
  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
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
        objectType: data?.object?.object,
        retryAttempt: retryCount + 1
      });

      // Check if this event has already been processed (idempotency)
      const existingEvent = await StripeEvent.findOne(
        { stripeEventId: eventId },
        {},
        { session }
      );

      if (existingEvent && existingEvent.processingStatus === 'processed') {
        logger.warn('Duplicate webhook event detected', { eventId });
        await session.commitTransaction();
        await session.endSession();
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

      await session.endSession();
      
      res.status(200).json({
        success: true,
        message: 'Event processed successfully',
        eventId,
        ...result
      });
      return; // Success - exit retry loop

    } catch (error) {
      await session.abortTransaction();
      await session.endSession();

      const isTransientError = isTransientTransactionError(error);
      const eventId = req.stripeEvent?.id;

      if (isTransientError && retryCount < MAX_RETRIES - 1) {
        retryCount++;
        const backoffMs = Math.pow(2, retryCount) * 100; // Exponential backoff: 200ms, 400ms, 800ms
        logger.warn('Transient transaction error - retrying', {
          eventId,
          errorCode: error.code,
          retryAttempt: retryCount,
          backoffMs
        });
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue; // Retry the transaction
      }

      // Either not a transient error, or retries exhausted
      logger.error('Failed to process Stripe webhook event', {
        error: error.message,
        errorCode: error.code,
        isTransient: isTransientError,
        eventId,
        retryAttempt: retryCount
      });

      // If transient error after max retries, check if settlement was actually committed
      if (isTransientError) {
        const settledEvent = await checkIfSettlementCommitted(eventId);
        if (settledEvent) {
          logger.info('Settlement verified as committed after transient errors', {
            eventId,
            settlementEventId: settledEvent.stripeEventId
          });
          return res.status(200).json({
            success: true,
            message: 'Settlement confirmed via committed settlement state (after transient errors)',
            eventId,
            isDuplicate: true
          });
        }
      }

      // Return 400 for client errors, 503 for transient server errors (triggers Stripe retry)
      const statusCode = error.statusCode || (isTransientError ? 503 : 500);
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to process webhook event',
        isTransient: isTransientError
      });
      return;
    }
  }
};

/**
 * Detect if an error is a transient MongoDB transaction error that should be retried
 * 
 * Transient errors include:
 * - Write conflicts (concurrent operations on same document)
 * - Snapshot errors (transaction cannot be read at that snapshot)
 * - Lock timeout
 * - Network errors during transaction
 */
function isTransientTransactionError(error) {
  if (!error) return false;

  const message = error.message || '';
  const code = error.code;

  // MongoDB transaction-specific error codes
  const transientCodes = [
    251, // NoSuchTransaction
    252, // InvalidTransactionNumber
    256, // UnknownTransactionCommitResult
    269, // TransactionAbortedDueToAtomicityConstraint
    30, // DuplicateKey (sometimes transient in multi-doc transactions)
  ];

  // Write conflicts often manifest as:
  // - "Write conflict"
  // - "WriteConflict"
  // - "WriteConflict during replicated write to *"
  const transientMessages = [
    'Write conflict',
    'WriteConflict',
    'Snapshot read at time',
    'SnapshotUnavailable',
    'Timestamp in the past',
    'read concern snapshot'
  ];

  if (transientCodes.includes(code)) {
    return true;
  }

  for (const transientMsg of transientMessages) {
    if (message.includes(transientMsg)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a settlement event was actually committed to the database
 * Call this OUTSIDE a transaction context to verify committed state
 */
async function checkIfSettlementCommitted(eventId) {
  if (!eventId) return null;

  // Check 1: Was the StripeEvent itself persisted with 'processed' status?
  const event = await StripeEvent.findOne({
    stripeEventId: eventId,
    processingStatus: 'processed'
  });

  if (!event) {
    logger.warn('Settlement event not found in committed state', { eventId });
    return null;
  }

  logger.info('Settlement event found in committed state', {
    eventId,
    transactionId: event.transactionId,
    bookingId: event.bookingId
  });

  // Additional verification: Check if the Transaction was actually created
  if (event.transactionId) {
    const transaction = await Transaction.findById(event.transactionId);
    if (!transaction) {
      logger.error('Settlement event claims transaction but Transaction not found', {
        eventId,
        transactionId: event.transactionId
      });
      return null; // Event exists but Transaction missing = data corruption
    }
  }

  return event;
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
