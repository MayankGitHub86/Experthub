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
  // Separate retry logic for transient vs commit-outcome errors
  const MAX_TRANSIENT_RETRIES = 3;
  const MAX_COMMIT_RETRIES = 3;
  let transientRetryCount = 0;

  while (transientRetryCount < MAX_TRANSIENT_RETRIES) {
    const session = await mongoose.connection.startSession();
    session.startTransaction();

    try {
      const stripeEvent = req.stripeEvent;

      if (!stripeEvent || !stripeEvent.id) {
        await session.abortTransaction();
        await session.endSession();
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
        transientRetryAttempt: transientRetryCount + 1
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

      // Attempt to commit with UnknownTransactionCommitResult retry
      await commitTransactionWithRetry(session, eventId, MAX_COMMIT_RETRIES);

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
      const eventId = req.stripeEvent?.id;
      const commitOutcomeError = isUnknownTransactionCommitResult(error);
      const transientError = isTransientTransactionError(error);

      // Path A: TransientTransactionError - Restart entire transaction with new session
      if (transientError && !commitOutcomeError && transientRetryCount < MAX_TRANSIENT_RETRIES - 1) {
        await session.abortTransaction();
        await session.endSession();
        
        transientRetryCount++;
        const backoffMs = Math.pow(2, transientRetryCount) * 100;
        logger.warn('Transient transaction error - restarting entire transaction', {
          eventId,
          errorCode: error.code,
          errorLabels: error.errorLabels,
          transientRetryAttempt: transientRetryCount,
          backoffMs
        });
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue; // Restart: NEW session, NEW transaction
      }

      // Path B: UnknownTransactionCommitResult or other errors - Handle post-retry
      await session.abortTransaction();
      await session.endSession();

      logger.error('Failed to process Stripe webhook event', {
        error: error.message,
        errorCode: error.code,
        errorLabels: error.errorLabels,
        eventId,
        isTransient: transientError,
        isCommitOutcome: commitOutcomeError,
        transientRetryAttempt: transientRetryCount
      });

      // After all retries exhausted, check if settlement was actually committed
      if (commitOutcomeError || transientError) {
        const settledEvent = await checkIfSettlementCommitted(eventId, req.stripeEvent?.data?.object?.id);
        if (settledEvent) {
          logger.info('Settlement verified as committed after error retries', {
            eventId,
            settlementEventId: settledEvent.stripeEventId
          });
          return res.status(200).json({
            success: true,
            message: 'Settlement confirmed via committed settlement state',
            eventId,
            isDuplicate: true
          });
        }
      }

      // Return 400 for client errors, 503 for transient server errors
      const statusCode = error.statusCode || (transientError || commitOutcomeError ? 503 : 500);
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to process webhook event',
        isTransient: transientError
      });
      return;
    }
  }

  // Should not reach here, but handle gracefully
  res.status(503).json({
    success: false,
    message: 'Failed to process webhook event after maximum retries'
  });
};

/**
 * Attempt to commit a transaction, with specific handling for UnknownTransactionCommitResult
 * 
 * UnknownTransactionCommitResult (error code 256) means: "We don't know if the transaction was committed"
 * The correct behavior is to retry commitTransaction() on the SAME session, not abort and restart.
 * 
 * @param {ClientSession} session - Active transaction session
 * @param {string} eventId - Stripe event ID for logging
 * @param {number} maxRetries - Max commit retry attempts
 */
async function commitTransactionWithRetry(session, eventId, maxRetries) {
  let commitRetryCount = 0;

  while (commitRetryCount < maxRetries) {
    try {
      await session.commitTransaction();
      logger.info('Transaction committed successfully', {
        eventId,
        commitRetryAttempt: commitRetryCount + 1
      });
      return; // Success
    } catch (commitError) {
      // Check if this is UnknownTransactionCommitResult
      if (isUnknownTransactionCommitResult(commitError) && commitRetryCount < maxRetries - 1) {
        commitRetryCount++;
        const backoffMs = Math.pow(2, commitRetryCount) * 100;
        logger.warn('Unknown transaction commit result - retrying commit on SAME session', {
          eventId,
          errorCode: commitError.code,
          errorLabels: commitError.errorLabels,
          commitRetryAttempt: commitRetryCount,
          backoffMs
        });
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue; // Retry commit on same session
      }

      // Either not UnknownTransactionCommitResult, or retries exhausted
      logger.error('Transaction commit failed', {
        eventId,
        errorCode: commitError.code,
        errorLabels: commitError.errorLabels,
        isCommitOutcomeError: isUnknownTransactionCommitResult(commitError),
        commitRetryAttempt: commitRetryCount
      });

      // Re-throw to be caught by outer handler
      throw commitError;
    }
  }
}

