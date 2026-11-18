import authService from './auth.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Authentication Controller
 * 
 * HTTP handlers for authentication endpoints
 */

class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      const result = await authService.register({ email, password, firstName, lastName, role });
      
      // TODO: Send verification email with result.verificationToken
      
      res.status(201).json({
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Login user
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login({ email, password });
      
      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      
      // TODO: Add refresh token to blacklist/revocation list
      
      logger.info('User logged out', { userId: req.user?._id });
      
      res.json({
        status: 'success',
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-token
   */
  async refreshToken(req, res, next) {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          status: 'error',
          message: 'Refresh token is required',
        });
      }
      
      const result = await authService.refreshAccessToken(refreshToken);
      
      res.json({
        status: 'success',
        data: {
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Verify email
   * GET /api/v1/auth/verify-email/:token
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;
      
      await authService.verifyEmail(token);
      
      res.json({
        status: 'success',
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Forgot password
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      
      const result = await authService.requestPasswordReset(email);
      
      // TODO: Send password reset email with result.resetToken
      
      res.json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      
      await authService.resetPassword(token, password);
      
      res.json({
        status: 'success',
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Change password (authenticated)
   * POST /api/v1/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user._id;
      
      await authService.changePassword(userId, currentPassword, newPassword);
      
      res.json({
        status: 'success',
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get current user
   * GET /api/v1/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      res.json({
        status: 'success',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
