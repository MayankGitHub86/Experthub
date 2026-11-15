import client from './client.js';

/**
 * Services API
 * 
 * Wrapper for service-related endpoints
 */

export const servicesAPI = {
  /**
   * Create a new service
   * POST /api/v1/services
   */
  create: async (serviceData) => {
    const response = await client.post('/services', serviceData);
    return response.data.data;
  },

  /**
   * Get all services for the current user (expert)
   * GET /api/v1/services/me
   */
  getMyServices: async () => {
    const response = await client.get('/services/me');
    return response.data.data;
  },

  /**
   * Get services for a specific expert
   * GET /api/v1/services/expert/:expertId
   */
  getByExpert: async (expertId) => {
    const response = await client.get(`/services/expert/${expertId}`);
    return response.data.data;
  },

  /**
   * Get a specific service by ID
   * GET /api/v1/services/:id
   */
  getById: async (serviceId) => {
    const response = await client.get(`/services/${serviceId}`);
    return response.data.data;
  },

  /**
   * Update a service
   * PATCH /api/v1/services/:id
   */
  update: async (serviceId, serviceData) => {
    const response = await client.patch(`/services/${serviceId}`, serviceData);
    return response.data.data;
  },

  /**
   * Delete a service
   * DELETE /api/v1/services/:id
   */
  delete: async (serviceId) => {
    const response = await client.delete(`/services/${serviceId}`);
    return response.data.data;
  },

  /**
   * Get all services (with optional filters)
   * GET /api/v1/services
   */
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.expertId) params.append('expertId', filters.expertId);
    if (filters.category) params.append('category', filters.category);
    if (filters.skip) params.append('skip', filters.skip);
    if (filters.limit) params.append('limit', filters.limit);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await client.get(`/services${query}`);
    return response.data.data;
  },

  /**
   * Get availability for a specific service and date range
   * GET /api/v1/availability/service/:serviceId
   */
  getAvailability: async (serviceId, startDate, endDate, timezone = 'UTC') => {
    const params = new URLSearchParams({
      startDate: startDate.toISOString ? startDate.toISOString() : startDate,
      endDate: endDate.toISOString ? endDate.toISOString() : endDate,
      timezone,
    });
    
    const response = await client.get(`/availability/service/${serviceId}?${params.toString()}`);
    return response.data.data.slots || [];
  },
};

export default servicesAPI;
