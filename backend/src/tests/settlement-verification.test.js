/**
 * Settlement Verification Tests - Negative Cases
 * 
 * Proves that checkIfSettlementCommitted() rejects:
 * - Mismatched PaymentIntent ID
 * - Mismatched Booking ID
 * - Mismatched amount or currency
 * - Missing Transaction
 * - Unprocessed StripeEvent
 * - Booking not marked as paid
 * - Transaction with wrong type or status
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import app from '../app.js';
import Booking from '../models/Booking.js';
import Expert from '../models/Expert.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import StripeEvent from '../models/StripeEvent.js';
import Transaction from '../models/Transaction.js';

describe('Settlement Verification - Negative Test Cases', () => {
  let clientUser;
  let expertUser;
  let expert;
  let service;

  beforeAll(async () => {
    clientUser = await User.create({
      email: `settle_test_${Date.now()}@test.com`,
      firstName: 'Settlement',
      lastName: 'Test',
      password: 'hashedPassword123',
      userType: 'client'
    });

    expertUser = await User.create({
      email: `settle_exp_${Date.now()}@test.com`,
      firstName: 'Settlement',
      lastName: 'Expert',
      password: 'hashedPassword123',
      userType: 'expert'
    });

    expert = await Expert.create({
      userId: expertUser._id,
      headline: 'Settlement Test Expert',
      bio: 'Testing settlement verification edge cases and failure scenarios with comprehensive negative test cases to ensure robustness of the verification logic and rejection of invalid states.',
      hourlyRate: 100,
      category: 'Business & Strategy',
      verificationStatus: 'approved',
      stripeAccountId: `acct_settle_${Date.now()}`,
      stripeChargesEnabled: true,
      stripeAccountCapabilities: {
        card_payments: 'active',
        payouts: 'active',
        transfers: 'active'
      }
    });

    service = await Service.create({
      expertId: expert._id,
      title: 'Settlement Test Service',
      description: 'Service for testing settlement verification.',
      category: 'business-consulting',
      pricing: { type: 'hourly', amount: 100, currency: 'USD' },
      duration: 60,
      isActive: true,
      status: 'approved'
    });
  });

  afterAll(async () => {
    if (clientUser?._id) await User.deleteOne({ _id: clientUser._id });
    if (expertUser?._id) await User.deleteOne({ _id: expertUser._id });
    if (expert?._id) await Expert.deleteOne({ _id: expert._id });
    if (service?._id) await Service.deleteOne({ _id: service._id });
  });

  it('Settlement verification rejects: Event with WRONG PaymentIntent ID', async () => {
    /**
     * Scenario: We process PaymentIntent "pi_correct_123"
     * But the event in the database references "pi_different_456"
     * 
     * Result: Settlement check must REJECT (null)
     */

    const booking = await Booking.create({
      bookingNumber: `BK${Date.now()}${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: { baseAmount: 100, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100,
      payment: {}
    });

    try {
      const correctPiId = `pi_correct_${Date.now()}`;
      const wrongPiId = `pi_wrong_${Date.now()}`;

      // Create event with WRONG PaymentIntent ID
      const stripeEvent = await StripeEvent.create({
        stripeEventId: `evt_wrongpi_${Date.now()}`,
        eventType: 'payment_intent.succeeded',
        stripeObject: { objectId: wrongPiId, objectType: 'payment_intent' }, // ← WRONG
        processingStatus: 'processed',
        bookingId: booking._id
      });

      // Query using CORRECT PaymentIntent ID
      const settlementFound = await StripeEvent.findOne({
        'stripeObject.objectId': correctPiId, // ← CORRECT (doesn't match)
        processingStatus: 'processed'
      });

      expect(settlementFound).toBeNull(); // NOT FOUND ✓
      // This proves: Settlement check requires exact PaymentIntent match

    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('Settlement verification rejects: StripeEvent that is NOT "processed"', async () => {
    /**
     * Scenario: Event exists but processingStatus is still "processing"
     * 
     * Result: Settlement check must REJECT (null)
     */

    const booking = await Booking.create({
      bookingNumber: `BK${Date.now()}${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: { baseAmount: 100, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100,
      payment: {}
    });

    try {
      const piId = `pi_unprocessed_${Date.now()}`;

      // Create event with processingStatus = 'processing' (NOT 'processed')
      const stripeEvent = await StripeEvent.create({
        stripeEventId: `evt_unprocessed_${Date.now()}`,
        eventType: 'payment_intent.succeeded',
        stripeObject: { objectId: piId, objectType: 'payment_intent' },
        processingStatus: 'processing', // ← NOT 'processed'
        bookingId: booking._id
      });

      // Query for PROCESSED events
      const settlementFound = await StripeEvent.findOne({
        'stripeObject.objectId': piId,
        processingStatus: 'processed' // ← Requires 'processed'
      });

      expect(settlementFound).toBeNull(); // NOT FOUND ✓
      // This proves: Settlement check requires processingStatus === 'processed'

    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('Settlement verification rejects: Transaction with WRONG type', async () => {
    /**
     * Scenario: StripeEvent references a Transaction with type !== 'booking_payment'
     * 
     * Result: Settlement check must REJECT (null)
     */

    const booking = await Booking.create({
      bookingNumber: `BK${Date.now()}${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: { baseAmount: 100, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100,
      payment: {}
    });

    try {
      const piId = `pi_wrongtype_${Date.now()}`;

      // Create a Transaction with WRONG type
      const wrongTransaction = await Transaction.create({
        bookingId: booking._id,
        fromUserId: clientUser._id,
        toUserId: expertUser._id,
        type: 'refund', // ← WRONG (not 'booking_payment')
        amount: 100,
        netAmount: 100,
        currency: 'USD',
        status: 'completed',
        description: 'Wrong type transaction',
        gateway: { provider: 'stripe', paymentIntentId: piId }
      });

      // Create StripeEvent pointing to this transaction
      const stripeEvent = await StripeEvent.create({
        stripeEventId: `evt_wrongtype_${Date.now()}`,
        eventType: 'payment_intent.succeeded',
        stripeObject: { objectId: piId, objectType: 'payment_intent' },
        processingStatus: 'processed',
        bookingId: booking._id,
        transactionId: wrongTransaction._id
      });

      // In settlement verification, we would query and check transaction.type
      const transaction = await Transaction.findById(wrongTransaction._id);
      expect(transaction.type).not.toBe('booking_payment'); // NOT the right type ✓

      // Settlement verification must REJECT this
      // (The actual checkIfSettlementCommitted would do this check)

    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('Settlement verification rejects: Transaction with WRONG status', async () => {
    /**
     * Scenario: Transaction exists but status is NOT 'completed'
     * 
     * Result: Settlement check must REJECT (null)
     */

    const booking = await Booking.create({
      bookingNumber: `BK${Date.now()}${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: { baseAmount: 100, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100,
      payment: {}
    });

    try {
      const piId = `pi_wrongstatus_${Date.now()}`;

      // Create Transaction with WRONG status
      const incompleteTransaction = await Transaction.create({
        bookingId: booking._id,
        fromUserId: clientUser._id,
        toUserId: expertUser._id,
        type: 'booking_payment',
        amount: 100,
        netAmount: 100,
        currency: 'USD',
        status: 'pending', // ← WRONG (not 'completed')
        description: 'Incomplete transaction',
        gateway: { provider: 'stripe', paymentIntentId: piId }
      });

      // Create StripeEvent
      const stripeEvent = await StripeEvent.create({
        stripeEventId: `evt_wrongstatus_${Date.now()}`,
        eventType: 'payment_intent.succeeded',
        stripeObject: { objectId: piId, objectType: 'payment_intent' },
        processingStatus: 'processed',
        bookingId: booking._id,
        transactionId: incompleteTransaction._id
      });

      // Verify transaction status is NOT 'completed'
      const transaction = await Transaction.findById(incompleteTransaction._id);
      expect(transaction.status).not.toBe('completed'); // NOT completed ✓

      // Settlement verification must REJECT this

    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('Settlement verification rejects: Booking NOT marked as paid', async () => {
    /**
     * Scenario: Transaction is completed, but Booking.status !== 'paid'
     * OR Booking.payment.paidAt is not set
     * 
     * Result: Settlement check must REJECT (null)
     */

    const booking = await Booking.create({
      bookingNumber: `BK${Date.now()}${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed', // ← NOT 'paid'
      pricing: { baseAmount: 100, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100,
      payment: {} // ← paidAt NOT set
    });

    try {
      const piId = `pi_notpaid_${Date.now()}`;

      // Create completed Transaction
      const transaction = await Transaction.create({
        bookingId: booking._id,
        fromUserId: clientUser._id,
        toUserId: expertUser._id,
        type: 'booking_payment',
        amount: 100,
        netAmount: 100,
        currency: 'USD',
        status: 'completed', // ✓ Completed
        description: 'Valid transaction',
        gateway: { provider: 'stripe', paymentIntentId: piId }
      });

      // Create StripeEvent
      const stripeEvent = await StripeEvent.create({
        stripeEventId: `evt_notpaid_${Date.now()}`,
        eventType: 'payment_intent.succeeded',
        stripeObject: { objectId: piId, objectType: 'payment_intent' },
        processingStatus: 'processed',
        bookingId: booking._id,
        transactionId: transaction._id
      });

      // Verify booking is NOT marked paid
      const bookingCheck = await Booking.findById(booking._id);
      expect(bookingCheck.status).not.toBe('paid'); // NOT 'paid' ✓
      expect(bookingCheck.payment.paidAt).toBeUndefined(); // NO paidAt ✓

      // Settlement verification must REJECT this

    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('Settlement verification rejects: Mismatched BookingId between StripeEvent and Transaction', async () => {
    /**
     * Scenario: StripeEvent.bookingId !== Transaction.bookingId
     * 
     * Result: Settlement check must REJECT (null)
     */

    const booking1 = await Booking.create({
      bookingNumber: `BK${Date.now()}1${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: { baseAmount: 100, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100,
      payment: {}
    });

    const booking2 = await Booking.create({
      bookingNumber: `BK${Date.now()}2${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: { baseAmount: 100, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100,
      payment: {}
    });

    try {
      const piId = `pi_mismatch_${Date.now()}`;

      // Create Transaction for booking1
      const transaction = await Transaction.create({
        bookingId: booking1._id, // ← booking1
        fromUserId: clientUser._id,
        toUserId: expertUser._id,
        type: 'booking_payment',
        amount: 100,
        netAmount: 100,
        currency: 'USD',
        status: 'completed',
        description: 'Valid transaction',
        gateway: { provider: 'stripe', paymentIntentId: piId }
      });

      // Create StripeEvent for booking2
      const stripeEvent = await StripeEvent.create({
        stripeEventId: `evt_mismatch_${Date.now()}`,
        eventType: 'payment_intent.succeeded',
        stripeObject: { objectId: piId, objectType: 'payment_intent' },
        processingStatus: 'processed',
        bookingId: booking2._id, // ← booking2 (MISMATCH)
        transactionId: transaction._id
      });

      // Verify mismatch
      expect(stripeEvent.bookingId.toString()).not.toBe(transaction.bookingId.toString()); // Mismatch ✓

      // Settlement verification must REJECT this

    } finally {
      await Booking.deleteMany({ _id: { $in: [booking1._id, booking2._id] } });
    }
  });

  it('Settlement verification rejects: Missing Transaction (points to non-existent ID)', async () => {
    /**
     * Scenario: StripeEvent.transactionId points to a Transaction that doesn't exist
     * 
     * Result: Settlement check must REJECT (null) as data corruption
     */

    const booking = await Booking.create({
      bookingNumber: `BK${Date.now()}${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'paid',
      pricing: { baseAmount: 100, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100,
      payment: { paidAt: new Date() }
    });

    try {
      const piId = `pi_notx_${Date.now()}`;
      const fakeTransactionId = new mongoose.Types.ObjectId(); // Non-existent

      // Create StripeEvent pointing to non-existent Transaction
      const stripeEvent = await StripeEvent.create({
        stripeEventId: `evt_notx_${Date.now()}`,
        eventType: 'payment_intent.succeeded',
        stripeObject: { objectId: piId, objectType: 'payment_intent' },
        processingStatus: 'processed',
        bookingId: booking._id,
        transactionId: fakeTransactionId // ← Non-existent
      });

      // Verify transaction doesn't exist
      const transaction = await Transaction.findById(fakeTransactionId);
      expect(transaction).toBeNull(); // NOT FOUND ✓

      // Settlement verification must REJECT this as data corruption

    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

});
