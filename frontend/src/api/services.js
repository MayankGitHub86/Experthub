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
   * Activate a service
   * PATCH /api/v1/services/:id/activate
   */
  activate: async (serviceId) => {
    const response = await client.patch(`/services/${serviceId}/activate`);
    return response.data.data;
  },

  /**
   * Deactivate a service
   * PATCH /api/v1/services/:id/deactivate
   */
  deactivate: async (serviceId) => {
    const response = await client.patch(`/services/${serviceId}/deactivate`);
    return response.data.data;
  },

  /**
   * Get all services (with optional filters)
   * GET /api/v1/services
   */
  getAll: async (filters = {}) => {
    const page = Number(filters.page) || 1;
    const limit = Math.min(100, Number(filters.limit) || 100);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    ['expertId', 'category', 'query', 'minPrice', 'maxPrice', 'minDuration', 'maxDuration', 'sortBy'].forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== '') params.set(key, String(filters[key]));
    });
    if (filters.tags) params.set('tags', Array.isArray(filters.tags) ? filters.tags.join(',') : filters.tags);

    const response = await client.get(`/services?${params.toString()}`);
    const services = Array.isArray(response.data.data) ? response.data.data : response.data.data?.services || [];
    const pagination = response.data.pagination || {};
    const pages = Number(pagination.pages) || page;
    if (pages <= page) return services;

    const remaining = await Promise.all(Array.from({ length: pages - page }, (_, index) => {
      const nextParams = new URLSearchParams(params);
      nextParams.set('page', String(page + index + 1));
      return client.get(`/services?${nextParams.toString()}`).then((result) =>
        Array.isArray(result.data.data) ? result.data.data : result.data.data?.services || []
      );
    }));
    return [services, ...remaining].flat();
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
