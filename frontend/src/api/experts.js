import client from './client.js';

/**
 * Experts API
 * 
 * Wrapper for expert-related endpoints
 */

export const expertsAPI = {
  /**
   * Get all experts with optional filters
   * GET /api/v1/experts
   */
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.expertise) params.append('expertise', filters.expertise);
    if (filters.minRating) params.append('minRating', filters.minRating);
    if (filters.skip) params.append('skip', filters.skip);
    if (filters.limit) params.append('limit', filters.limit);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await client.get(`/experts${query}`);
    return response.data.data;
  },

  /**
   * Get expert by ID
   * GET /api/v1/experts/:id
   */
  getById: async (id) => {
    const response = await client.get(`/experts/${id}`);
    return response.data.data;
  },

  /**
   * Get expert profile with full details
   * GET /api/v1/experts/:id/profile
   */
  getProfile: async (id) => {
    const response = await client.get(`/experts/${id}/profile`);
    return response.data.data;
  },

  /**
   * Get services offered by an expert
   * GET /api/v1/services/expert/:expertId
   */
  getServices: async (expertId) => {
    const response = await client.get(`/services/expert/${expertId}`);
    return response.data.data;
  },

  /**
   * Get availability slots for an expert on a specific date
   * GET /api/v1/availability/expert/:expertId?date=YYYY-MM-DD
   */
  getAvailability: async (expertId, date) => {
    const query = date ? `?date=${date}` : '';
    const response = await client.get(`/availability/expert/${expertId}${query}`);
    return response.data.data;
  },

  /**
   * Get all availability slots for an expert
   * GET /api/v1/availability/expert/:expertId/all
   */
  getAvailabilityAll: async (expertId) => {
    const response = await client.get(`/availability/expert/${expertId}/all`);
    return response.data.data;
  },

  /**
   * Search experts by expertise or name
   * GET /api/v1/experts/search?q=react
   */
  search: async (query, limit = 10) => {
    const response = await client.get(`/experts/search`, {
      params: { q: query, limit },
    });
    return response.data.data;
  },

  /**
   * Get expert ratings and reviews
   * GET /api/v1/experts/:id/reviews
   */
  getReviews: async (expertId) => {
    const response = await client.get(`/experts/${expertId}/reviews`);
    return response.data.data;
  },

  /**
   * Get expert statistics (response time, completion rate, etc)
   * GET /api/v1/experts/:id/stats
   */
  getStats: async (expertId) => {
    const response = await client.get(`/experts/${expertId}/stats`);
    return response.data.data;
  },
};

export default expertsAPI;
