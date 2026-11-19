import axios from 'axios';

/**
 * API Client with JWT Support
 * 
 * Handles all HTTP requests with automatic JWT token injection,
 * token refresh, and error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

// Create axios instance
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies (for refreshToken)
});

/**
 * Request interceptor - Add JWT token to headers
 * ONLY uses genuine authentication tokens from localStorage
 */
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle token refresh on 401
 */
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
};

const onRefreshFailed = (error) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (resolve, reject) => {
  refreshSubscribers.push({ resolve, reject });
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const publicAuthEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh-token',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/verify-email/',
    ];
    const isPublicAuthRequest = publicAuthEndpoints.some((endpoint) => originalRequest?.url?.includes(endpoint));

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicAuthRequest) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // If refresh is in progress, queue this request
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(client(originalRequest));
          }, reject);
        });
      }

      isRefreshing = true;

      try {
        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

        isRefreshing = false;
        onRefreshed(accessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        // Clear auth tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        onRefreshFailed(refreshError);
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
