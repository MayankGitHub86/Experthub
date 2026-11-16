/**
 * Payment Lifecycle Regression Test
 * 
 * Verifies that creating a PaymentIntent does NOT mark the booking as paid,
 * and that the booking state remains consistent through the payment flow.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { PaymentService } from '../modules/payments/payment.service.js';
import Booking from '../models/Booking.js';
import Expert from '../models/Expert.js';
import User from '../models/User.js';
import Service from '../models/Service.js';

// Mock Stripe Adapter for testing
class MockStripeAdapter {
  constructor() {
    this.lastPaymentIntentParams = null;
  }

  async createPaymentIntent(params) {
    this.lastPaymentIntentParams = params;
    return {
      id: `pi_test_${Date.now()}`,
      amount: params.amount,
      currency: params.currency,
      status: 'requires_payment_method',
      client_secret: `pi_test_secret_${Date.now()}`,
      metadata: params.metadata,
      transfer_data: params.transfer_data,
      application_fee_amount: params.application_fee_amount
    };
  }
}

describe('Payment Lifecycle - Booking State Preservation', () => {
  let mockAdapter;
  let clientUser;
  let expertUser;
  let expert;
  let service;

  beforeAll(async () => {
    mockAdapter = new MockStripeAdapter();

    clientUser = await User.create({
      email: `client_${Date.now()}@test.com`,
      firstName: 'Payment',
      lastName: 'Client',
      password: 'hashedPassword123',
      userType: 'client'
    });

    expertUser = await User.create({
      email: `expert_${Date.now()}@test.com`,
      firstName: 'Payment',
      lastName: 'Expert',
      password: 'hashedPassword123',
      userType: 'expert'
    });

    expert = await Expert.create({
      userId: expertUser._id,
      headline: 'Payment Test Expert',
      bio: 'This is an expert profile with sufficient bio content for validation and payment testing scenarios. I have extensive experience in handling financial transactions and ensuring system reliability through rigorous testing of all payment flows.',
      hourlyRate: 100,
      category: 'Business & Strategy',
      verificationStatus: 'approved',
      stripeAccountId: `acct_test_${Date.now()}`,
      stripeChargesEnabled: true,
      stripeAccountCapabilities: {
        card_payments: 'active',
        payouts: 'active',
        transfers: 'active'
      }
    });

    service = await Service.create({
      expertId: expert._id,
      title: 'Payment Test Service',
      description: 'A service for testing payment lifecycle and booking state preservation.',
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

  it('booking starts in confirmed state', async () => {
    const booking = await Booking.create({
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
      payment: {}
    });

    try {
      expect(booking.status).toBe('confirmed');
      expect(booking.payment.paidAt).toBeUndefined();
      expect(booking.payment.stripePaymentIntentId).toBeUndefined();
    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('creating PaymentIntent does NOT change booking status', async () => {
    const booking = await Booking.create({
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
      payment: {}
    });

    try {
      const paymentService = new PaymentService(mockAdapter);
      
      // Create payment intent
      await paymentService.createPaymentIntent(
        booking._id.toString(),
        clientUser._id.toString(),
        5000, // $50 * 100 cents
        'USD'
      );

      // Verify booking state UNCHANGED
      const bookingAfter = await Booking.findById(booking._id);
      expect(bookingAfter.status).toBe('confirmed');
      expect(bookingAfter.payment.paidAt).toBeUndefined();
      expect(bookingAfter.payment.stripePaymentIntentId).toBeUndefined();
      expect(bookingAfter.payment.stripeChargeId).toBeUndefined();
    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('multiple PaymentIntent creations do not corrupt booking', async () => {
    const booking = await Booking.create({
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: {
        baseAmount: 75.00,
        platformFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        currency: 'USD'
      },
      totalAmount: 75.00,
      payment: {}
    });

    try {
      const paymentService = new PaymentService(mockAdapter);
      
      // Create first payment intent
      const pi1 = await paymentService.createPaymentIntent(
        booking._id.toString(),
        clientUser._id.toString(),
        7500, // $75 * 100 cents
        'USD'
      );

      let bookingAfterPI1 = await Booking.findById(booking._id);
      expect(bookingAfterPI1.status).toBe('confirmed');
      expect(bookingAfterPI1.payment.paidAt).toBeUndefined();

      // Create second payment intent (idempotent operation)
      const pi2 = await paymentService.createPaymentIntent(
        booking._id.toString(),
        clientUser._id.toString(),
        7500,
        'USD'
      );

      let bookingAfterPI2 = await Booking.findById(booking._id);
      expect(bookingAfterPI2.status).toBe('confirmed');
      expect(bookingAfterPI2.payment.paidAt).toBeUndefined();

      // Both payment intents should have different IDs (not reused)
      expect(pi1.id).not.toEqual(pi2.id);
    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('payment.stripePaymentIntentId is NOT set during intent creation', async () => {
    const booking = await Booking.create({
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
      const paymentService = new PaymentService(mockAdapter);
      
      const paymentIntent = await paymentService.createPaymentIntent(
        booking._id.toString(),
        clientUser._id.toString(),
        10000, // $100 * 100 cents
        'USD'
      );

      // The booking should NOT have the payment intent ID stored
      // (That happens only on webhook/confirmation)
      const bookingAfter = await Booking.findById(booking._id);
      expect(bookingAfter.payment.stripePaymentIntentId).toBeUndefined();

      // But the adapter received it correctly
      expect(mockAdapter.lastPaymentIntentParams.metadata.bookingId).toBe(booking._id.toString());
    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });

  it('booking remains queryable after PaymentIntent creation', async () => {
    const booking = await Booking.create({
      clientId: clientUser._id,
      expertId: expert._id,
      serviceId: service._id,
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      duration: 60,
      endTime: new Date(Date.now() + 50 * 3600 * 1000),
      timezone: 'UTC',
      status: 'confirmed',
      pricing: {
        baseAmount: 25.00,
        platformFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        currency: 'USD'
      },
      totalAmount: 25.00,
      payment: {}
    });

    try {
      const paymentService = new PaymentService(mockAdapter);
      
      await paymentService.createPaymentIntent(
        booking._id.toString(),
        clientUser._id.toString(),
        2500,
        'USD'
      );

      // Query the booking by various fields
      const byId = await Booking.findById(booking._id);
      expect(byId).toBeDefined();
      expect(byId.status).toBe('confirmed');

      const byClient = await Booking.findOne({ clientId: clientUser._id, _id: booking._id });
      expect(byClient).toBeDefined();

      const byExpert = await Booking.findOne({ expertId: expert._id, _id: booking._id });
      expect(byExpert).toBeDefined();

      // Populate should work correctly
      const populated = await Booking.findById(booking._id)
        .populate('expertId')
        .populate('clientId');
      expect(populated.expertId).toBeDefined();
      expect(populated.expertId.userId).toBeDefined();
      expect(populated.clientId).toBeDefined();
    } finally {
      await Booking.deleteOne({ _id: booking._id });
    }
  });
});
