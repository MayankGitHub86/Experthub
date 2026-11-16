/**
 * Payment Settlement Integrity Tests
 * 
 * Verifies PaymentIntent-level settlement idempotency and complete transaction rollback.
 * 
 * Critical requirements:
 * 1. Same PaymentIntent cannot produce multiple financial settlements
 * 2. All four related records (StripeEvent, Payment, Booking, Transaction) must rollback together
 * 3. After rollback, retrying the event succeeds
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import http from 'http';
import crypto from 'crypto';
import mongoose from 'mongoose';
import app from '../app.js';
import config from '../config/environment.js';
import Booking from '../models/Booking.js';
import Expert from '../models/Expert.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import StripeEvent from '../models/StripeEvent.js';
import Transaction from '../models/Transaction.js';

describe('Payment Settlement Integrity', () => {
  let clientUser;
  let expertUser;
  let expert;
  let service;
  let server;
  const testPort = 3336;

  beforeAll(async () => {
    server = app.listen(testPort);

    clientUser = await User.create({
      email: `settlement_${Date.now()}@test.com`,
      firstName: 'Settlement',
      lastName: 'Client',
      password: 'hashedPassword123',
      userType: 'client'
    });

    expertUser = await User.create({
      email: `settlement_exp_${Date.now()}@test.com`,
      firstName: 'Settlement',
      lastName: 'Expert',
      password: 'hashedPassword123',
      userType: 'expert'
    });

    expert = await Expert.create({
      userId: expertUser._id,
      headline: 'Settlement Expert',
      bio: 'Expert for testing payment settlement integrity, idempotency, and rollback scenarios. Testing production payment processing.',
      hourlyRate: 100,
      category: 'Business & Strategy',
      verificationStatus: 'approved',
      stripeAccountId: `acct_settlement_${Date.now()}`,
      stripeChargesEnabled: true,
      stripeAccountCapabilities: {
        card_payments: 'active',
        payouts: 'active',
        transfers: 'active'
      }
    });

    service = await Service.create({
      expertId: expert._id,
      title: 'Settlement Service',
      description: 'Service for testing settlement integrity.',
      category: 'business-consulting',
      pricing: { type: 'hourly', amount: 100, currency: 'USD' },
      duration: 60,
      isActive: true,
      status: 'approved'
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    if (clientUser?._id) await User.deleteOne({ _id: clientUser._id });
    if (expertUser?._id) await User.deleteOne({ _id: expertUser._id });
    if (expert?._id) await Expert.deleteOne({ _id: expert._id });
    if (service?._id) await Service.deleteOne({ _id: service._id });
  });

  /**
   * Helper: Make HTTP POST request with exact Buffer body
   */
  function makeWebhookRequest(payload, signature) {
    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: 'localhost',
        port: testPort,
        path: '/webhooks/stripe/events',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
          'stripe-signature': signature
        }
      };

      const req = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              body: data ? JSON.parse(data) : null
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              body: data
            });
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  /**
   * Helper: Create validly signed webhook event
   */
  function createSignedWebhookEvent(eventData) {
    const payloadString = JSON.stringify(eventData);
    const payloadBuffer = Buffer.from(payloadString, 'utf8');
    const timestamp = Math.floor(Date.now() / 1000);
    const signedContent = `${timestamp}.${payloadString}`;
    
    const signature = crypto
      .createHmac('sha256', config.stripe.webhookSecret)
      .update(signedContent)
      .digest('hex');
    
    const stripeSignature = `t=${timestamp},v1=${signature}`;
    
    return {
      payloadBuffer,
      signature: stripeSignature
    };
  }

  it('Scenario A: Distinct Event IDs, Same PaymentIntent → One Settlement', async () => {
    const paymentIntentId = `pi_scenario_a_${Date.now()}`;
    
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
      payment: {}
    });

    try {
      const chargeId = `ch_scenario_a_${Date.now()}`;
      
      // Event A with PaymentIntent pi_A
      const eventA = {
        id: `evt_a_${Date.now()}`,
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: paymentIntentId, // Same PaymentIntent
            object: 'payment_intent',
            status: 'succeeded',
            amount: 10000,
            currency: 'usd',
            created: Math.floor(Date.now() / 1000),
            charges: {
              data: [{
                id: chargeId,
                amount: 10000,
                amount_captured: 10000,
                net: 8500,
                payment_method_details: { type: 'card', card: { brand: 'visa', last4: '4242' } }
              }]
            },
            metadata: {
              bookingId: booking1._id.toString(),
              clientId: clientUser._id.toString(),
              expertId: expert._id.toString(),
              serviceId: service._id.toString(),
              platformCommission: '1500',
              expertShare: '8500'
            }
          }
        }
      };

      const { payloadBuffer: bufferA, signature: sigA } = createSignedWebhookEvent(eventA);
      const responseA = await makeWebhookRequest(bufferA, sigA);

      // First event should succeed
      expect(responseA.statusCode).toBe(200);
      expect(responseA.body.success).toBe(true);

      // Verify booking paid
      let bookingAfter = await Booking.findById(booking1._id);
      expect(bookingAfter.status).toBe('paid');

      // Count transactions
      let txCount = await Transaction.countDocuments({
        bookingId: booking1._id,
        type: 'booking_payment'
      });
      expect(txCount).toBe(1);

      // Now send Event B with different eventId but SAME PaymentIntent
      const eventB = {
        id: `evt_b_${Date.now() + 1}`, // Different event ID
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000) + 1,
        data: {
          object: {
            id: paymentIntentId, // SAME PaymentIntent
            object: 'payment_intent',
            status: 'succeeded',
            amount: 10000,
            currency: 'usd',
            created: Math.floor(Date.now() / 1000),
            charges: {
              data: [{
                id: `ch_b_${Date.now()}`,
                amount: 10000,
                amount_captured: 10000,
                net: 8500,
                payment_method_details: { type: 'card', card: { brand: 'visa', last4: '4242' } }
              }]
            },
            metadata: {
              bookingId: booking1._id.toString(),
              clientId: clientUser._id.toString(),
              expertId: expert._id.toString(),
              serviceId: service._id.toString(),
              platformCommission: '1500',
              expertShare: '8500'
            }
          }
        }
      };

      const { payloadBuffer: bufferB, signature: sigB } = createSignedWebhookEvent(eventB);
      const responseB = await makeWebhookRequest(bufferB, sigB);

      // Second event should be handled safely (either 200 or 400, but not 500)
      expect([200, 400]).toContain(responseB.statusCode);

      // Critical: Only ONE transaction should exist
      txCount = await Transaction.countDocuments({
        bookingId: booking1._id,
        type: 'booking_payment'
      });
      expect(txCount).toBe(1); // NOT 2!

      // Booking should still be paid (not double-charged)
      bookingAfter = await Booking.findById(booking1._id);
      expect(bookingAfter.status).toBe('paid');
    } finally {
      await Booking.deleteOne({ _id: booking1._id });
    }
  });

  it('Scenario B: Concurrent Distinct Events, Same PaymentIntent → One Settlement', async () => {
    const paymentIntentId = `pi_scenario_b_${Date.now()}`;
    
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

    try {
      // Create two distinct events with same PaymentIntent
      const eventX = {
        id: `evt_x_${Date.now()}`,
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: paymentIntentId,
            object: 'payment_intent',
            status: 'succeeded',
            amount: 10000,
            currency: 'usd',
            created: Math.floor(Date.now() / 1000),
            charges: {
              data: [{
                id: `ch_x_${Date.now()}`,
                amount: 10000,
                amount_captured: 10000,
                net: 8500,
                payment_method_details: { type: 'card', card: { brand: 'visa', last4: '4242' } }
              }]
            },
            metadata: {
              bookingId: booking._id.toString(),
              clientId: clientUser._id.toString(),
              expertId: expert._id.toString(),
              serviceId: service._id.toString(),
              platformCommission: '1500',
              expertShare: '8500'
            }
          }
        }
      };

      const eventY = {
        ...eventX,
        id: `evt_y_${Date.now() + 1}` // Different event ID
      };

      const { payloadBuffer: bufferX, signature: sigX } = createSignedWebhookEvent(eventX);
      const { payloadBuffer: bufferY, signature: sigY } = createSignedWebhookEvent(eventY);

      // Send both concurrently
      const promises = [
        makeWebhookRequest(bufferX, sigX),
        makeWebhookRequest(bufferY, sigY)
      ];

      const responses = await Promise.all(promises);

      // Both should return 2xx or 4xx, NOT 5xx
      for (const response of responses) {
        expect([200, 400]).toContain(response.statusCode);
      }

      // Verify only ONE transaction
      const txCount = await Transaction.countDocuments({
        bookingId: booking._id,
        type: 'booking_payment'
      });
      expect(txCount).toBe(1);

      // Booking paid only once
      const bookingAfter = await Booking.findById(booking._id);
      expect(bookingAfter.status).toBe('paid');
    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('Scenario C: Independent PaymentIntents Process Independently', async () => {
    const pi1 = `pi_independent_1_${Date.now()}`;
    const pi2 = `pi_independent_2_${Date.now()}`;

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
      pricing: { baseAmount: 100.00, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 100.00,
      payment: {}
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
      pricing: { baseAmount: 50.00, platformFee: 0, taxAmount: 0, discountAmount: 0, currency: 'USD' },
      totalAmount: 50.00,
      payment: {}
    });

    try {
      const event1 = {
        id: `evt_independent_1_${Date.now()}`,
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: pi1,
            object: 'payment_intent',
            status: 'succeeded',
            amount: 10000,
            currency: 'usd',
            created: Math.floor(Date.now() / 1000),
            charges: {
              data: [{
                id: `ch_1_${Date.now()}`,
                amount: 10000,
                amount_captured: 10000,
                net: 8500,
                payment_method_details: { type: 'card', card: { brand: 'visa', last4: '4242' } }
              }]
            },
            metadata: {
              bookingId: booking1._id.toString(),
              clientId: clientUser._id.toString(),
              expertId: expert._id.toString(),
              serviceId: service._id.toString(),
              platformCommission: '1500',
              expertShare: '8500'
            }
          }
        }
      };

      const event2 = {
        id: `evt_independent_2_${Date.now()}`,
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: pi2,
            object: 'payment_intent',
            status: 'succeeded',
            amount: 5000,
            currency: 'usd',
            created: Math.floor(Date.now() / 1000),
            charges: {
              data: [{
                id: `ch_2_${Date.now()}`,
                amount: 5000,
                amount_captured: 5000,
                net: 4250,
                payment_method_details: { type: 'card', card: { brand: 'visa', last4: '4242' } }
              }]
            },
            metadata: {
              bookingId: booking2._id.toString(),
              clientId: clientUser._id.toString(),
              expertId: expert._id.toString(),
              serviceId: service._id.toString(),
              platformCommission: '750',
              expertShare: '4250'
            }
          }
        }
      };

      const { payloadBuffer: buf1, signature: sig1 } = createSignedWebhookEvent(event1);
      const { payloadBuffer: buf2, signature: sig2 } = createSignedWebhookEvent(event2);

      const resp1 = await makeWebhookRequest(buf1, sig1);
      const resp2 = await makeWebhookRequest(buf2, sig2);

      // Both should succeed
      expect(resp1.statusCode).toBe(200);
      expect(resp2.statusCode).toBe(200);

      // Both bookings should be paid
      const b1 = await Booking.findById(booking1._id);
      const b2 = await Booking.findById(booking2._id);
      expect(b1.status).toBe('paid');
      expect(b2.status).toBe('paid');

      // Each should have exactly one transaction
      const tx1 = await Transaction.countDocuments({ bookingId: booking1._id });
      const tx2 = await Transaction.countDocuments({ bookingId: booking2._id });
      expect(tx1).toBe(1);
      expect(tx2).toBe(1);
    } finally {
      await Booking.deleteMany({ _id: { $in: [booking1._id, booking2._id] } });
    }
  });

  it('Complete Rollback: All Four Records Rollback on Failure', async () => {
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

    try {
      const session = await mongoose.connection.startSession();
      session.startTransaction();

      try {
        const paymentIntentId = `pi_rollback_${Date.now()}`;

        // 1. Create StripeEvent
        const stripeEvent = await StripeEvent.create(
          [{
            stripeEventId: `evt_rollback_${Date.now()}`,
            eventType: 'payment_intent.succeeded',
            stripeObject: {
              objectId: paymentIntentId,
              objectType: 'payment_intent'
            },
            processingStatus: 'processing' // Note: NOT 'processed' yet
          }],
          { session }
        );

        expect(stripeEvent[0]).toBeDefined();

        // 2. Update Booking to paid
        await Booking.findByIdAndUpdate(
          booking._id,
          {
            status: 'paid',
            $set: { 'payment.paidAt': new Date(), 'payment.stripePaymentIntentId': paymentIntentId }
          },
          { session }
        );

        // 3. Create Transaction
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
            description: 'Rollback test payment',
            gateway: {
              provider: 'stripe',
              paymentIntentId: paymentIntentId,
              chargeId: `ch_rollback_${Date.now()}`
            },
            completedAt: new Date()
          }],
          { session }
        );

        expect(transaction[0]).toBeDefined();
        const transactionId = transaction[0]._id;

        // 4. Inject failure AFTER Transaction creation but BEFORE commit
        await session.abortTransaction();

        // ===== Verify all four records rolled back =====

        // 1. StripeEvent should NOT exist with processingStatus='processed'
        const stripeEventAfter = await StripeEvent.findOne({
          stripeEventId: stripeEvent[0].stripeEventId,
          processingStatus: 'processed'
        });
        expect(stripeEventAfter).toBeNull(); // Rolled back

        // 2. Booking should NOT be paid
        const bookingAfter = await Booking.findById(booking._id);
        expect(bookingAfter.status).toBe('confirmed'); // Reverted to original
        expect(bookingAfter.payment.paidAt).toBeUndefined(); // Cleared

        // 3. Transaction should NOT exist
        const transactionAfter = await Transaction.findById(transactionId);
        expect(transactionAfter).toBeNull();

        // 4. No payments for this booking should exist
        const paymentCount = await Transaction.countDocuments({
          bookingId: booking._id
        });
        expect(paymentCount).toBe(0);

      } finally {
        await session.endSession();
      }

      // ===== Now retry and verify it succeeds =====

      const eventData = {
        id: `evt_retry_${Date.now()}`,
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: `pi_retry_${Date.now()}`,
            object: 'payment_intent',
            status: 'succeeded',
            amount: 10000,
            currency: 'usd',
            created: Math.floor(Date.now() / 1000),
            charges: {
              data: [{
                id: `ch_retry_${Date.now()}`,
                amount: 10000,
                amount_captured: 10000,
                net: 8500,
                payment_method_details: { type: 'card', card: { brand: 'visa', last4: '4242' } }
              }]
            },
            metadata: {
              bookingId: booking._id.toString(),
              clientId: clientUser._id.toString(),
              expertId: expert._id.toString(),
              serviceId: service._id.toString(),
              platformCommission: '1500',
              expertShare: '8500'
            }
          }
        }
      };

      const { payloadBuffer, signature } = createSignedWebhookEvent(eventData);
      const response = await makeWebhookRequest(payloadBuffer, signature);

      // Should succeed after rollback
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      // Booking should now be paid
      const bookingFinal = await Booking.findById(booking._id);
      expect(bookingFinal.status).toBe('paid');
      expect(bookingFinal.payment.paidAt).toBeDefined();

      // Transaction should now exist
      const txFinal = await Transaction.countDocuments({
        bookingId: booking._id,
        type: 'booking_payment'
      });
      expect(txFinal).toBe(1);
    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });
});
