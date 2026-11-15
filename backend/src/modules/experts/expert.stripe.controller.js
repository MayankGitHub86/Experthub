/**
 * Expert Stripe Controller
 * 
 * Handles Stripe Connect expert onboarding endpoints
 */

import expertStripeService from './expert.stripe.service.js';
import Expert from '../../models/Expert.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

/**
 * Create Stripe connected account for expert
 * 
 * POST /api/v1/experts/stripe/create-account
 * 
 * Creates a Stripe Express account for the authenticated expert.
 * Expert must be verified before payment processing.
 * 
 * @requires Authentication
 * @requires Expert role
 */
async function createConnectedAccount(req, res, next) {
  try {
    const { expertId: userIdFromAuth } = req.user;

    // Get expert profile for this user
    const expert = await Expert.findOne({ userId: userIdFromAuth });

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: 'Expert profile not found. Please create an expert profile first.',
      });
    }

    if (expert.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Expert already has a connected Stripe account',
        stripeAccountId: expert.stripeAccountId,
      });
    }

    // Create connected account
    const result = await expertStripeService.createConnectedAccount(expert._id);

    res.status(201).json({
      success: true,
      message: 'Stripe connected account created successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Failed to create connected account', { error: error.message });
    next(error);
  }
}

/**
 * Create onboarding link for expert
 * 
 * POST /api/v1/experts/stripe/create-onboarding-link
 * 
 * Generates a Stripe-hosted onboarding URL where expert completes:
 * - Business/personal information
 * - Payout details (bank account)
 * - Verification documents
 * - Agree to terms
 * 
 * Returns URL that expires in 24 hours.
 * 
 * @requires Authentication
 * @requires Expert role
 */
async function createOnboardingLink(req, res, next) {
  try {
    const { expertId: userIdFromAuth } = req.user;
    const { returnUrl } = req.body;

    // Get expert profile
    const expert = await Expert.findOne({ userId: userIdFromAuth });

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: 'Expert profile not found',
      });
    }

    if (!expert.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Expert has no Stripe account. Create one first.',
      });
    }

    // Create onboarding link
    const result = await expertStripeService.createOnboardingLink(
      expert._id,
      returnUrl
    );

    res.status(200).json({
      success: true,
      message: 'Onboarding link created successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Failed to create onboarding link', { error: error.message });
    next(error);
  }
}

/**
 * Get Stripe account status
 * 
 * GET /api/v1/experts/stripe/account-status
 * 
 * Syncs current account status from Stripe and returns:
 * - Account capabilities
 * - Payout/charges enabled
 * - Requirements (what still needs to be provided)
 * - Deadlines for requirements
 * 
 * @requires Authentication
 * @requires Expert role
 */
async function getAccountStatus(req, res, next) {
  try {
    const { expertId: userIdFromAuth } = req.user;

    // Get expert profile
    const expert = await Expert.findOne({ userId: userIdFromAuth });

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: 'Expert profile not found',
      });
    }

    if (!expert.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Expert has no Stripe account',
      });
    }

    // Sync status from Stripe
    const result = await expertStripeService.syncAccountStatus(expert._id);

    res.status(200).json({
      success: true,
      message: 'Account status retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Failed to get account status', { error: error.message });
    next(error);
  }
}

/**
 * Check payment readiness
 * 
 * GET /api/v1/experts/stripe/payment-readiness
 * 
 * Checks if expert is ready to receive payments:
 * - Stripe account connected
 * - Card payments capability active
 * - Expert verified
 * - No pending requirements
 * 
 * Returns readiness status with details on any blockers.
 * 
 * @requires Authentication
 * @requires Expert role
 */
async function checkPaymentReadiness(req, res, next) {
  try {
    const { expertId: userIdFromAuth } = req.user;

    // Get expert profile
    const expert = await Expert.findOne({ userId: userIdFromAuth });

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: 'Expert profile not found',
      });
    }

    // Check readiness
    const result = await expertStripeService.checkPaymentReadiness(expert._id);

    res.status(200).json({
      success: true,
      message: result.ready
        ? 'Expert is ready to receive payments'
        : 'Expert is not ready to receive payments',
      data: result,
    });
  } catch (error) {
    logger.error('Failed to check payment readiness', { error: error.message });
    next(error);
  }
}

export default {
  createConnectedAccount,
  createOnboardingLink,
  getAccountStatus,
  checkPaymentReadiness,
};
