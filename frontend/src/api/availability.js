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
   * PUT /api/v1/experts/me/availability (legacy) or GET for retrieval
   * Note: Backend primarily uses PUT for updates, not GET for retrieval
   */
  getMyAvailability: async () => {
    try {
      const response = await client.get('/experts/me/availability');
      return response.data.data;
    } catch (err) {
      // If not available, expert profile availability is embedded
      console.warn('Direct availability endpoint not available');
      return null;
    }
  },

  /**
   * Update current user's (expert) availability configuration
   * PUT /api/v1/experts/me/availability
   */
  updateMyAvailability: async (availabilityData) => {
    const response = await client.put('/experts/me/availability', availabilityData);
    return response.data.data;
  },

  /**
   * Get availability for a service
   * GET /api/v1/availability/service/:serviceId
   * Note: This endpoint may not exist. Availability is computed from expert availability.
   */
  getServiceAvailability: async (serviceId, params = {}) => {
    try {
      const query = new URLSearchParams();
      
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.timezone) query.append('timezone', params.timezone);
      
      const queryStr = query.toString() ? `?${query.toString()}` : '';
      const response = await client.get(`/availability/service/${serviceId}${queryStr}`);
      return response.data.data;
    } catch (err) {
      console.warn('Service availability endpoint not available:', err.message);
      return null;
    }
  },

  /**
   * Create availability exception
   * POST /api/v1/experts/me/availability/exceptions
   */
  createException: async (exceptionData) => {
    const response = await client.post('/experts/me/availability/exceptions', exceptionData);
    return response.data.data;
  },

  /**
   * Get availability exceptions
   * GET /api/v1/experts/me/availability/exceptions
   */
  getExceptions: async () => {
    const response = await client.get('/experts/me/availability/exceptions');
    return response.data.data;
  },

  /**
   * Update availability exception
   * PATCH /api/v1/experts/me/availability/exceptions/:exceptionId
   */
  updateException: async (exceptionId, exceptionData) => {
    const response = await client.patch(`/experts/me/availability/exceptions/${exceptionId}`, exceptionData);
    return response.data.data;
  },

  /**
   * Delete availability exception
   * DELETE /api/v1/experts/me/availability/exceptions/:exceptionId
   */
  deleteException: async (exceptionId) => {
    const response = await client.delete(`/experts/me/availability/exceptions/${exceptionId}`);
    return response.data.data;
  },

  /**
   * Generate slots for a date range
   * POST /api/v1/availability/generate-slots
   * Note: This is a computed endpoint that generates slots from expert availability
   */
  generateSlots: async (expertId, startDate, endDate, serviceId = null) => {
    try {
      const response = await client.post('/availability/generate-slots', {
        expertId,
        startDate: startDate.toISOString ? startDate.toISOString() : startDate,
        endDate: endDate.toISOString ? endDate.toISOString() : endDate,
        serviceId,
      });
      return response.data.data;
    } catch (err) {
      console.warn('Generate slots endpoint not available:', err.message);
      return null;
    }
  },
};

export default availabilityAPI;
