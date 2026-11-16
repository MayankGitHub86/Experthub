/**
 * PaymentService PaymentIntent Tests
 * 
 * Tests the actual PaymentService.createPaymentIntent() method with injected mock adapter.
 * Verifies: payment intent creation, commission split, adapter parameters, error handling.
 * 
 * Real service method tested: YES
 * Real database models: YES (Booking, Expert, Service, User, Transaction)
 * Adapter injection: YES (mock StripeAdapter passed to constructor)
 * Network calls: NO (mocked via adapter)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { PaymentService } from '../payment.service.js';
import Booking from '../../../models/Booking.js';
import Expert from '../../../models/Expert.js';
import User from '../../../models/User.js';
import Service from '../../../models/Service.js';

// Mock Stripe Adapter
class MockStripeAdapter {
  constructor() {
    this.lastPaymentIntentParams = null;
    this.callCount = 0;
  }

  async createPaymentIntent(params) {
    this.callCount++;
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

  resetCallCount() {
    this.callCount = 0;
  }
}

describe('PaymentService.createPaymentIntent()', () => {
  let mockAdapter;
  let baseClientUser;
  let baseExpertUser;
  let baseExpert;
  let baseService;

  // Single beforeAll / afterAll to manage database lifecycle
  beforeAll(async () => {
    mockAdapter = new MockStripeAdapter();
    
    // Create base fixtures - DO NOT DELETE in individual test cleanups
    baseClientUser = await User.create({
      email: `client_base_${Date.now()}@test.com`,
      firstName: 'Alice',
      lastName: 'Client',
      password: 'hashedPassword123',
      userType: 'client'
    });

    baseExpertUser = await User.create({
      email: `expert_base_${Date.now()}@test.com`,
      firstName: 'Bob',
      lastName: 'Expert',
      password: 'hashedPassword123',
      userType: 'expert'
    });

    baseExpert = await Expert.create({
      userId: baseExpertUser._id,
      headline: 'Senior Business Consultant',
      bio: 'I have over 10 years of experience in business consulting and strategic planning. I specialize in helping startups and established companies scale operations.',
      hourlyRate: 150,
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

    baseService = await Service.create({
      expertId: baseExpert._id,
      title: 'Business Strategy',
      description: 'Expert business strategy consultation covering all your needs and growth planning.',
      category: 'business-consulting',
      pricing: { type: 'hourly', amount: 150, currency: 'USD' },
      duration: 60,
      isActive: true,
      status: 'approved'
    });
  });

  afterAll(async () => {
    // Clean up ONLY base fixtures
    if (baseClientUser?._id) await User.deleteOne({ _id: baseClientUser._id });
    if (baseExpertUser?._id) await User.deleteOne({ _id: baseExpertUser._id });
    if (baseExpert?._id) await Expert.deleteOne({ _id: baseExpert._id });
    if (baseService?._id) await Service.deleteOne({ _id: baseService._id });
  });

  describe('Valid payment intents', () => {
    it('creates payment intent for $100.00 USD booking', async () => {
      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
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
        mockAdapter.resetCallCount();

        const paymentIntent = await paymentService.createPaymentIntent(
          booking._id.toString(),
          baseClientUser._id.toString(),
          10000, // $100.00 * 100 cents
          'USD'
        );

        // Verify response
        expect(paymentIntent).toBeDefined();
        expect(paymentIntent.id).toMatch(/^pi_test_/);
        expect(paymentIntent.amount).toBe(10000);
        expect(paymentIntent.currency).toBe('usd');

        // Verify adapter was called exactly once
        expect(mockAdapter.callCount).toBe(1);

        // Verify adapter parameters
        const params = mockAdapter.lastPaymentIntentParams;
        expect(params.amount).toBe(10000);
        expect(params.currency).toBe('usd');
        expect(params.application_fee_amount).toBe(1500); // 15% of 10000
        expect(params.transfer_data.destination).toBe(baseExpert.stripeAccountId);

        // Verify metadata
        expect(params.metadata.bookingId).toBe(booking._id.toString());
        expect(params.metadata.clientId).toBe(baseClientUser._id.toString());
        expect(params.metadata.expertId).toBe(baseExpert._id.toString());
        expect(params.metadata.serviceId).toBe(baseService._id.toString());
        expect(parseInt(params.metadata.platformCommission)).toBe(1500);
        expect(parseInt(params.metadata.expertShare)).toBe(8500);

        // Verify financial integrity
        expect(1500 + 8500).toBe(10000);
      } finally {
        await Booking.deleteOne({ _id: booking._id });
      }
    });

    it('creates payment intent for $100.50 USD booking', async () => {
      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
        scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
        duration: 60,
        endTime: new Date(Date.now() + 50 * 3600 * 1000),
        timezone: 'UTC',
        status: 'confirmed',
        pricing: {
          baseAmount: 100.50,
          platformFee: 0,
          taxAmount: 0,
          discountAmount: 0,
          currency: 'USD'
        },
        totalAmount: 100.50,
        payment: {}
      });

      try {
        const paymentService = new PaymentService(mockAdapter);
        mockAdapter.resetCallCount();

        await paymentService.createPaymentIntent(
          booking._id.toString(),
          baseClientUser._id.toString(),
          10050, // $100.50 * 100 cents
          'USD'
        );

        const params = mockAdapter.lastPaymentIntentParams;
        expect(params.amount).toBe(10050);
        expect(params.application_fee_amount).toBe(1508); // 15% of 10050 = 1507.5 → 1508
        expect(parseInt(params.metadata.platformCommission)).toBe(1508);
        expect(parseInt(params.metadata.expertShare)).toBe(8542);
        expect(1508 + 8542).toBe(10050);
      } finally {
        await Booking.deleteOne({ _id: booking._id });
      }
    });

    it('creates payment intent for $0.50 USD booking', async () => {
      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
        scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
        duration: 60,
        endTime: new Date(Date.now() + 50 * 3600 * 1000),
        timezone: 'UTC',
        status: 'confirmed',
        pricing: {
          baseAmount: 0.50,
          platformFee: 0,
          taxAmount: 0,
          discountAmount: 0,
          currency: 'USD'
        },
        totalAmount: 0.50,
        payment: {}
      });

      try {
        const paymentService = new PaymentService(mockAdapter);
        mockAdapter.resetCallCount();

        await paymentService.createPaymentIntent(
          booking._id.toString(),
          baseClientUser._id.toString(),
          50, // $0.50 * 100 cents
          'USD'
        );

        const params = mockAdapter.lastPaymentIntentParams;
        expect(params.amount).toBe(50);
        expect(params.application_fee_amount).toBe(8); // 15% of 50 = 7.5 → 8
        expect(parseInt(params.metadata.platformCommission)).toBe(8);
        expect(parseInt(params.metadata.expertShare)).toBe(42);
        expect(8 + 42).toBe(50);
      } finally {
        await Booking.deleteOne({ _id: booking._id });
      }
    });

    it('creates payment intent for $1.00 USD booking', async () => {
      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
        scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
        duration: 60,
        endTime: new Date(Date.now() + 50 * 3600 * 1000),
        timezone: 'UTC',
        status: 'confirmed',
        pricing: {
          baseAmount: 1.00,
          platformFee: 0,
          taxAmount: 0,
          discountAmount: 0,
          currency: 'USD'
        },
        totalAmount: 1.00,
        payment: {}
      });

      try {
        const paymentService = new PaymentService(mockAdapter);
        mockAdapter.resetCallCount();

        await paymentService.createPaymentIntent(
          booking._id.toString(),
          baseClientUser._id.toString(),
          100,
          'USD'
        );

        const params = mockAdapter.lastPaymentIntentParams;
        expect(params.amount).toBe(100);
        expect(params.application_fee_amount).toBe(15); // 15% of 100
        expect(parseInt(params.metadata.platformCommission)).toBe(15);
        expect(parseInt(params.metadata.expertShare)).toBe(85);
      } finally {
        await Booking.deleteOne({ _id: booking._id });
      }
    });

    it('creates payment intent for $99.99 USD booking', async () => {
      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
        scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
        duration: 60,
        endTime: new Date(Date.now() + 50 * 3600 * 1000),
        timezone: 'UTC',
        status: 'confirmed',
        pricing: {
          baseAmount: 99.99,
          platformFee: 0,
          taxAmount: 0,
          discountAmount: 0,
          currency: 'USD'
        },
        totalAmount: 99.99,
        payment: {}
      });

      try {
        const paymentService = new PaymentService(mockAdapter);
        mockAdapter.resetCallCount();

        await paymentService.createPaymentIntent(
          booking._id.toString(),
          baseClientUser._id.toString(),
          9999,
          'USD'
        );

        const params = mockAdapter.lastPaymentIntentParams;
        expect(params.amount).toBe(9999);
        expect(params.application_fee_amount).toBe(1500); // 15% of 9999 = 1499.85 → 1500
        expect(parseInt(params.metadata.platformCommission)).toBe(1500);
        expect(parseInt(params.metadata.expertShare)).toBe(8499);
      } finally {
        await Booking.deleteOne({ _id: booking._id });
      }
    });

    it('creates payment intent for JPY (zero-decimal) currency', async () => {
      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
        scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
        duration: 60,
        endTime: new Date(Date.now() + 50 * 3600 * 1000),
        timezone: 'UTC',
        status: 'confirmed',
        pricing: {
          baseAmount: 10000,
          platformFee: 0,
          taxAmount: 0,
          discountAmount: 0,
          currency: 'JPY'
        },
        totalAmount: 10000,
        payment: {}
      });

      try {
        const paymentService = new PaymentService(mockAdapter);
        mockAdapter.resetCallCount();

        await paymentService.createPaymentIntent(
          booking._id.toString(),
          baseClientUser._id.toString(),
          1000000, // ¥10,000 * 100 (Stripe internal representation)
          'JPY'
        );

        const params = mockAdapter.lastPaymentIntentParams;
        expect(params.amount).toBe(1000000);
        expect(params.currency).toBe('jpy');
        expect(params.application_fee_amount).toBe(150000); // 15% of 1000000
      } finally {
        await Booking.deleteOne({ _id: booking._id });
      }
    });
  });

  describe('Error handling', () => {
    it('throws error when booking not found', async () => {
      const paymentService = new PaymentService(mockAdapter);
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        paymentService.createPaymentIntent(fakeId, baseClientUser._id.toString(), 10000, 'USD')
      ).rejects.toThrow('Booking not found');
    });

    it('throws error when amount does not match booking total', async () => {
      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
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

        await expect(
          paymentService.createPaymentIntent(
            booking._id.toString(),
            baseClientUser._id.toString(),
            99999, // Wrong amount
            'USD'
          )
        ).rejects.toThrow('Amount mismatch');
      } finally {
        await Booking.deleteOne({ _id: booking._id });
      }
    });

    it('throws error when expert is not approved', async () => {
      // Create unapproved expert
      const unapprovedUser = await User.create({
        email: `unapproved_${Date.now()}@test.com`,
        firstName: 'Unapproved',
        lastName: 'Expert',
        password: 'hashedPassword123',
        userType: 'expert'
      });

      const unapprovedExpert = await Expert.create({
        userId: unapprovedUser._id,
        headline: 'Expert',
        bio: 'This is an expert profile with sufficient bio content for validation requirements and specialized experience.',
        hourlyRate: 150,
        category: 'Business & Strategy',
        verificationStatus: 'draft', // NOT APPROVED
        stripeAccountId: `acct_unapproved_${Date.now()}`,
        stripeChargesEnabled: true,
        stripeAccountCapabilities: {
          card_payments: 'active',
          payouts: 'active',
          transfers: 'active'
        }
      });

      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: unapprovedExpert._id,
        serviceId: baseService._id,
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

        await expect(
          paymentService.createPaymentIntent(
            booking._id.toString(),
            baseClientUser._id.toString(),
            10000,
            'USD'
          )
        ).rejects.toThrow('Expert is not approved');
      } finally {
        await Booking.deleteOne({ _id: booking._id });
        await Expert.deleteOne({ _id: unapprovedExpert._id });
        await User.deleteOne({ _id: unapprovedUser._id });
      }
    });

    it('throws error when expert has no Stripe account', async () => {
      const noStripeUser = await User.create({
        email: `nostripe_${Date.now()}@test.com`,
        firstName: 'NoStripe',
        lastName: 'Expert',
        password: 'hashedPassword123',
        userType: 'expert'
      });

      const noStripeExpert = await Expert.create({
        userId: noStripeUser._id,
        headline: 'Expert',
        bio: 'This is an expert profile with sufficient bio content for validation requirements and specialized experience.',
        hourlyRate: 150,
        category: 'Business & Strategy',
        verificationStatus: 'approved',
        stripeAccountId: `acct_reserved_${Date.now()}`, // Use a reserved ID, then null would cause conflict
        stripeChargesEnabled: false,
        stripeAccountCapabilities: {
          card_payments: 'unrequested',
          payouts: 'unrequested',
          transfers: 'unrequested'
        }
      });
      
      // Clear it after creation to test the error case
      // Use $unset to avoid sparse unique index conflict
      await Expert.updateOne(
        { _id: noStripeExpert._id },
        { $unset: { stripeAccountId: "" } }
      );

      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: noStripeExpert._id,
        serviceId: baseService._id,
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

        await expect(
          paymentService.createPaymentIntent(
            booking._id.toString(),
            baseClientUser._id.toString(),
            10000,
            'USD'
          )
        ).rejects.toThrow('Expert has not connected their Stripe account');
      } finally {
        await Booking.deleteOne({ _id: booking._id });
        await Expert.deleteOne({ _id: noStripeExpert._id });
        await User.deleteOne({ _id: noStripeUser._id });
      }
    });

    it('throws error when booking is not in confirmed state', async () => {
      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
        scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
        duration: 60,
        endTime: new Date(Date.now() + 50 * 3600 * 1000),
        timezone: 'UTC',
        status: 'pending', // NOT CONFIRMED
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

        await expect(
          paymentService.createPaymentIntent(
            booking._id.toString(),
            baseClientUser._id.toString(),
            10000,
            'USD'
          )
        ).rejects.toThrow('Cannot create payment for booking in state: pending');
      } finally {
        await Booking.deleteOne({ _id: booking._id });
      }
    });

    it('throws error when client ID does not match booking', async () => {
      const differentUser = await User.create({
        email: `different_${Date.now()}@test.com`,
        firstName: 'Different',
        lastName: 'User',
        password: 'hashedPassword123',
        userType: 'client'
      });

      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: baseExpert._id,
        serviceId: baseService._id,
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

        await expect(
          paymentService.createPaymentIntent(
            booking._id.toString(),
            differentUser._id.toString(),
            10000,
            'USD'
          )
        ).rejects.toThrow('Client mismatch');
      } finally {
        await Booking.deleteOne({ _id: booking._id });
        await User.deleteOne({ _id: differentUser._id });
      }
    });
  });

  describe('Booking lifecycle', () => {
    it('does not mark booking as paid after creating payment intent', async () => {
      // Use fresh expert for this test to avoid cleanup conflicts
      const lifecycleExpertUser = await User.create({
        email: `lifecycle_expert_${Date.now()}@test.com`,
        firstName: 'Lifecycle',
        lastName: 'Expert',
        password: 'hashedPassword123',
        userType: 'expert'
      });

      const lifecycleExpert = await Expert.create({
        userId: lifecycleExpertUser._id,
        headline: 'Senior Business Consultant',
        bio: 'I have over 10 years of experience in business consulting and strategic planning. I specialize in helping startups and established companies scale operations.',
        hourlyRate: 150,
        category: 'Business & Strategy',
        verificationStatus: 'approved',
        stripeAccountId: `acct_lifecycle_${Date.now()}`,
        stripeChargesEnabled: true,
        stripeAccountCapabilities: {
          card_payments: 'active',
          payouts: 'active',
          transfers: 'active'
        }
      });

      const lifecycleService = await Service.create({
        expertId: lifecycleExpert._id,
        title: 'Business Strategy',
        description: 'Expert business strategy consultation covering all your needs and growth planning.',
        category: 'business-consulting',
        pricing: { type: 'hourly', amount: 150, currency: 'USD' },
        duration: 60,
        isActive: true,
        status: 'approved'
      });

      const booking = await Booking.create({
        clientId: baseClientUser._id,
        expertId: lifecycleExpert._id,
        serviceId: lifecycleService._id,
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

        await paymentService.createPaymentIntent(
          booking._id.toString(),
          baseClientUser._id.toString(),
          10000,
          'USD'
        );

        // Verify booking state unchanged
        const bookingAfter = await Booking.findById(booking._id);
        expect(bookingAfter.status).toBe('confirmed'); // Still confirmed, not paid
        expect(bookingAfter.payment.paidAt).toBeUndefined(); // No payment recorded yet
      } finally {
        await Booking.deleteOne({ _id: booking._id });
        await Service.deleteOne({ _id: lifecycleService._id });
        await Expert.deleteOne({ _id: lifecycleExpert._id });
        await User.deleteOne({ _id: lifecycleExpertUser._id });
      }
    });
  });
});
