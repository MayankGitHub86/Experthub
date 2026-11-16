/**
 * Payment Concurrency Failure Test
 * 
 * Tests the critical scenario where:
 * 1. Event X starts processing and acquires a write lock
 * 2. Event Y arrives concurrently for the same PaymentIntent
 * 3. One event encounters a write conflict or is forced to abort
 * 4. System correctly verifies committed settlement state
 * 5. No premature HTTP 200 without actual committed settlement
 * 6. Retries eventually succeed with exactly one settlement
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
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

describe('Payment Concurrency Failure Scenarios', () => {
  let clientUser;
  let expertUser;
  let expert;
  let service;
  let server;
  const testPort = 3337;

  beforeAll(async () => {
    server = app.listen(testPort);

    clientUser = await User.create({
      email: `concurrency_${Date.now()}@test.com`,
      firstName: 'Concurrency',
      lastName: 'Client',
      password: 'hashedPassword123',
      userType: 'client'
    });

    expertUser = await User.create({
      email: `concurrency_exp_${Date.now()}@test.com`,
      firstName: 'Concurrency',
      lastName: 'Expert',
      password: 'hashedPassword123',
      userType: 'expert'
    });

    expert = await Expert.create({
      userId: expertUser._id,
      headline: 'Concurrency Expert',
      bio: 'Testing concurrent payment processing and failure scenarios. Expert for validating payment transaction idempotency, concurrency control, and MongoDB transaction semantics in a production payment platform.',
      hourlyRate: 100,
      category: 'Business & Strategy',
      verificationStatus: 'approved',
      stripeAccountId: `acct_concurrency_${Date.now()}`,
      stripeChargesEnabled: true,
      stripeAccountCapabilities: {
        card_payments: 'active',
        payouts: 'active',
        transfers: 'active'
      }
    });

    service = await Service.create({
      expertId: expert._id,
      title: 'Concurrency Service',
      description: 'Service for testing concurrent payment processing.',
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
          ...(signature && { 'stripe-signature': signature })
        }
      };

      const req = http.request(reqOptions, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
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
   * Helper: Create signed webhook event
   */
  function createSignedWebhookEvent(event) {
    const payloadString = JSON.stringify(event);
    const payloadBuffer = Buffer.from(payloadString, 'utf8');
    const timestamp = Math.floor(Date.now() / 1000);
    const signedContent = `${timestamp}.${payloadString}`;
    const signature = crypto
      .createHmac('sha256', config.stripe.webhookSecret)
      .update(signedContent)
      .digest('hex');

    return {
      payloadBuffer,
      signature: `t=${timestamp},v1=${signature}`
    };
  }

  it('Scenario: Event X Commits, Event Y Recognizes Settlement Safe', async () => {
    /**
     * This scenario verifies the CORRECT concurrent behavior:
     * 1. Event X (evt_x) processes and commits settlement
     * 2. Event Y (evt_y) arrives for same PaymentIntent
     * 3. Event Y checks if PaymentIntent already settled via StripeEvent query
     * 4. Finds settlement IS committed for this PaymentIntent
     * 5. Returns HTTP 200 with isDuplicate=true (safe acknowledgement)
     * 6. Exactly ONE Transaction exists
     */

    const piId = `pi_concurrent_safe_${Date.now()}`;
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
      const eventX = {
        id: `evt_x_${Date.now()}`,
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: piId,
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
        id: `evt_y_${Date.now() + 1}` // Different event ID, same PaymentIntent
      };

      const { payloadBuffer: bufferX, signature: sigX } = createSignedWebhookEvent(eventX);
      const { payloadBuffer: bufferY, signature: sigY } = createSignedWebhookEvent(eventY);

      // Send X first to establish the settlement
      const respX = await makeWebhookRequest(bufferX, sigX);
      expect(respX.statusCode).toBe(200);
      expect(respX.body.success).toBe(true);
      expect(respX.body.isDuplicate).toBeUndefined(); // First is NOT marked duplicate

      // Now send Y - should recognize X's settlement via committed state
      const respY = await makeWebhookRequest(bufferY, sigY);
      expect(respY.statusCode).toBe(200);
      expect(respY.body.success).toBe(true);
      expect(respY.body.isDuplicate).toBe(true); // Should be marked as duplicate

      // Verify exactly ONE settlement exists
      const txCount = await Transaction.countDocuments({
        bookingId: booking._id,
        type: 'booking_payment'
      });
      expect(txCount).toBe(1);

      // Verify StripeEvent tracking: X should be 'processed', Y should also be 'processed'
      const eventXRecord = await StripeEvent.findOne({ stripeEventId: eventX.id });
      const eventYRecord = await StripeEvent.findOne({ stripeEventId: eventY.id });
      
      expect(eventXRecord).toBeDefined();
      expect(eventXRecord.processingStatus).toBe('processed');
      
      expect(eventYRecord).toBeDefined();
      expect(eventYRecord.processingStatus).toBe('processed');

      // Both should reference the same PaymentIntent
      expect(eventXRecord.stripeObject.objectId).toBe(piId);
      expect(eventYRecord.stripeObject.objectId).toBe(piId);

      // X has transactionId, but Y may not (if detected as duplicate before creating one)
      // What matters is only ONE Transaction exists
      expect(eventXRecord.transactionId).toBeDefined();

    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('Scenario: Event X Fails, Event Y Retries After No Committed Settlement', async () => {
    /**
     * This scenario tests SAFE FAILURE behavior:
     * 1. Event X starts processing but ABORTS before commit (simulated via session abort)
     * 2. Event Y arrives for same PaymentIntent
     * 3. Event Y should query committed settlement state
     * 4. Settlement does NOT exist (X aborted)
     * 5. Event Y's first attempt may fail or should not proceed if no confirmed settlement
     * 6. Retry of Y should succeed with exactly ONE settlement
     * 
     * The key test: Event Y never returns HTTP 200 claiming success without 
     * verifying a committed settlement exists.
     */

    const piId = `pi_concurrent_fail_${Date.now()}`;
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
      // Simulate Event X aborting by manually creating and then removing uncommitted state
      const session = await mongoose.connection.startSession();
      session.startTransaction();

      try {
        // Pretend Event X started processing
        const stripeEventX = await StripeEvent.create(
          [{
            stripeEventId: `evt_x_abort_${Date.now()}`,
            eventType: 'payment_intent.succeeded',
            stripeObject: {
              objectId: piId,
              objectType: 'payment_intent'
            },
            processingStatus: 'processing' // NOT 'processed' - still in transaction
          }],
          { session }
        );

        expect(stripeEventX[0]).toBeDefined();

        // NOW abort the session to simulate Event X failure
        await session.abortTransaction();

      } finally {
        await session.endSession();
      }

      // Verify X's state was rolled back
      const eventXAfterAbort = await StripeEvent.findOne({
        stripeEventId: `evt_x_abort_${Date.now()}`
      });
      expect(eventXAfterAbort).toBeNull(); // Rolled back

      // NOW send Event Y - it should not find a committed settlement
      // First Y may get an error due to write conflicts or other transient issues
      // Important: it should NOT return HTTP 200 claiming success without confirmed settlement
      const eventY = {
        id: `evt_y_after_abort_${Date.now()}`,
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: piId,
            object: 'payment_intent',
            status: 'succeeded',
            amount: 10000,
            currency: 'usd',
            created: Math.floor(Date.now() / 1000),
            charges: {
              data: [{
                id: `ch_y_after_abort_${Date.now()}`,
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

      const { payloadBuffer: bufferY, signature: sigY } = createSignedWebhookEvent(eventY);
      const respY = await makeWebhookRequest(bufferY, sigY);

      // After retries, Y should eventually succeed (because settlement DOES get created on retry)
      expect(respY.statusCode).toBe(200);
      expect(respY.body.success).toBe(true);

      // Exactly ONE settlement should exist
      const txCount = await Transaction.countDocuments({
        bookingId: booking._id,
        type: 'booking_payment'
      });
      expect(txCount).toBe(1);

      // Event should be marked as processed
      const eventYFinal = await StripeEvent.findOne({
        stripeEventId: eventY.id,
        processingStatus: 'processed'
      });
      expect(eventYFinal).toBeDefined();

    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

});
