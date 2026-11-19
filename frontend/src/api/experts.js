import client from './client.js';

/**
 * Expert API client
 * Handles expert-related API calls including Stripe Connect
 */

export const expertsAPI = {
  async getMyProfile() {
    const response = await client.get('/experts/me/profile');
    return response.data.data;
  },

  async updateMyProfile(updates) {
    const response = await client.patch('/experts/me', updates);
    return response.data.data;
  },
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
    const page = Number(options.page) || 1;
    const limit = Math.min(100, Number(options.limit) || 100);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (options.query || options.search) params.set('query', options.query || options.search);
    const response = await client.get(`/experts?${params.toString()}`);
    const firstPage = Array.isArray(response.data.data) ? response.data.data : response.data.data.experts || [];
    const pageCount = Number(response.data.pagination?.pages) || 1;
    if (pageCount <= page) return firstPage;

    const remaining = await Promise.all(Array.from({ length: pageCount - page }, (_, index) => {
      const nextParams = new URLSearchParams(params);
      nextParams.set('page', String(page + index + 1));
      return client.get(`/experts?${nextParams.toString()}`).then((result) => Array.isArray(result.data.data) ? result.data.data : result.data.data.experts || []);
    }));
    return [firstPage, ...remaining].flat();
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
    const response = await client.get('/experts/stripe/payment-readiness');
    return response.data.data;
  },
};

export default expertsAPI;
