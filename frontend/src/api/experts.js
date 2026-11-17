import client from './client.js';

/**
 * Expert API client
 * Handles expert-related API calls including Stripe Connect
 */

export const expertsAPI = {
  /**
   * Create a Stripe connected account for the authenticated expert
   * @returns {Promise} Connected account details with setup requirements
   */
  async createStripeAccount() {
    const response = await client.post('/experts/stripe/create-account');
    return response.data.data;
  },

  /**
   * Create an onboarding link for Stripe Connect setup
   * @param {string} returnUrl - URL to return to after onboarding
   * @returns {Promise} Onboarding link URL
   */
  async createOnboardingLink(returnUrl) {
    const response = await client.post('/experts/stripe/create-onboarding-link', {
      returnUrl
    });
    return response.data.data;
  },

  /**
   * Get current Stripe account status
   * @returns {Promise} Account capabilities, requirements, and status
   */
  async getAccountStatus() {
    const response = await client.get('/experts/stripe/account-status');
    return response.data.data;
  },

  /**
   * Check if expert is ready to accept payments
   * @returns {Promise} Payment readiness status
   */
  async checkPaymentReadiness() {
    const response = await client.get('/experts/stripe/check-payment-readiness');
    return response.data.data;
  },
};

export default expertsAPI;
