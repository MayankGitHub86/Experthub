/**
 * Expert Stripe Adapter - Accounts v2 Request Contract Tests
 * 
 * Tests the actual HTTP requests and response handling for Stripe Accounts v2.
 * Uses dependency injection: real service with a fake Stripe adapter.
 * Verifies:
 * - Exact HTTP methods (POST, GET)
 * - Exact endpoint paths (/v2/core/accounts)
 * - Request payload structure
 * - Response mapping
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import config from '../../../config/environment.js';
import Expert from '../../../models/Expert.js';
import User from '../../../models/User.js';
import { ExpertStripeService } from '../expert.stripe.service.js';
import StripeAdapter from '../../../utils/stripe.adapter.js';

/**
 * Fake Stripe Adapter - Records all calls for assertion
 */
class FakeStripeAdapter extends StripeAdapter {
  constructor() {
    super(null); // No real client
    this.calls = [];
    this.accountStatus = 'active';
    this.currentlyDueRequirements = [];
  }

  recordCall(method, endpoint, payload = null, options = null) {
    this.calls.push({ method, endpoint, payload, options });
  }

  setAccountStatus(status) {
    this.accountStatus = status;
  }

  setRequirements(requirements) {
    this.currentlyDueRequirements = requirements;
  }

  async createAccount(accountData) {
    this.recordCall('POST', '/v2/core/accounts', accountData);

    return {
      id: 'acct_test_v2_abc123def456',
      object: 'account',
      type: 'custom',
      business_type: 'individual',
      configuration: {
        merchant: {
          capabilities: {
            card_payments: {
              status: this.accountStatus,
              requested: true
            }
          }
        },
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                status: this.accountStatus,
                requested: true
              }
            }
          }
        }
      },
      identity: {
        country: 'US',
        entity_type: 'individual'
      },
      metadata: accountData.metadata,
      requirements: {
        currently_due: this.currentlyDueRequirements,
        eventually_due: [],
        current_deadline: null,
        past_due: []
      }
    };
  }

  async retrieveAccount(accountId, options = {}) {
    this.recordCall('GET', `/v2/core/accounts/${accountId}`, null, options);

    return {
      id: accountId,
      object: 'account',
      type: 'custom',
      configuration: {
        merchant: {
          capabilities: {
            card_payments: {
              status: this.accountStatus,
              requested: true
            }
          }
        },
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                status: this.accountStatus,
                requested: true
              }
            }
          }
        }
      },
      requirements: {
        currently_due: this.currentlyDueRequirements,
        eventually_due: [],
        current_deadline: null
      }
    };
  }

  async createAccountLink(accountId, options = {}) {
    this.recordCall('POST', '/v1/account-links', { account: accountId, ...options });

    return {
      object: 'account_link',
      account: accountId,
      url: 'https://connect.stripe.com/onboarding/acct_test_v2_abc123def456',
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      type: 'account_onboarding'
    };
  }

  getLastCall() {
    return this.calls[this.calls.length - 1];
  }

  getAllCalls() {
    return this.calls;
  }

  clearCalls() {
    this.calls = [];
  }
}

