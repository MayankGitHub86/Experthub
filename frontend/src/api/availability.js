import client from './client.js';

/**
 * Availability API
 * 
 * Wrapper for availability and scheduling endpoints
 */

export const availabilityAPI = {
  /**
   * Get availability for an expert
   * GET /api/v1/availability/expert/:expertId
   */
  getExpertAvailability: async (expertId, params = {}) => {
    const query = new URLSearchParams();
    
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.serviceId) query.append('serviceId', params.serviceId);
    if (params.timezone) query.append('timezone', params.timezone);
    
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const response = await client.get(`/availability/expert/${expertId}${queryStr}`);
    return response.data.data;
  },

  /**
   * Get all availability slots for an expert (no date filter)
   * GET /api/v1/availability/expert/:expertId/all
   */
  getExpertAvailabilityAll: async (expertId, params = {}) => {
    const query = new URLSearchParams();
    
    if (params.serviceId) query.append('serviceId', params.serviceId);
    if (params.timezone) query.append('timezone', params.timezone);
    
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const response = await client.get(`/availability/expert/${expertId}/all${queryStr}`);
    return response.data.data;
  },

  /**
   * Get current user's (expert) availability configuration
   * GET /api/v1/availability/me
   */
  getMyAvailability: async () => {
    const response = await client.get('/availability/me');
    return response.data.data;
  },

  /**
   * Update current user's (expert) availability configuration
   * PATCH /api/v1/availability/me
   */
  updateMyAvailability: async (availabilityData) => {
    const response = await client.patch('/availability/me', availabilityData);
    return response.data.data;
  },

  /**
   * Get availability for a service
   * GET /api/v1/availability/service/:serviceId
   */
  getServiceAvailability: async (serviceId, params = {}) => {
    const query = new URLSearchParams();
    
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.timezone) query.append('timezone', params.timezone);
    
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const response = await client.get(`/availability/service/${serviceId}${queryStr}`);
    return response.data.data;
  },

  /**
   * Generate slots for a date range
   * POST /api/v1/availability/generate-slots
   */
  generateSlots: async (expertId, startDate, endDate, serviceId = null) => {
    const response = await client.post('/availability/generate-slots', {
      expertId,
      startDate: startDate.toISOString ? startDate.toISOString() : startDate,
      endDate: endDate.toISOString ? endDate.toISOString() : endDate,
      serviceId,
    });
    return response.data.data;
  },
};

export default availabilityAPI;
