/**
 * StripeEvent Model
 * 
 * Tracks Stripe webhook events to ensure idempotent processing.
 * Each Stripe event.id is globally unique and is the authoritative deduplication key.
 * 
 * Additionally tracks the underlying object (PaymentIntent, Charge, etc.) to detect
 * when multiple distinct events represent the same underlying payment activity.
 */

import mongoose from 'mongoose';

const stripeEventSchema = new mongoose.Schema({
  // Stripe Event Identifier (unique per Stripe webhook delivery)
  stripeEventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Event Type
  eventType: {
    type: String,
    required: true,
    enum: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'charge.succeeded',
      'charge.failed',
      'charge.refunded'
    ],
    index: true
  },

  // Underlying Stripe Object
  stripeObject: {
    // The underlying object ID (e.g., PaymentIntent ID, Charge ID)
    objectId: {
      type: String,
      required: true,
      index: true
    },
    // Object type (e.g., 'payment_intent', 'charge')
    objectType: {
      type: String,
      required: true,
      enum: ['payment_intent', 'charge', 'customer', 'refund', 'transfer']
    }
  },

  // Local Booking Reference
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    index: true
  },

  // Processing Status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'processed', 'failed'],
    default: 'pending',
    index: true
  },

  // Processing Result
  processedAt: Date,
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },

  // Failure Details
  failureReason: String,
  failureCode: String,
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: Date,

  // Raw Event Data (for debugging and reconciliation)
  rawEventData: {
    type: mongoose.Schema.Types.Mixed,
    // Store the full Stripe event object for reference
    default: {}
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    processingDurationMs: Number,
    isRetry: {
      type: Boolean,
      default: false
    }
  }

}, {
  timestamps: true,
  // Automatically delete after 90 days for processed events (optional cleanup)
  // expireAfterSeconds will be set on index if retention policy desired
});

// Compound index: Ensure idempotency on distinct events for same PaymentIntent
stripeEventSchema.index({
  'stripeObject.objectId': 1,
  'stripeObject.objectType': 1,
  eventType: 1
}, {
  name: 'idx_object_event_type',
  unique: false
});

// Index for pending events that need processing
stripeEventSchema.index({
  processingStatus: 1,
  createdAt: 1
}, {
  name: 'idx_pending_events'
});

// Index for retry logic
stripeEventSchema.index({
  processingStatus: 1,
  retryCount: 1,
  lastRetryAt: 1
}, {
  name: 'idx_retry_logic'
});

// Compound index for booking-level queries
stripeEventSchema.index({
  bookingId: 1,
  eventType: 1,
  processingStatus: 1
}, {
  name: 'idx_booking_events'
});

const StripeEvent = mongoose.model('StripeEvent', stripeEventSchema);

export default StripeEvent;
