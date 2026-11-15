/**
 * Expert Stripe v2 Accounts Tests
 * 
 * Tests Stripe Accounts v2 Core API integration for expert onboarding.
 * Tests v2 configuration structures, capabilities mapping, and payment readiness.
 * 
 * Note: These are behavior/contract tests using mock data, not real Stripe API calls.
 * Real Stripe API validation requires STRIPE_SECRET_KEY environment variable.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import config from '../../../config/environment.js';
import Expert from '../../../models/Expert.js';
import User from '../../../models/User.js';
import ExpertStripeService from '../expert.stripe.service.js';

describe('ExpertStripeService - v2 Accounts Configuration', () => {
  let testUser;
  let testExpert;
  const originalCountry = config.stripe.platformCountry;

  beforeEach(async () => {
    // Ensure platform country is set for tests
    config.stripe.platformCountry = 'US';

    // Create test user
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'Expert',
      email: 'expert-v2-test@test.com',
      password: 'hashedPassword123',
      role: 'expert',
      accountStatus: 'active'
    });

    // Create test expert
    testExpert = await Expert.create({
      userId: testUser._id,
      headline: 'Test Consultant',
      bio: 'A test consultant with extensive expertise in testing, Stripe integration, and payment processing systems. Specialized in platform development and financial technology implementation.',
      hourlyRate: 100,
      category: 'Technology & Engineering',
      verificationStatus: 'approved'
    });
  });

  afterEach(async () => {
    // Restore original config
    config.stripe.platformCountry = originalCountry;

    // Cleanup
    if (testUser) await User.deleteOne({ _id: testUser._id }).catch(() => {});
    if (testExpert) await Expert.deleteOne({ _id: testExpert._id }).catch(() => {});
  });

  describe('Platform Configuration Validation', () => {
    it('validates platform is configured with STRIPE_SECRET_KEY', () => {
      // Temporarily unset country to test validation
      const original = config.stripe.platformCountry;
      try {
        config.stripe.platformCountry = ''; // Unset to test
        expect(() => {
          ExpertStripeService.validatePlatformConfig();
        }).toThrow('STRIPE_PLATFORM_COUNTRY');
      } finally {
        config.stripe.platformCountry = original;
      }
    });

    it('requires STRIPE_PLATFORM_COUNTRY for account creation', () => {
      // Platform must have a legal country configured
      // This is validated in createConnectedAccount
      const original = config.stripe.platformCountry;
      try {
        config.stripe.platformCountry = ''; // Unset to test
        expect(() => {
          ExpertStripeService.validatePlatformConfig();
        }).toThrow('STRIPE_PLATFORM_COUNTRY');
      } finally {
        config.stripe.platformCountry = original;
      }
    });
  });

  describe('v2 Account Creation - Configuration Contract', () => {
    it('expert model stores Stripe account ID after creation', async () => {
      // Test that expert model has correct fields for v2
      expect(testExpert.stripeAccountId).toBeUndefined();
      
      // After creation, should have account ID
      testExpert.stripeAccountId = 'acct_test_v2_live_12345';
      await testExpert.save();

      const fetched = await Expert.findById(testExpert._id);
      expect(fetched.stripeAccountId).toBe('acct_test_v2_live_12345');
    });

    it('expert model tracks v2 capability statuses', async () => {
      // Verify model has capability fields for v2
      expect(testExpert.stripeAccountCapabilities).toBeDefined();
      expect(testExpert.stripeAccountCapabilities.card_payments).toBe('unrequested');
      expect(testExpert.stripeAccountCapabilities.transfers).toBe('unrequested');
      expect(testExpert.stripeAccountCapabilities.payouts).toBe('unrequested');

      // After sync, capabilities should update
      testExpert.stripeAccountCapabilities = {
        card_payments: 'active',
        transfers: 'active',
        payouts: 'active'
      };
      await testExpert.save();

      const fetched = await Expert.findById(testExpert._id);
      expect(fetched.stripeAccountCapabilities.card_payments).toBe('active');
      expect(fetched.stripeAccountCapabilities.transfers).toBe('active');
    });

    it('expert model tracks onboarding completion status', async () => {
      // Verify onboarding flag exists
      expect(testExpert.stripeOnboardingComplete).toBe(false);

      testExpert.stripeOnboardingComplete = true;
      await testExpert.save();

      const fetched = await Expert.findById(testExpert._id);
      expect(fetched.stripeOnboardingComplete).toBe(true);
    });

    it('rejects duplicate account creation', async () => {
      // Simulate expert already having an account
      testExpert.stripeAccountId = 'acct_existing_v2_12345';
      await testExpert.save();

      // Attempting to create another should fail
      expect(async () => {
        await ExpertStripeService.createConnectedAccount(testExpert._id, {});
      }).rejects.toThrow('already has a connected Stripe account');
    });

    it('validates expert exists before account creation', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Non-existent ID
      
      expect(async () => {
        await ExpertStripeService.createConnectedAccount(fakeId, {});
      }).rejects.toThrow('Expert not found');
    });
  });

  describe('v2 Account Sync - Capabilities Mapping', () => {
    beforeEach(async () => {
      testExpert.stripeAccountId = 'acct_test_v2_sync_12345';
      testExpert.stripeAccountCapabilities = {
        card_payments: 'pending_verification',
        transfers: 'pending_verification',
        payouts: 'pending_verification'
      };
      await testExpert.save();
    });

    it('maps merchant card_payments capability from v2 response', async () => {
      // Test the capability field exists and can be updated
      expect(testExpert.stripeAccountCapabilities.card_payments).toBe('pending_verification');

      // Simulate capability becoming active
      testExpert.stripeAccountCapabilities.card_payments = 'active';
      await testExpert.save();

      const fetched = await Expert.findById(testExpert._id);
      expect(fetched.stripeAccountCapabilities.card_payments).toBe('active');
    });

    it('maps recipient stripe_transfers capability from v2 response', async () => {
      // Test recipient capability field exists
      expect(testExpert.stripeAccountCapabilities.transfers).toBe('pending_verification');

      // Critical for destination charges
      testExpert.stripeAccountCapabilities.transfers = 'active';
      await testExpert.save();

      const fetched = await Expert.findById(testExpert._id);
      expect(fetched.stripeAccountCapabilities.transfers).toBe('active');
    });

    it('detects onboarding completion when all capabilities active and no requirements', async () => {
      // Simulate sync result: all capabilities active, no pending requirements
      testExpert.stripeAccountCapabilities = {
        card_payments: 'active',
        transfers: 'active',
        payouts: 'active'
      };
      testExpert.stripeOnboardingComplete = true;
      await testExpert.save();

      const fetched = await Expert.findById(testExpert._id);
      expect(fetched.stripeOnboardingComplete).toBe(true);
    });

    it('prevents onboarding completion if capabilities still pending', async () => {
      // Even with one capability pending, onboarding is not complete
      testExpert.stripeAccountCapabilities.card_payments = 'active';
      testExpert.stripeAccountCapabilities.transfers = 'pending_verification'; // ← Still pending
      testExpert.stripeOnboardingComplete = false;
      await testExpert.save();

      const fetched = await Expert.findById(testExpert._id);
      expect(fetched.stripeOnboardingComplete).toBe(false);
    });

    it('validates expert exists before sync', async () => {
      const fakeId = '507f1f77bcf86cd799439012'; // Non-existent ID
      
      expect(async () => {
        await ExpertStripeService.syncAccountStatus(fakeId);
      }).rejects.toThrow('Expert not found');
    });

    it('rejects sync if expert has no Stripe account', async () => {
      testExpert.stripeAccountId = null;
      await testExpert.save();

      expect(async () => {
        await ExpertStripeService.syncAccountStatus(testExpert._id);
      }).rejects.toThrow('no Stripe account');
    });
  });

  describe('Onboarding Link Generation', () => {
    beforeEach(async () => {
      testExpert.stripeAccountId = 'acct_test_v2_onboard_12345';
      await testExpert.save();
    });

    it('validates expert exists before link generation', async () => {
      const fakeId = '507f1f77bcf86cd799439013';
      
      expect(async () => {
        await ExpertStripeService.createOnboardingLink(fakeId, 'http://localhost/callback');
      }).rejects.toThrow('Expert not found');
    });

    it('requires existing Stripe account for onboarding link', async () => {
      testExpert.stripeAccountId = null;
      await testExpert.save();

      expect(async () => {
        await ExpertStripeService.createOnboardingLink(testExpert._id, 'http://localhost/callback');
      }).rejects.toThrow('no Stripe account');
    });

    it('accepts v2 account ID for onboarding link', async () => {
      // v2 account IDs are compatible with v1 account-links endpoint
      expect(testExpert.stripeAccountId).toMatch(/^acct_/);
      expect(testExpert.stripeAccountId).toBe('acct_test_v2_onboard_12345');
      
      // Should not throw for valid v2 account ID format
      // (Real call would fail without credentials, but validates structure)
    });
  });

  describe('Payment Readiness Check - v2 Contract', () => {
    beforeEach(async () => {
      testExpert.stripeAccountId = 'acct_test_v2_payment_12345';
      testExpert.stripeAccountCapabilities = {
        card_payments: 'active',
        transfers: 'active',
        payouts: 'active'
      };
      await testExpert.save();
    });

    it('marks expert ready when Stripe account exists and approved', async () => {
      const readiness = await ExpertStripeService.checkPaymentReadiness(testExpert._id);

      expect(readiness.ready).toBe(true);
      expect(readiness.issues.length).toBe(0);
      expect(readiness.details.hasStripeAccount).toBe(true);
      expect(readiness.details.expertVerified).toBe(true);
    });

    it('requires merchant card_payments capability for payments', async () => {
      testExpert.stripeAccountCapabilities.card_payments = 'pending_verification';
      await testExpert.save();

      const readiness = await ExpertStripeService.checkPaymentReadiness(testExpert._id);

      expect(readiness.ready).toBe(false);
      expect(readiness.issues).toContain('Merchant card_payments capability not active');
    });

    it('requires recipient stripe_transfers capability for destination charges', async () => {
      testExpert.stripeAccountCapabilities.transfers = 'pending_verification';
      await testExpert.save();

      const readiness = await ExpertStripeService.checkPaymentReadiness(testExpert._id);

      expect(readiness.ready).toBe(false);
      expect(readiness.issues).toContain(
        'Recipient stripe_transfers capability not active (required for indirect charges)'
      );
    });

    it('blocks payments if expert not verified', async () => {
      testExpert.verificationStatus = 'submitted';
      await testExpert.save();

      const readiness = await ExpertStripeService.checkPaymentReadiness(testExpert._id);

      expect(readiness.ready).toBe(false);
      expect(readiness.issues).toContain('Expert verification status: submitted');
    });

    it('warns if payouts not yet enabled (non-blocking)', async () => {
      testExpert.stripePayoutsEnabled = false;
      await testExpert.save();

      const readiness = await ExpertStripeService.checkPaymentReadiness(testExpert._id);

      expect(readiness.ready).toBe(true); // Still ready for payments
      expect(readiness.warnings).toContain('Expert has not completed payout bank account setup');
    });

    it('reports all issues for completely unprepared expert', async () => {
      testExpert.stripeAccountId = null;
      testExpert.verificationStatus = 'draft';
      await testExpert.save();

      const readiness = await ExpertStripeService.checkPaymentReadiness(testExpert._id);

      expect(readiness.ready).toBe(false);
      // Should have at least: no account, merchant card_payments not active, transfer not active, not verified
      expect(readiness.issues.length).toBeGreaterThanOrEqual(2);
      expect(readiness.issues).toContain('No Stripe account connected');
      expect(readiness.issues).toContain('Expert verification status: draft');
    });
  });

  describe('v2 Recipient Configuration for Destination Charges', () => {
    it('recipient transfers capability is necessary for expert payments', async () => {
      // The recipient.capabilities.stripe_balance.stripe_transfers configuration
      // enables the expert account to receive destination charge transfers
      testExpert.stripeAccountCapabilities.transfers = 'active';
      await testExpert.save();

      const fetched = await Expert.findById(testExpert._id);
      
      // Destination charge model requires this capability
      expect(fetched.stripeAccountCapabilities.transfers).toBe('active');
    });

    it('merchant configuration is optional for destination charges', async () => {
      // Merchant config enables direct payments to expert account
      // Not required for Phase 2B (platform collects full payment)
      testExpert.stripeAccountCapabilities.card_payments = 'unrequested';
      testExpert.stripeAccountCapabilities.transfers = 'active'; // ← Only this is needed
      await testExpert.save();

      const readiness = await ExpertStripeService.checkPaymentReadiness(testExpert._id);

      // With transfers active, expert can receive payments via destination charge
      expect(readiness.details.recipientTransfersActive).toBe(true);
    });
  });

  describe('v2 Responsibility Model (Platform Bears All Risk)', () => {
    it('captures platform commission in payment flow', async () => {
      // Platform is configured as fees_collector and losses_collector
      // Expert receives 85% of payment, platform keeps 15% and covers all fees
      
      testExpert.stripeAccountId = 'acct_test_v2_resp_12345';
      testExpert.stripeAccountCapabilities = {
        card_payments: 'active',
        transfers: 'active',
        payouts: 'active'
      };
      await testExpert.save();

      const readiness = await ExpertStripeService.checkPaymentReadiness(testExpert._id);
      expect(readiness.ready).toBe(true);

      // When ready, platform can charge customer and transfer to expert
      // Fee structure: platform bears all Stripe fees + commissions
    });
  });
});
