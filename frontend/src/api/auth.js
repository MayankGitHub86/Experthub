import client from './client.js';

/**
 * Authentication API
 * 
 * Wrapper for authentication endpoints
 */

export const authAPI = {
  /**
   * Register new user
   */
  register: async (data) => {
    const response = await client.post('/auth/register', {
      email: data.email,
      password: data.password,
      firstName: data.name.split(' ')[0],
      lastName: data.name.split(' ').slice(1).join(' ') || '',
      role: data.role || 'client',
    });
    return response.data.data;
  },

  /**
   * Login user
   */
  login: async (email, password) => {
    const response = await client.post('/auth/login', {
      email,
      password,
    });
    return response.data.data;
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await client.post('/auth/logout');
    } catch {}
    // Always clear tokens locally
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    const response = await client.get('/auth/me');
    return response.data.data.user;
  },

  /**
   * Refresh access token
   */
  refreshToken: async () => {
    const response = await client.post('/auth/refresh-token', {
    });
    return response.data.data;
  },

  /**
   * Verify email
   */
  verifyEmail: async (token) => {
    const response = await client.get(`/auth/verify-email/${token}`);
    return response.data;
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email) => {
    const response = await client.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password
   */
  resetPassword: async (token, password) => {
    const response = await client.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  /**
   * Change password (authenticated)
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await client.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export default authAPI;
