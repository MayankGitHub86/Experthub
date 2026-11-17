import client from './client.js';

/**
 * Expert API client
 * Handles expert-related API calls including Stripe Connect
 */

export const expertsAPI = {
  /**
   * Get all experts (public listing)
   * GET /api/v1/experts
   * 
   * @param {object} options - Query options
   * @param {string} options.search - Search query
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @returns {Promise} { experts: [...], pagination: {...} }
   */
  async getAll(options = {}) {
    const params = new URLSearchParams();
    
    if (options.search) params.append('search', options.search);
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await client.get(`/experts${query}`);
    
    return Array.isArray(response.data.data) ? response.data.data : response.data.data.experts || [];
  },

  /**
   * Get featured experts
   * GET /api/v1/experts/featured
   * 
   * @param {number} limit - Number of experts to return (default: 10)
   * @returns {Promise} Array of featured experts
   */
  async getFeatured(limit = 10) {
    const response = await client.get(`/experts/featured?limit=${limit}`);
    return Array.isArray(response.data.data) ? response.data.data : [];
  },

  /**
   * Get top-rated experts
   * GET /api/v1/experts/top-rated
   * 
   * @param {number} limit - Number of experts to return (default: 10)
   * @returns {Promise} Array of top-rated experts
   */
  async getTopRated(limit = 10) {
    const response = await client.get(`/experts/top-rated?limit=${limit}`);
    return Array.isArray(response.data.data) ? response.data.data : [];
  },

  /**
   * Get expert by ID
   * GET /api/v1/experts/:id
   * 
   * @param {string} expertId - Expert's MongoDB ObjectId
   * @returns {Promise} Expert object
   */
  async getById(expertId) {
    const response = await client.get(`/experts/${expertId}`);
    return response.data.data;
  },

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
