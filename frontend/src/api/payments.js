import client from './client.js';

/**
 * Payment API client
 * Handles all payment-related API calls
 */

export const paymentsAPI = {
  /**
   * Create a payment intent for a booking
   * @param {string} bookingId - The booking ID
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code (default: USD)
   * @returns {Promise} Contains client_secret and paymentIntentId
   */
  async createIntent(bookingId, amount, currency = 'USD') {
    const response = await client.post('/payments/create-intent', {
      bookingId,
      amount,
      currency,
    });
    return response.data.data;
  },

  /**
   * Get payment status for a specific payment intent
   * @param {string} paymentIntentId - The Stripe payment intent ID
   * @returns {Promise} Payment status and details
   */
  async getPaymentStatus(paymentIntentId) {
    const response = await client.get(`/payments/${paymentIntentId}/status`);
    return response.data.data;
  },

  /**
   * Refund a payment (admin only)
   * @param {string} bookingId - The booking ID
   * @param {number} amount - Amount in dollars (optional, full refund if not provided)
   * @param {string} reason - Refund reason
   * @returns {Promise} Refund details
   */
  async refundPayment(bookingId, amount = null, reason = 'Customer requested') {
    const response = await client.post(`/payments/${bookingId}/refund`, {
      amount,
      reason,
    });
    return response.data.data;
  },

  /**
   * List payments with filtering and pagination (admin only)
   * @param {object} params - { page, limit, status, search, startDate, endDate, sortBy, sortOrder }
   * @returns {Promise} { payments: [...], pagination: {...} }
   */
  async listPayments(params = {}) {
    const response = await client.get('/payments', { params });
    return response.data.data;
  },
};

export default paymentsAPI;
