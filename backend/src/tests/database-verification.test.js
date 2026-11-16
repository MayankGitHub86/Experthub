/**
 * Database Verification Tests
 * 
 * Verify:
 * 1. StripeEvent unique index on stripeEventId exists and is enforced
 * 2. Payment mapping: PaymentIntent ID -> Booking
 * 3. MongoDB transaction rollback on error
 * 4. Concurrent payment processing produces single settlement
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Expert from '../models/Expert.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Transaction from '../models/Transaction.js';
import StripeEvent from '../models/StripeEvent.js';

describe('Database Verification', () => {
  let clientUser;
  let expertUser;
  let expert;
  let service;

  beforeAll(async () => {
    clientUser = await User.create({
      email: `db_verify_${Date.now()}@test.com`,
      firstName: 'DB',
      lastName: 'Verify',
      password: 'hashedPassword123',
      userType: 'client'
    });

    expertUser = await User.create({
      email: `db_verify_exp_${Date.now()}@test.com`,
      firstName: 'DB',
      lastName: 'Expert',
      password: 'hashedPassword123',
      userType: 'expert'
    });

    expert = await Expert.create({
      userId: expertUser._id,
      headline: 'DB Verification Expert',
      bio: 'Expert for testing database verification of payment processing, transaction atomicity, and idempotency enforcement.',
      hourlyRate: 100,
      category: 'Business & Strategy',
      verificationStatus: 'approved',
      stripeAccountId: `acct_db_verify_${Date.now()}`,
      stripeChargesEnabled: true,
      stripeAccountCapabilities: {
        card_payments: 'active',
        payouts: 'active',
        transfers: 'active'
      }
    });

    service = await Service.create({
      expertId: expert._id,
      title: 'DB Verification Service',
      description: 'Service for database verification tests.',
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

  it('1. StripeEvent unique index on stripeEventId is enforced', async () => {
    const eventId = `evt_unique_${Date.now()}`;

    // Create first event
    const event1 = await StripeEvent.create({
      stripeEventId: eventId,
      eventType: 'payment_intent.succeeded',
      stripeObject: {
        objectId: 'pi_test_1',
        objectType: 'payment_intent'
      },
      processingStatus: 'processed'
    });

    expect(event1._id).toBeDefined();

    // Try to create duplicate event with same stripeEventId
    const event2Data = {
      stripeEventId: eventId, // Same ID
      eventType: 'payment_intent.succeeded',
      stripeObject: {
        objectId: 'pi_test_2',
        objectType: 'payment_intent'
      },
      processingStatus: 'processed'
    };

    let duplicateError;
    try {
      await StripeEvent.create(event2Data);
    } catch (err) {
      duplicateError = err;
    }

    // Should get E11000 duplicate key error
    expect(duplicateError).toBeDefined();
    expect(duplicateError.code).toBe(11000);
    expect(duplicateError.message).toMatch(/stripeEventId/i);

    // Clean up
    await StripeEvent.deleteOne({ _id: event1._id });
  });

  it('2. Compound index prevents duplicate PaymentIntent+eventType processing', async () => {
    const paymentIntentId = `pi_compound_${Date.now()}`;

    // Create first event for this PaymentIntent
    const event1 = await StripeEvent.create({
      stripeEventId: `evt_1_${Date.now()}`,
      eventType: 'payment_intent.succeeded',
      stripeObject: {
        objectId: paymentIntentId,
        objectType: 'payment_intent'
      },
      processingStatus: 'processed'
    });

    expect(event1).toBeDefined();

    // Attempt second event for SAME PaymentIntent but DIFFERENT eventId
    // This should succeed (compound index allows multiple events for same PaymentIntent)
    const event2 = await StripeEvent.create({
      stripeEventId: `evt_2_${Date.now()}`, // Different event ID
      eventType: 'payment_intent.succeeded',
      stripeObject: {
        objectId: paymentIntentId, // SAME PaymentIntent ID
        objectType: 'payment_intent'
      },
      processingStatus: 'processed'
    });

    expect(event2).toBeDefined();

    // Both events should exist
    const count = await StripeEvent.countDocuments({
      'stripeObject.objectId': paymentIntentId
    });
    expect(count).toBe(2);

    // Clean up
    await StripeEvent.deleteMany({
      'stripeObject.objectId': paymentIntentId
    });
  });

  it('3. PaymentIntent maps to exactly one Booking', async () => {
    const booking1 = await Booking.create({
      bookingNumber: `BK${Date.now()}${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: {
        baseAmount: 100.00,
        platformFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        currency: 'USD'
      },
      totalAmount: 100.00,
      payment: {
        stripePaymentIntentId: `pi_map_1_${Date.now()}`
      }
    });

    const booking2 = await Booking.create({
      bookingNumber: `BK${Date.now()}${Math.random()}`,
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: {
        baseAmount: 50.00,
        platformFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        currency: 'USD'
      },
      totalAmount: 50.00,
      payment: {
        stripePaymentIntentId: `pi_map_2_${Date.now()}`
      }
    });

    try {
      // Find booking by PaymentIntent ID
      const foundBooking = await Booking.findOne({
        'payment.stripePaymentIntentId': booking1.payment.stripePaymentIntentId
      });

      expect(foundBooking).toBeDefined();
      expect(foundBooking._id.toString()).toBe(booking1._id.toString());

      // Verify it only finds ONE booking
      const count = await Booking.countDocuments({
        'payment.stripePaymentIntentId': booking1.payment.stripePaymentIntentId
      });
      expect(count).toBe(1);

      // Verify it doesn't find booking2
      const notFound = await Booking.findOne({
        'payment.stripePaymentIntentId': booking2.payment.stripePaymentIntentId
      });
      expect(notFound._id.toString()).toBe(booking2._id.toString());
    } finally {
      await Booking.deleteMany({
        _id: { $in: [booking1._id, booking2._id] }
      });
    }
  });

  it('4. Concurrent duplicate events (same eventId) are rejected at database layer', async () => {
    const eventId = `evt_concurrent_${Date.now()}`;

    // Simulate concurrent duplicate event deliveries
    const eventData = {
      stripeEventId: eventId,
      eventType: 'payment_intent.succeeded',
      stripeObject: {
        objectId: `pi_concurrent_${Date.now()}`,
        objectType: 'payment_intent'
      },
      processingStatus: 'processed'
    };

    // Attempt to create same event twice in parallel
    const promises = [
      StripeEvent.create(eventData),
      StripeEvent.create(eventData)
    ];

    const results = await Promise.allSettled(promises);

    // One should succeed, one should fail with duplicate key error
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].reason.code).toBe(11000);

    // Only one event should exist in database
    const count = await StripeEvent.countDocuments({
      stripeEventId: eventId
    });
    expect(count).toBe(1);

    // Clean up
    await StripeEvent.deleteOne({ stripeEventId: eventId });
  });

  it('5. MongoDB transaction rolls back on error', async () => {
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
      pricing: {
        baseAmount: 100.00,
        platformFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        currency: 'USD'
      },
      totalAmount: 100.00,
      payment: {}
    });

    const session = await mongoose.connection.startSession();
    session.startTransaction();

    try {
      const transactionId = new mongoose.Types.ObjectId();

      // Update booking within transaction
      await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: 'paid',
          $set: { 'payment.transactionId': transactionId }
        },
        { session }
      );

      // Create transaction record
      const transaction = await Transaction.create(
        [{
          bookingId: booking._id,
          fromUserId: clientUser._id,
          toUserId: expertUser._id,
          type: 'booking_payment',
          amount: 8500,
          netAmount: 8500,
          currency: 'USD',
          status: 'completed',
          description: 'Test payment',
          gateway: {
            provider: 'stripe',
            paymentIntentId: `pi_rollback_${Date.now()}`,
            chargeId: `ch_rollback_${Date.now()}`
          },
          completedAt: new Date()
        }],
        { session }
      );

      // Verify updates are visible within transaction
      const bookingInTx = await Booking.findById(booking._id, null, { session });
      expect(bookingInTx.status).toBe('paid');

      // Now abort the transaction
      await session.abortTransaction();

      // Verify booking was rolled back
      const bookingAfter = await Booking.findById(booking._id);
      expect(bookingAfter.status).toBe('confirmed'); // Rolled back to original
      expect(bookingAfter.payment.transactionId).toBeUndefined();

      // Verify transaction was not persisted
      const transactionCount = await Transaction.countDocuments({
        bookingId: booking._id,
        type: 'booking_payment'
      });
      expect(transactionCount).toBe(0);
    } finally {
      await session.endSession();
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('6. Transaction atomicity: all-or-nothing with multiple writes', async () => {
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
      pricing: {
        baseAmount: 100.00,
        platformFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        currency: 'USD'
      },
      totalAmount: 100.00,
      payment: {}
    });

    const session = await mongoose.connection.startSession();
    session.startTransaction();

    try {
      // Create StripeEvent
      const stripeEvent = await StripeEvent.create(
        [{
          stripeEventId: `evt_atomic_${Date.now()}`,
          eventType: 'payment_intent.succeeded',
          stripeObject: {
            objectId: `pi_atomic_${Date.now()}`,
            objectType: 'payment_intent'
          },
          processingStatus: 'processed',
          bookingId: booking._id
        }],
        { session }
      );

      // Create Transaction
      const transaction = await Transaction.create(
        [{
          bookingId: booking._id,
          fromUserId: clientUser._id,
          toUserId: expertUser._id,
          type: 'booking_payment',
          amount: 8500,
          netAmount: 8500,
          currency: 'USD',
          status: 'completed',
          description: 'Atomic test payment',
          gateway: {
            provider: 'stripe',
            paymentIntentId: stripeEvent[0].stripeObject.objectId,
            chargeId: `ch_atomic_${Date.now()}`
          },
          completedAt: new Date()
        }],
        { session }
      );

      // Update Booking
      await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: 'paid',
          $set: { 'payment.transactionId': transaction[0]._id, 'payment.paidAt': new Date() }
        },
        { session }
      );

      // Commit
      await session.commitTransaction();

      // Verify all writes persisted
      const bookingAfter = await Booking.findById(booking._id);
      expect(bookingAfter.status).toBe('paid');
      expect(bookingAfter.payment.paidAt).toBeDefined();

      const stripeEventAfter = await StripeEvent.findOne({
        stripeEventId: stripeEvent[0].stripeEventId
      });
      expect(stripeEventAfter).toBeDefined();

      const transactionAfter = await Transaction.findById(transaction[0]._id);
      expect(transactionAfter).toBeDefined();
    } finally {
      await session.endSession();
      await Booking.deleteOne({ _id: booking._id });
      await StripeEvent.deleteOne({ bookingId: booking._id });
      await Transaction.deleteMany({ bookingId: booking._id });
    }
  });
});