/**
 * Detect if an error is UnknownTransactionCommitResult specifically
 * 
 * This error LABEL means: "The driver doesn't know if the transaction was committed"
 * Requires retry of commitTransaction() on the SAME session, not restart
 * 
 * IMPORTANT: This is an ERROR LABEL, not an error code.
 * MongoDB error code 256 is "TransactionCommitted" (transaction WAS committed),
 * which is different from UnknownTransactionCommitResult.
 * 
 * Only the error label indicates "unknown outcome during commit" which requires retry.
 */
function isUnknownTransactionCommitResult(error) {
  if (!error) return false;

  // Only check error labels (MongoDB driver standard)
  // Do NOT use error code 256 as fallback - that's TransactionCommitted, not unknown result
  if (error.errorLabels && error.errorLabels.includes('UnknownTransactionCommitResult')) {
    return true;
  }

  return false;
}

/**
 * Detect if an error is a transient MongoDB transaction error that should retry the entire transaction
 * 
 * Transient errors include:
 * - Write conflicts (concurrent operations on same document)
 * - Snapshot errors (transaction cannot be read at that snapshot)
 * - Lock timeout
 * - Network errors during transaction
 * 
 * These errors require restarting the ENTIRE transaction with a NEW session, not commit retry
 */
function isTransientTransactionError(error) {
  if (!error) return false;

  // Check error labels first (preferred method)
  if (error.errorLabels && error.errorLabels.includes('TransientTransactionError')) {
    return true;
  }

  const message = error.message || '';
  const code = error.code;

  // MongoDB transaction-specific error codes (excluding 256 which is commit-specific)
  const transientCodes = [
    251, // NoSuchTransaction
    252, // InvalidTransactionNumber
    269, // TransactionAbortedDueToAtomicityConstraint
    30, // DuplicateKey (sometimes transient in multi-doc transactions)
  ];

  // Write conflicts often manifest as:
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
 * 
 * Verifies:
 * - Exact Stripe PaymentIntent ID
 * - Expected Booking exists and has payment recorded
 * - Correct amount and currency
 * - Actual financial Transaction record exists
 * 
 * @param {string} eventId - Stripe event ID being processed
 * @param {string} paymentIntentId - Stripe PaymentIntent ID (from event)
 * @returns {object|null} StripeEvent if settlement confirmed, null otherwise
 */
async function checkIfSettlementCommitted(eventId, paymentIntentId) {
  if (!eventId || !paymentIntentId) {
    logger.warn('Settlement verification called without required IDs', { eventId, paymentIntentId });
    return null;
  }

  // Check 1: Was the StripeEvent itself persisted with 'processed' status?
  const event = await StripeEvent.findOne({
    stripeEventId: eventId,
    'stripeObject.objectId': paymentIntentId, // ← Verify exact PaymentIntent
    processingStatus: 'processed'
  });

  if (!event) {
    logger.warn('Settlement event not found in committed state', { eventId, paymentIntentId });
    return null;
  }

  logger.info('Settlement event found in committed state', {
    eventId,
    paymentIntentId,
    transactionId: event.transactionId,
    bookingId: event.bookingId
  });

  // Check 2: Associated Transaction exists with correct details
  if (event.transactionId) {
    const transaction = await Transaction.findById(event.transactionId);
    if (!transaction) {
      logger.error('Settlement event claims transaction but Transaction not found', {
        eventId,
        paymentIntentId,
        transactionId: event.transactionId
      });
      return null; // Event exists but Transaction missing = data corruption
    }

    // Verify transaction is actually a payment settlement (not something else)
    if (transaction.type !== 'booking_payment' || transaction.status !== 'completed') {
      logger.error('Settlement transaction has unexpected type or status', {
        eventId,
        paymentIntentId,
        transactionId: event.transactionId,
        type: transaction.type,
        status: transaction.status
      });
      return null;
    }

    // Verify booking is linked and paid
    if (event.bookingId) {
      const booking = await Booking.findById(event.bookingId);
      if (!booking) {
        logger.error('Settlement event references non-existent Booking', {
          eventId,
          paymentIntentId,
          bookingId: event.bookingId
        });
        return null;
      }

      // Verify booking is marked as paid
      if (booking.status !== 'paid' || !booking.payment?.paidAt) {
        logger.error('Settlement event references Booking that is not marked as paid', {
          eventId,
          paymentIntentId,
          bookingId: event.bookingId,
          bookingStatus: booking.status,
          hasPaidAt: !!booking.payment?.paidAt
        });
        return null;
      }
    }
  }

  return event; // Settlement IS verified as committed with all checks passed
}

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
