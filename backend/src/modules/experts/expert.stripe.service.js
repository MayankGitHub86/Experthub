/**
 * Expert Stripe Service
 * 
 * Handles Stripe Connect Accounts v2 expert onboarding and account management:
 * - Create connected accounts for experts
 * - Generate onboarding links
 * - Sync account status and capabilities
 * - Verify readiness for payments
 * 
 * References:
 * - Stripe Accounts API v2: https://stripe.com/docs/connect/rest-api/accounts
 * - Account Capabilities: https://stripe.com/docs/connect/capabilities
 */

import stripe from 'stripe';
import config from '../../config/environment.js';
import { AppError } from '../../middleware/errorHandler.js';
import Expert from '../../models/Expert.js';
import User from '../../models/User.js';
import { logger } from '../../utils/logger.js';

const stripeClient = new stripe(config.stripe.secretKey);

class ExpertStripeService {
  /**
   * Validate Stripe platform configuration
   * 
   * Ensures platform is ready to onboard experts
   * 
   * @throws AppError if configuration incomplete
   */
  validatePlatformConfig() {
    if (!config.stripe.secretKey) {
      throw new AppError(
        'Stripe platform not configured: STRIPE_SECRET_KEY missing',
        500
      );
    }

    if (!config.stripe.platformCountry) {
      throw new AppError(
        'Stripe platform not configured: STRIPE_PLATFORM_COUNTRY missing. ' +
        'Required to create connected accounts. Set this to your legal entity country (e.g., "US", "GB", "CA").',
        500
      );
    }

    // Note: STRIPE_PLATFORM_ACCOUNT_ID is optional (uses default account if not set)
  }

