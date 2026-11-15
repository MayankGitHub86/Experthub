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
      // Create connected account using Stripe Accounts v2 Core API
      // Reference: https://docs.stripe.com/connect/accounts-v2
      // Endpoint: POST /v2/core/accounts (v2 Core, not v1)
      
      const accountData = {
        contact_email: user.email,
        display_name: `${user.firstName} ${user.lastName}`.trim(),
        
        // Full Dashboard access (not Express restricted access)
        dashboard: 'full',
        
        // Legal entity information (v2 identity structure)
        identity: {
          country: config.stripe.platformCountry.toLowerCase(),
          entity_type: options.company ? 'company' : 'individual',
          
          ...(options.company ? {
            business_details: {
              registered_name: options.company.name,
              tax_id: options.company.taxId,
            }
          } : {
            individual_details: {
              first_name: options.legalEntity?.firstName || user.firstName,
              last_name: options.legalEntity?.lastName || user.lastName,
              dob: options.legalEntity?.dob || null,
              address: options.legalEntity?.address || null,
            }
          }),
        },
        
        // Account configuration (v2): Merchant receives payments, Recipient receives transfers
        configuration: {
          merchant: {
            capabilities: {
              card_payments: {
                requested: true,
              },
            },
          },
          // Recipient configuration for indirect charges (destination transfers)
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: {
                  requested: true,
                },
              },
            },
          },
        },
        
        // Responsibility model: Platform bears fee/loss responsibility
        defaults: {
          currency: 'usd',
          responsibilities: {
            fees_collector: 'application',      // Platform pays Stripe fees
            losses_collector: 'application',    // Platform covers losses
          },
        },
        
        // Metadata for platform tracking
        metadata: {
          expertId: expertId.toString(),
          userId: user._id.toString(),
          platform: 'ExpertHub',
          accountType: 'expert',
        },
        
        // Request full response with capabilities and requirements
        include: [
          'configuration.merchant',
          'configuration.recipient',
          'identity',
          'requirements',
        ],
      };

      // Use Stripe v2 Core API directly via rawRequest()
      // The Node SDK's accounts.create() uses v1 endpoint; we need v2 explicitly
      const account = await stripeClient.rawRequest(
        'POST',
        '/v2/core/accounts',
        accountData
      );

      // Update expert with Stripe account ID
      expert.stripeAccountId = account.id;
      expert.stripeOnboardingComplete = false;

      // Map v2 capabilities to internal model
      // v2 uses: configuration.merchant.capabilities.card_payments.status
      //          configuration.recipient.capabilities.stripe_balance.stripe_transfers.status
      const merchantCardPayments = account.configuration?.merchant?.capabilities?.card_payments?.status || 'unrequested';
      const recipientTransfers = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status || 'unrequested';
      
      expert.stripeAccountCapabilities = {
        card_payments: merchantCardPayments === 'active' ? 'active' : 'pending_verification',
        payouts: 'pending_verification',  // Payouts enabled via payout method, not capability
        transfers: recipientTransfers === 'active' ? 'active' : 'pending_verification',
      };

      await expert.save();

      logger.info('Created Stripe v2 connected account for expert', {
        expertId,
        stripeAccountId: account.id,
        country: config.stripe.platformCountry,
        accountConfiguration: {
          merchant: account.configuration?.merchant,
          recipient: account.configuration?.recipient,
        },
        requirements: account.requirements,
      });

      return {
        success: true,
        account: {
          id: account.id,
          configuration: account.configuration,
          identity: account.identity,
          metadata: account.metadata,
          requirements: account.requirements, // What expert must provide
          capabilities: {
            merchant: account.configuration?.merchant?.capabilities,
            recipient: account.configuration?.recipient?.capabilities,
          },
        },
      };
    } catch (error) {
      logger.error('Failed to create v2 connected account', {
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
      // Fetch account from Stripe v2 API
      // Use rawRequest to get v2 structure with configuration
      const account = await stripeClient.rawRequest(
        'GET',
        `/v2/core/accounts/${expert.stripeAccountId}`,
        {},
        {
          // Request full response
          query: {
            include: ['configuration.merchant', 'configuration.recipient', 'identity', 'requirements'],
          },
        }
      );

      // Map v2 configuration capabilities to internal model
      const merchantCardPayments = account.configuration?.merchant?.capabilities?.card_payments?.status || 'unrequested';
      const recipientTransfers = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status || 'unrequested';
      
      expert.stripeAccountCapabilities = {
        card_payments: merchantCardPayments === 'active' ? 'active' : (merchantCardPayments === 'unrequested' ? 'unrequested' : 'pending_verification'),
        payouts: 'pending_verification',  // Determined by payout method configuration
        transfers: recipientTransfers === 'active' ? 'active' : (recipientTransfers === 'unrequested' ? 'unrequested' : 'pending_verification'),
      };

      // Check if onboarding is complete
      // Requirements should be empty and both key capabilities should be active
      const merchantReady = merchantCardPayments === 'active';
      const recipientReady = recipientTransfers === 'active';
      const noCurrentRequirements = !account.requirements?.currently_due || account.requirements.currently_due.length === 0;
      
      expert.stripeOnboardingComplete = merchantReady && recipientReady && noCurrentRequirements;
      
      // Note: payouts_enabled is set via bank account connection (separate step)
      // Not directly from capabilities, so leave stripePayoutsEnabled as-is unless explicitly enabled
      
      await expert.save();

      logger.info('Synced Stripe v2 account status', {
        expertId,
        stripeAccountId: expert.stripeAccountId,
        cardPaymentsStatus: merchantCardPayments,
        transfersStatus: recipientTransfers,
        onboardingComplete: expert.stripeOnboardingComplete,
        capabilities: expert.stripeAccountCapabilities,
        currentRequirements: account.requirements?.currently_due,
      });

      return {
        success: true,
        account: {
          id: account.id,
          configuration: {
            merchant: account.configuration?.merchant,
            recipient: account.configuration?.recipient,
          },
          identity: account.identity,
          onboardingComplete: expert.stripeOnboardingComplete,
          capabilities: {
            card_payments: merchantCardPayments,
            transfers: recipientTransfers,
          },
          requirements: account.requirements, // What still needs to be provided
          requirementsDue: account.requirements?.current_deadline
            ? new Date(account.requirements.current_deadline * 1000)
            : null,
        },
      };
    } catch (error) {
      logger.error('Failed to sync v2 account status', {
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
        // v2: Check merchant card_payments capability for receiving payments
        merchantCardPaymentsActive: expert.stripeAccountCapabilities?.card_payments === 'active',
        // v2: Check recipient stripe_transfers capability for indirect charges
        recipientTransfersActive: expert.stripeAccountCapabilities?.transfers === 'active',
        onboardingComplete: expert.stripeOnboardingComplete,
        expertVerified: expert.verificationStatus === 'approved',
      },
    };

    // Check for payment blocking issues
    if (!expert.stripeAccountId) {
      readiness.ready = false;
      readiness.issues.push('No Stripe account connected');
    }

    // v2: Merchant must have card_payments capability active
    if (expert.stripeAccountCapabilities?.card_payments !== 'active') {
      readiness.ready = false;
      readiness.issues.push('Merchant card_payments capability not active');
    }

    // v2: Recipient must have stripe_transfers capability for indirect charges
    if (expert.stripeAccountCapabilities?.transfers !== 'active') {
      readiness.ready = false;
      readiness.issues.push('Recipient stripe_transfers capability not active (required for indirect charges)');
    }

    if (expert.verificationStatus !== 'approved') {
      readiness.ready = false;
      readiness.issues.push(`Expert verification status: ${expert.verificationStatus}`);
    }

    // Check for non-blocking warnings
    if (!expert.stripePayoutsEnabled) {
      readiness.warnings.push('Expert has not completed payout bank account setup');
    }

    if (!expert.stripeOnboardingComplete) {
      readiness.warnings.push('Expert onboarding not yet fully complete');
    }

    return readiness;
  }
}

export default new ExpertStripeService();
