import client from './client.js';

/**
 * Bookings API
 * 
 * Wrapper for booking-related endpoints
 */

export const bookingsAPI = {
  /**
   * Create a booking hold (atomic reservation)
   * POST /api/v1/bookings/holds
   * 
   * @param {string} expertId - Expert's MongoDB ObjectId
   * @param {string} serviceId - Service's MongoDB ObjectId
   * @param {string} startTime - ISO 8601 datetime (must be >= now)
   * @param {string} timezone - Timezone (default: 'UTC')
   * @returns {object} Hold object with _id and expiresAt
   */
  createHold: async (expertId, serviceId, startTime, timezone = 'UTC') => {
    const response = await client.post('/bookings/holds', {
      expertId,
      serviceId,
      startTime,
      timezone,
    });
    return response.data.data;
  },

  /**
   * Confirm a booking from an active hold
   * POST /api/v1/bookings/confirm
   * 
   * @param {string} holdId - Hold's MongoDB ObjectId (from createHold)
   * @param {string} clientNotes - Optional notes (max 1000 chars)
   * @returns {object} Booking object with status 'payment_pending'
   */
  confirmBooking: async (holdId, clientNotes = '') => {
    const response = await client.post('/bookings/confirm', {
      holdId,
      clientNotes: clientNotes || undefined,
    });
    return response.data.data;
  },

  /**
   * Get client's bookings
   * GET /api/v1/bookings/me
   * 
   * @param {object} options - Query options
   * @param {string} options.status - Filter by status (optional)
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @returns {object} { bookings: [...], pagination: {...} }
   */
  getMyBookings: async (options = {}) => {
    const params = new URLSearchParams();
    
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await client.get(`/bookings/me${query}`);
    
    return {
      bookings: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Get bookings (same as getMyBookings for client perspective)
   * GET /api/v1/bookings
   * 
   * @param {object} options - Query options
   * @returns {object} { bookings: [...], pagination: {...} }
   */
  getBookings: async (options = {}) => {
    return bookingsAPI.getMyBookings(options);
  },

  /**
   * Get booking by ID
   * GET /api/v1/bookings/:id
   * 
   * @param {string} bookingId - Booking's MongoDB ObjectId
   * @returns {object} Booking object
   */
  getBookingById: async (bookingId) => {
    const response = await client.get(`/bookings/${bookingId}`);
    return response.data.data;
  },

  /**
   * Cancel a booking
   * PATCH /api/v1/bookings/:id/cancel
   * 
   * @param {string} bookingId - Booking's MongoDB ObjectId
   * @param {string} reason - Cancellation reason (required, max 500 chars)
   * @returns {object} { booking: {...}, refundInfo: {...} }
   */
  cancelBooking: async (bookingId, reason) => {
    const response = await client.patch(`/bookings/${bookingId}/cancel`, {
      reason,
    });
    
    return {
      booking: response.data.data,
      refundInfo: response.data.refundInfo,
    };
  },

  /**
   * Reschedule a booking to a new time
   * PATCH /api/v1/bookings/:id/reschedule
   * 
   * @param {string} bookingId - Booking's MongoDB ObjectId
   * @param {string} newStartTime - New ISO 8601 datetime
   * @param {string} reason - Reschedule reason (optional, max 500 chars)
   * @returns {object} Updated booking object
   */
  rescheduleBooking: async (bookingId, newStartTime, reason = '') => {
    const response = await client.patch(`/bookings/${bookingId}/reschedule`, {
      newStartTime,
      reason: reason || undefined,
    });
    
    return response.data.data;
  },

  /**
   * Mark a booking as completed
   * POST /api/v1/bookings/:id/complete
   * 
   * @param {string} bookingId - Booking's MongoDB ObjectId
   * @returns {object} Booking object with status 'completed'
   */
  completeBooking: async (bookingId) => {
    const response = await client.post(`/bookings/${bookingId}/complete`);
    return response.data.data;
  },

  /**
   * Get expert's availability slots
   * GET /api/v1/availability/expert/:expertId?serviceId=:id&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   * 
   * @param {string} expertId - Expert's MongoDB ObjectId
   * @param {string} serviceId - Service's MongoDB ObjectId (required to determine slot duration)
   * @param {string} startDate - Start date (YYYY-MM-DD format or ISO 8601)
   * @param {string} endDate - End date (YYYY-MM-DD format or ISO 8601)
   * @returns {array} Array of availability slot objects
   */
  getExpertAvailability: async (expertId, serviceId, startDate = null, endDate = null) => {
    // If no dates provided, use today and 14 days from now
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const query = new URLSearchParams({
      serviceId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      timezone: 'UTC'
    });
    
    const response = await client.get(`/experts/${expertId}/availability/slots?${query.toString()}`);
    return response.data.data?.slots || [];
  },

  /**
   * Get all expert's available slots without date filter
   * GET /api/v1/experts/:expertId/availability/slots?serviceId=:id
   * 
   * @param {string} expertId - Expert's MongoDB ObjectId
   * @param {string} serviceId - Service's MongoDB ObjectId
   * @returns {array} Array of all availability slots
   */
  getExpertAvailabilityAll: async (expertId, serviceId) => {
    const query = new URLSearchParams({
      serviceId,
      timezone: 'UTC'
    });
    
    const response = await client.get(`/experts/${expertId}/availability/slots?${query.toString()}`);
    return response.data.data?.slots || [];
  },

  /**
   * Get expert's services
   * GET /api/v1/services/expert/:expertId
   * 
   * @param {string} expertId - Expert's MongoDB ObjectId
   * @returns {array} Array of service objects
   */
  getExpertServices: async (expertId) => {
    const response = await client.get(`/services/expert/${expertId}`);
    return response.data.data;
  },
};

export default bookingsAPI;
