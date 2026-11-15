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

  /**
   * Create a new expert profile (current user)
   * POST /api/v1/experts
   */
  create: async (profileData) => {
    const response = await client.post('/experts', profileData);
    return response.data.data;
  },

  /**
   * Get current user's expert profile
   * GET /api/v1/experts/me/profile
   */
  getMyProfile: async () => {
    const response = await client.get('/experts/me/profile');
    return response.data.data;
  },

  /**
   * Update current user's expert profile
   * PATCH /api/v1/experts/me
   */
  updateMyProfile: async (profileData) => {
    const response = await client.patch('/experts/me', profileData);
    return response.data.data;
  },

  /**
   * Submit expert profile for verification
   * POST /api/v1/experts/me/submit-verification
   */
  submitForVerification: async () => {
    const response = await client.post('/experts/me/submit-verification');
    return response.data.data;
  },

  /**
   * Get all featured experts
   * GET /api/v1/experts/featured
   */
  getFeatured: async () => {
    const response = await client.get('/experts/featured');
    return response.data.data;
  },

  /**
   * Get top-rated experts
   * GET /api/v1/experts/top-rated
   */
  getTopRated: async () => {
    const response = await client.get('/experts/top-rated');
    return response.data.data;
  },

  /**
   * Admin: Get pending experts for verification
   * GET /api/v1/admin/experts/pending
   */
  getPendingForApproval: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.skip) params.append('skip', filters.skip);
    if (filters.limit) params.append('limit', filters.limit);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await client.get(`/admin/experts/pending${query}`);
    return response.data.data;
  },

  /**
   * Admin: Approve an expert
   * PATCH /api/v1/admin/experts/:id/approve
   */
  approveExpert: async (expertId, notes = '') => {
    const response = await client.patch(`/admin/experts/${expertId}/approve`, {
      verificationNotes: notes || undefined,
    });
    return response.data.data;
  },

  /**
   * Admin: Reject an expert
   * PATCH /api/v1/admin/experts/:id/reject
   */
  rejectExpert: async (expertId, reason = '') => {
    const response = await client.patch(`/admin/experts/${expertId}/reject`, {
      verificationNotes: reason,
    });
    return response.data.data;
  },

  /**
   * Admin: Suspend an expert
   * PATCH /api/v1/admin/experts/:id/suspend
   */
  suspendExpert: async (expertId, reason = '') => {
    const response = await client.patch(`/admin/experts/${expertId}/suspend`, {
      verificationNotes: reason,
    });
    return response.data.data;
  },

  /**
   * Admin: Reactivate a suspended expert
   * PATCH /api/v1/admin/experts/:id/reactivate
   */
  reactivateExpert: async (expertId) => {
    const response = await client.patch(`/admin/experts/${expertId}/reactivate`);
    return response.data.data;
  },
};

export default expertsAPI;