  /**
   * Create a Stripe Connected Account for expert
   * 
   * Uses Accounts v2 API to create account with:
   * - Required capabilities: card_payments, transfers
   * - Expert metadata for reconciliation
   * - Deferred onboarding (expert completes via link)
   * 
   * @param {string} expertId - Expert MongoDB ID
   * @param {object} options - Account creation options
   * @returns {object} Connected account with setup requirements
   * @throws AppError if expert not found, already has account, or Stripe error
   */
  async createConnectedAccount(expertId, options = {}) {
    // Validate platform
    this.validatePlatformConfig();

    // Fetch expert
    const expert = await Expert.findById(expertId).populate('userId');

    if (!expert) {
      throw new AppError('Expert not found', 404);
    }

    if (expert.stripeAccountId) {
      throw new AppError(
        'Expert already has a connected Stripe account',
        400
      );
    }

    const user = expert.userId;

    try {
      // Create connected account (Accounts v2)
      // Reference: https://stripe.com/docs/connect/rest-api/accounts/create
      const account = await stripeClient.accounts.create({
        type: 'express', // Express: Stripe hosts onboarding, we control branding
        country: config.stripe.platformCountry,
        email: user.email,
        
        // Business information (collected via onboarding)
        metadata: {
          expertId: expertId.toString(),
          userId: user._id.toString(),
          platform: 'ExpertHub',
          accountType: 'expert',
        },

        // Capabilities required for payments
        // Explicit request per Accounts v2
        capabilities: {
          card_payments: {
            requested: true, // Expert must enable during onboarding
          },
          payouts: {
            requested: true, // Expert must verify payout details
          },
          transfers: {
            requested: true, // Platform needs to transfer funds
          },
        },

        // Legal entity information (if available)
        ...(options.legalEntity && {
          individual: {
            first_name: options.legalEntity.firstName || user.firstName,
            last_name: options.legalEntity.lastName || user.lastName,
            email: options.legalEntity.email || user.email,
            dob: options.legalEntity.dob || null,
            address: options.legalEntity.address || null,
            verification: options.legalEntity.verification || null,
          },
        }),

        // Company information (if expert is company)
        ...(options.company && {
          business_type: options.company.type || 'individual', // individual, sole_proprietorship, partnership, corporation
          company: {
            name: options.company.name,
            tax_id: options.company.taxId,
          },
        }),

        // Settings
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly', // Weekly payouts
              anchor_weekday: 'friday', // Anchor to Friday
            },
            debit_negative_balances: false,
          },
        },

        // Support email for Stripe to contact platform
        support_email: options.supportEmail || config.email.from,
      });

      // Update expert with Stripe account ID
      expert.stripeAccountId = account.id;
      expert.stripeOnboardingComplete = false;

      // Initialize capabilities (marked as unrequested until verified)
      expert.stripeAccountCapabilities = {
        card_payments: 'pending_verification',
        payouts: 'pending_verification',
        transfers: 'pending_verification',
      };

      await expert.save();

      logger.info('Created Stripe connected account for expert', {
        expertId,
        stripeAccountId: account.id,
        country: config.stripe.platformCountry,
        requirements: account.requirements,
      });

      return {
        success: true,
        account: {
          id: account.id,
          country: account.country,
          type: account.type,
          email: account.email,
          metadata: account.metadata,
          capabilities: account.capabilities,
          requirements: account.requirements, // What expert must provide
          charges_enabled: account.charges_enabled, // Can receive charges
          payouts_enabled: account.payouts_enabled, // Can receive payouts
        },
      };
    } catch (error) {
      logger.error('Failed to create connected account', {
        expertId,
        error: error.message,
        stripeCode: error.code,
      });

      throw new AppError(
        `Failed to create connected account: ${error.message}`,
        error.statusCode || 500
      );
    }
  }

  /**
   * Create an onboarding link for expert
   * 
   * Generates Stripe-hosted onboarding URL where expert completes:
   * - Legal entity verification
   * - Payout details (bank account)
   * - Business information
   * - Required documents
   * 
   * Reference: https://stripe.com/docs/connect/rest-api/account-links/create
   * 
   * @param {string} expertId - Expert MongoDB ID
   * @param {string} returnUrl - URL to redirect after onboarding
   * @returns {object} Onboarding link and account status
   * @throws AppError if expert not found, no Stripe account, or Stripe error
   */
  async createOnboardingLink(expertId, returnUrl) {
    // Fetch expert
    const expert = await Expert.findById(expertId);

    if (!expert) {
      throw new AppError('Expert not found', 404);
    }

    if (!expert.stripeAccountId) {
      throw new AppError(
        'Expert has no Stripe account. Create one first via createConnectedAccount.',
        400
      );
    }

    try {
      // Create account link (Accounts v2)
      // Reference: https://stripe.com/docs/connect/rest-api/account-links/create
      const accountLink = await stripeClient.accountLinks.create({
        account: expert.stripeAccountId,
        type: 'account_onboarding', // or 'account_update' to modify existing
        return_url: returnUrl || `${config.baseUrl}/api/v1/experts/${expertId}/stripe/onboarding-complete`,
        refresh_url: `${config.baseUrl}/api/v1/experts/${expertId}/stripe/create-onboarding-link`,
        
        // Metadata for tracking
        collect: 'eventually', // Let Stripe enforce requirements gradually
      });

      logger.info('Created onboarding link', {
        expertId,
        stripeAccountId: expert.stripeAccountId,
        expiresAt: new Date(accountLink.expires_at * 1000),
      });

      return {
        success: true,
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000),
        account: {
          id: expert.stripeAccountId,
          onboardingComplete: expert.stripeOnboardingComplete,
          payoutsEnabled: expert.stripePayoutsEnabled,
        },
      };
    } catch (error) {
      logger.error('Failed to create onboarding link', {
        expertId,
        stripeAccountId: expert.stripeAccountId,
        error: error.message,
      });

      throw new AppError(
        `Failed to create onboarding link: ${error.message}`,
        error.statusCode || 500
      );
    }
  }

  /**
   * Sync account status from Stripe
   * 
   * Fetches current account status and updates:
   * - Capabilities (card_payments, payouts, transfers)
   * - Onboarding completion status
   * - Payout enablement
   * - Requirements (what expert still needs to provide)
   * 
   * Should be called:
   * - After expert completes onboarding
   * - Periodically to check status
   * - Before processing payments
   * 
   * @param {string} expertId - Expert MongoDB ID
   * @returns {object} Updated expert account status
   * @throws AppError if expert not found, no Stripe account, or Stripe error
   */
  async syncAccountStatus(expertId) {
    // Fetch expert
    const expert = await Expert.findById(expertId);

    if (!expert) {
      throw new AppError('Expert not found', 404);
    }

    if (!expert.stripeAccountId) {
      throw new AppError(
        'Expert has no Stripe account',
        400
      );
    }

    try {
      // Fetch account from Stripe
      const account = await stripeClient.accounts.retrieve(expert.stripeAccountId);

      // Map capability status from Stripe
      // Stripe v2 capabilities have status: 'active', 'inactive', 'unrequested', 'pending_verification'
      const mapCapabilityStatus = (capability) => {
        if (!capability) return 'unrequested';
        if (capability.active) return 'active';
        if (capability.disabled) return 'inactive';
        if (capability.requirements?.current_deadline) return 'pending_verification';
        return 'inactive';
      };

      // Update expert capabilities
      expert.stripeAccountCapabilities = {
        card_payments: mapCapabilityStatus(account.capabilities?.card_payments),
        payouts: mapCapabilityStatus(account.capabilities?.payouts),
        transfers: mapCapabilityStatus(account.capabilities?.transfers),
      };

      // Update payout/charges flags
      expert.stripePayoutsEnabled = account.payouts_enabled || false;
      expert.stripeChargesEnabled = account.charges_enabled || false;

      // Mark onboarding complete if key capabilities are active
      const chargesActive = account.capabilities?.card_payments?.active || false;
      const payoutsActive = account.capabilities?.payouts?.active || false;

      expert.stripeOnboardingComplete = chargesActive && payoutsActive;

      await expert.save();

      logger.info('Synced Stripe account status', {
        expertId,
        stripeAccountId: expert.stripeAccountId,
        chargesEnabled: expert.stripeChargesEnabled,
        payoutsEnabled: expert.stripePayoutsEnabled,
        onboardingComplete: expert.stripeOnboardingComplete,
        capabilities: expert.stripeAccountCapabilities,
        requirements: account.requirements,
      });

      return {
        success: true,
        account: {
          id: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          onboardingComplete: expert.stripeOnboardingComplete,
          capabilities: expert.stripeAccountCapabilities,
          requirements: account.requirements, // What still needs to be provided
          requirementsDue: account.requirements?.current_deadline
            ? new Date(account.requirements.current_deadline * 1000)
            : null,
        },
      };
    } catch (error) {
      logger.error('Failed to sync account status', {
        expertId,
        stripeAccountId: expert.stripeAccountId,
        error: error.message,
      });

      throw new AppError(
        `Failed to sync account status: ${error.message}`,
        error.statusCode || 500
      );
    }
  }

  /**
   * Check if expert is ready for payments
   * 
   * Verifies:
   * - Stripe account exists
   * - Card payments capability is active
   * - Expert is verified
   * 
   * @param {string} expertId - Expert MongoDB ID
   * @returns {object} Readiness status with details
   */
  async checkPaymentReadiness(expertId) {
    const expert = await Expert.findById(expertId);

    if (!expert) {
      throw new AppError('Expert not found', 404);
    }

    const readiness = {
      ready: true,
      expertId,
      issues: [],
      warnings: [],
      details: {
        hasStripeAccount: !!expert.stripeAccountId,
        cardPaymentsActive: expert.stripeAccountCapabilities?.card_payments === 'active',
        payoutsActive: expert.stripeAccountCapabilities?.payouts === 'active',
        chargesEnabled: expert.stripeChargesEnabled,
        payoutsEnabled: expert.stripePayoutsEnabled,
        expertVerified: expert.verificationStatus === 'approved',
      },
    };

    // Check for issues
    if (!expert.stripeAccountId) {
      readiness.ready = false;
      readiness.issues.push('No Stripe account connected');
    }

    if (expert.stripeAccountCapabilities?.card_payments !== 'active') {
      readiness.ready = false;
      readiness.issues.push('Card payments capability not active');
    }

    if (!expert.stripeChargesEnabled) {
      readiness.ready = false;
      readiness.issues.push('Stripe charges not enabled');
    }

    if (expert.verificationStatus !== 'approved') {
      readiness.ready = false;
      readiness.issues.push(`Expert verification status: ${expert.verificationStatus}`);
    }

    // Check for warnings
    if (expert.stripeAccountCapabilities?.payouts !== 'active') {
      readiness.warnings.push('Payouts not enabled; expert may not receive funds');
    }

    if (!expert.stripePayoutsEnabled) {
      readiness.warnings.push('Expert has not completed payout setup');
    }

    return readiness;
  }
}

export default new ExpertStripeService();
