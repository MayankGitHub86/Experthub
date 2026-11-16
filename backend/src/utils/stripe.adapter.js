/**
 * Stripe Adapter
 * 
 * Thin abstraction layer over Stripe SDK for dependency injection.
 * Production code uses the real SDK client.
 * Tests inject a mock adapter to verify service behavior without making API calls.
 * 
 * This enables clean testing of service logic while maintaining separation of concerns.
 */

class StripeAdapter {
  constructor(stripeClient) {
    this.stripeClient = stripeClient;
  }

  /**
   * Create a v2 connected account
   * 
   * @param {object} accountData - Account creation payload
   * @returns {Promise<object>} Created account with id, configuration, requirements
   */
  async createAccount(accountData) {
    return this.stripeClient.rawRequest(
      'POST',
      '/v2/core/accounts',
      accountData
    );
  }

  /**
   * Retrieve a v2 connected account
   * 
   * @param {string} accountId - Stripe account ID
   * @param {object} options - Query options (include parameters)
   * @returns {Promise<object>} Account object
   */
  async retrieveAccount(accountId, options = {}) {
    return this.stripeClient.rawRequest(
      'GET',
      `/v2/core/accounts/${accountId}`,
      {},
      options
    );
  }

  /**
   * Create an account onboarding link
   * 
   * @param {string} accountId - Stripe account ID (v2 format)
   * @param {object} options - Link options (return_url, refresh_url, etc.)
   * @returns {Promise<object>} Account link with URL and expiration
   */
  async createAccountLink(accountId, options = {}) {
    return this.stripeClient.accountLinks.create({
      account: accountId,
      ...options
    });
  }

  /**
   * Create a payment intent
   * 
   * @param {object} params - PaymentIntent parameters
   * @returns {Promise<object>} PaymentIntent object
   */
  async createPaymentIntent(params) {
    return this.stripeClient.paymentIntents.create(params);
  }

  /**
   * Retrieve a payment intent
   * 
   * @param {string} paymentIntentId - PaymentIntent ID
   * @returns {Promise<object>} PaymentIntent object
   */
  async retrievePaymentIntent(paymentIntentId) {
    return this.stripeClient.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Confirm a payment intent
   * 
   * @param {string} paymentIntentId - PaymentIntent ID
   * @param {object} params - Confirmation parameters
   * @returns {Promise<object>} Confirmed PaymentIntent
   */
  async confirmPaymentIntent(paymentIntentId, params = {}) {
    return this.stripeClient.paymentIntents.confirm(paymentIntentId, params);
  }
}

export default StripeAdapter;
