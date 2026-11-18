import client from './client.js';

/**
 * Users API Client (Admin Management)
 */
export const usersAPI = {
  /**
   * List users/customers with filters
   * GET /api/v1/users
   */
  async listUsers(params = {}) {
    const response = await client.get('/users', { params });
    return response.data.data;
  },

  /**
   * Get user details and booking history
   * GET /api/v1/users/:id
   */
  async getUserDetails(id) {
    const response = await client.get(`/users/${id}`);
    return response.data.data;
  }
};

export default usersAPI;