describe('Expert Stripe Adapter - Accounts v2 Contract Verification', () => {
  let fakeAdapter;
  let service;
  let testUser;
  let testExpert;
  const originalCountry = config.stripe.platformCountry;

  beforeEach(async () => {
    config.stripe.platformCountry = 'US';
    fakeAdapter = new FakeStripeAdapter();
    service = new ExpertStripeService(fakeAdapter);

    testUser = await User.create({
      firstName: 'Alice',
      lastName: 'Expert',
      email: 'alice-test@example.com',
      password: 'hashedPwd123456', // At least 8 characters
      role: 'expert',
      accountStatus: 'active'
    });

    testExpert = await Expert.create({
      userId: testUser._id,
      headline: 'Blockchain Consultant',
      bio: 'Expert with 15 years of experience in distributed systems and blockchain technology implementation across Fortune 500 companies.',
      hourlyRate: 250,
      category: 'Technology & Engineering',
      verificationStatus: 'approved'
    });
  });

  afterEach(async () => {
    config.stripe.platformCountry = originalCountry;
    if (testUser) await User.deleteOne({ _id: testUser._id }).catch(() => {});
    if (testExpert) await Expert.deleteOne({ _id: testExpert._id }).catch(() => {});
  });

  describe('POST /v2/core/accounts - Account Creation Request Contract', () => {
    it('sends POST request to /v2/core/accounts endpoint', async () => {
      await service.createConnectedAccount(testExpert._id);

      const lastCall = fakeAdapter.getLastCall();
      expect(lastCall.method).toBe('POST');
      expect(lastCall.endpoint).toBe('/v2/core/accounts');
    });

    it('includes required identity fields in payload', async () => {
      await service.createConnectedAccount(testExpert._id);

      const payload = fakeAdapter.getLastCall().payload;
      expect(payload.identity).toBeDefined();
      expect(payload.identity.country).toBe('us'); // Lowercase
      expect(payload.identity.entity_type).toBe('individual');
      expect(payload.identity.individual_details).toBeDefined();
      expect(payload.identity.individual_details.first_name).toBe('Alice');
      expect(payload.identity.individual_details.last_name).toBe('Expert');
    });

    it('includes merchant configuration with card_payments capability requested', async () => {
      await service.createConnectedAccount(testExpert._id);

      const payload = fakeAdapter.getLastCall().payload;
      expect(payload.configuration).toBeDefined();
      expect(payload.configuration.merchant).toBeDefined();
      expect(payload.configuration.merchant.capabilities).toBeDefined();
      expect(payload.configuration.merchant.capabilities.card_payments).toBeDefined();
      expect(payload.configuration.merchant.capabilities.card_payments.requested).toBe(true);
    });

    it('includes recipient configuration with stripe_transfers capability requested', async () => {
      await service.createConnectedAccount(testExpert._id);

      const payload = fakeAdapter.getLastCall().payload;
      expect(payload.configuration.recipient).toBeDefined();
      expect(payload.configuration.recipient.capabilities).toBeDefined();
      expect(payload.configuration.recipient.capabilities.stripe_balance).toBeDefined();
      expect(payload.configuration.recipient.capabilities.stripe_balance.stripe_transfers).toBeDefined();
      expect(payload.configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested).toBe(true);
    });

    it('sets platform as fees_collector and losses_collector', async () => {
      await service.createConnectedAccount(testExpert._id);

      const payload = fakeAdapter.getLastCall().payload;
      expect(payload.defaults).toBeDefined();
      expect(payload.defaults.responsibilities).toBeDefined();
      expect(payload.defaults.responsibilities.fees_collector).toBe('application');
      expect(payload.defaults.responsibilities.losses_collector).toBe('application');
    });

    it('sets dashboard to full access (not Express)', async () => {
      await service.createConnectedAccount(testExpert._id);

      const payload = fakeAdapter.getLastCall().payload;
      expect(payload.dashboard).toBe('full');
    });

    it('includes correct metadata for tracking', async () => {
      await service.createConnectedAccount(testExpert._id);

      const payload = fakeAdapter.getLastCall().payload;
      expect(payload.metadata).toBeDefined();
      expect(payload.metadata.expertId).toBe(testExpert._id.toString());
      expect(payload.metadata.userId).toBe(testUser._id.toString());
      expect(payload.metadata.platform).toBe('ExpertHub');
      expect(payload.metadata.accountType).toBe('expert');
    });

    it('requests full response with include parameters', async () => {
      await service.createConnectedAccount(testExpert._id);

      const payload = fakeAdapter.getLastCall().payload;
      expect(payload.include).toContain('configuration.merchant');
      expect(payload.include).toContain('configuration.recipient');
      expect(payload.include).toContain('identity');
      expect(payload.include).toContain('requirements');
    });

    it('stores response account ID in expert model', async () => {
      await service.createConnectedAccount(testExpert._id);

      const updated = await Expert.findById(testExpert._id);
      expect(updated.stripeAccountId).toBe('acct_test_v2_abc123def456');
    });

    it('maps v2 capabilities to expert model correctly', async () => {
      fakeAdapter.setAccountStatus('active');
      await service.createConnectedAccount(testExpert._id);

      const updated = await Expert.findById(testExpert._id);
      expect(updated.stripeAccountCapabilities.card_payments).toBe('active');
      expect(updated.stripeAccountCapabilities.transfers).toBe('active');
    });
  });

  describe('GET /v2/core/accounts/{accountId} - Account Retrieval Request Contract', () => {
    beforeEach(async () => {
      testExpert.stripeAccountId = 'acct_test_v2_abc123def456';
      await testExpert.save();
    });

    it('sends GET request to /v2/core/accounts/{accountId}', async () => {
      await service.syncAccountStatus(testExpert._id);

      const lastCall = fakeAdapter.getLastCall();
      expect(lastCall.method).toBe('GET');
      expect(lastCall.endpoint).toBe('/v2/core/accounts/acct_test_v2_abc123def456');
    });

    it('includes query parameters requesting configuration and requirements', async () => {
      await service.syncAccountStatus(testExpert._id);

      const options = fakeAdapter.getLastCall().options;
      expect(options).toBeDefined();
      expect(options.query).toBeDefined();
      expect(options.query.include).toContain('configuration.merchant');
      expect(options.query.include).toContain('configuration.recipient');
      expect(options.query.include).toContain('requirements');
    });

    it('correctly extracts account ID from expert record', async () => {
      await service.syncAccountStatus(testExpert._id);

      const lastCall = fakeAdapter.getLastCall();
      expect(lastCall.endpoint).toContain('acct_test_v2_abc123def456');
    });

    it('maps active merchant card_payments capability', async () => {
      fakeAdapter.setAccountStatus('active');
      await service.syncAccountStatus(testExpert._id);

      const updated = await Expert.findById(testExpert._id);
      expect(updated.stripeAccountCapabilities.card_payments).toBe('active');
    });

    it('maps active recipient transfers capability', async () => {
      fakeAdapter.setAccountStatus('active');
      await service.syncAccountStatus(testExpert._id);

      const updated = await Expert.findById(testExpert._id);
      expect(updated.stripeAccountCapabilities.transfers).toBe('active');
    });

    it('detects onboarding complete when capabilities active and no requirements', async () => {
      fakeAdapter.setAccountStatus('active');
      fakeAdapter.setRequirements([]);
      await service.syncAccountStatus(testExpert._id);

      const updated = await Expert.findById(testExpert._id);
      expect(updated.stripeOnboardingComplete).toBe(true);
    });

    it('detects onboarding incomplete when requirements pending', async () => {
      fakeAdapter.setAccountStatus('active');
      fakeAdapter.setRequirements(['individual.first_name', 'individual.verification.document']);
      await service.syncAccountStatus(testExpert._id);

      const updated = await Expert.findById(testExpert._id);
      expect(updated.stripeOnboardingComplete).toBe(false);
    });

    it('detects onboarding incomplete when capabilities pending', async () => {
      fakeAdapter.setAccountStatus('pending_verification');
      fakeAdapter.setRequirements([]);
      await service.syncAccountStatus(testExpert._id);

      const updated = await Expert.findById(testExpert._id);
      expect(updated.stripeOnboardingComplete).toBe(false);
    });
  });

  describe('Account Link Compatibility - v1 Endpoint with v2 Account ID', () => {
    beforeEach(async () => {
      testExpert.stripeAccountId = 'acct_test_v2_abc123def456';
      await testExpert.save();
    });

    it('uses POST /v1/account-links endpoint', async () => {
      await service.createOnboardingLink(testExpert._id, 'https://return.example.com');

      const lastCall = fakeAdapter.getLastCall();
      expect(lastCall.method).toBe('POST');
      expect(lastCall.endpoint).toBe('/v1/account-links');
    });

    it('passes v2 account ID to account-links endpoint', async () => {
      await service.createOnboardingLink(testExpert._id, 'https://return.example.com');

      const lastCall = fakeAdapter.getLastCall();
      expect(lastCall.payload.account).toBe('acct_test_v2_abc123def456');
    });

    it('includes type account_onboarding', async () => {
      await service.createOnboardingLink(testExpert._id, 'https://return.example.com');

      const lastCall = fakeAdapter.getLastCall();
      expect(lastCall.payload.type).toBe('account_onboarding');
    });

    it('includes trusted return URL', async () => {
      await service.createOnboardingLink(testExpert._id, 'https://return.example.com');

      const lastCall = fakeAdapter.getLastCall();
      expect(lastCall.payload.return_url).toBe('https://return.example.com');
    });

    it('includes refresh URL for link expiration', async () => {
      await service.createOnboardingLink(testExpert._id, 'https://return.example.com');

      const lastCall = fakeAdapter.getLastCall();
      expect(lastCall.payload.refresh_url).toBeDefined();
      expect(lastCall.payload.refresh_url).toContain(testExpert._id.toString());
    });
  });

  describe('Payment Readiness - All Preconditions', () => {
    beforeEach(async () => {
      testExpert.stripeAccountId = 'acct_test_v2_abc123def456';
      testExpert.stripeChargesEnabled = true;
      testExpert.stripeAccountCapabilities = {
        card_payments: 'active',
        transfers: 'active',
        payouts: 'active'
      };
      await testExpert.save();
    });

    it('confirms ready when all conditions met', async () => {
      const readiness = await service.checkPaymentReadiness(testExpert._id);
      expect(readiness.ready).toBe(true);
      expect(readiness.issues.length).toBe(0);
    });

    it('blocks if no Stripe account', async () => {
      // Use $unset to avoid sparse unique index conflict
      await Expert.updateOne(
        { _id: testExpert._id },
        { $unset: { stripeAccountId: "" } }
      );

      const readiness = await service.checkPaymentReadiness(testExpert._id);
      expect(readiness.ready).toBe(false);
      expect(readiness.issues).toContain('No Stripe account connected');
    });

    it('blocks if card_payments capability not active', async () => {
      testExpert.stripeAccountCapabilities.card_payments = 'pending_verification';
      await testExpert.save();

      const readiness = await service.checkPaymentReadiness(testExpert._id);
      expect(readiness.ready).toBe(false);
    });

    it('blocks if transfers capability not active', async () => {
      testExpert.stripeAccountCapabilities.transfers = 'pending_verification';
      await testExpert.save();

      const readiness = await service.checkPaymentReadiness(testExpert._id);
      expect(readiness.ready).toBe(false);
    });

    it('blocks if expert not approved', async () => {
      testExpert.verificationStatus = 'submitted';
      await testExpert.save();

      const readiness = await service.checkPaymentReadiness(testExpert._id);
      expect(readiness.ready).toBe(false);
    });

    it('warns if payouts not enabled', async () => {
      testExpert.stripePayoutsEnabled = false;
      await testExpert.save();

      const readiness = await service.checkPaymentReadiness(testExpert._id);
      expect(readiness.ready).toBe(true);
      expect(readiness.warnings.length).toBeGreaterThan(0);
    });
  });
});
