import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../../models/User.js';
import config from '../../config/environment.js';
import { logger } from '../../utils/logger.js';

/**
 * Authentication Service
 * 
 * Handles user registration, login, token generation, and password management
 */

class AuthService {
  /**
   * Generate JWT access token
   */
  generateAccessToken(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'access',
      ver: user.tokenVersion || 0,
    };
    
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }
  
  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      sub: user._id.toString(),
      type: 'refresh',
      ver: user.tokenVersion || 0,
    };
    
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }
  
  /**
   * Verify JWT token
   */
  verifyToken(token, type = 'access') {
    try {
      const secret = type === 'refresh' ? config.jwt.refreshSecret : config.jwt.secret;
      const decoded = jwt.verify(token, secret);
      
      // Check token type matches
      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }
  
  /**
   * Register new user
   */
  async register({ email, password, firstName, lastName, role = 'client' }) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new Error('Email already registered');
      }
      
      // Create user
      const user = new User({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        role,
      });
      
      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      user.verificationTokenExpires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      await user.save();
      
      logger.info('User registered successfully', { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      });
      
      // Generate tokens for immediate login
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      // Return user without password
      const userObj = user.toObject();
      delete userObj.password;
      
      return {
        user: userObj,
        accessToken,
        refreshToken,
        verificationToken, // Send this via email
      };
    } catch (error) {
      logger.error('Registration failed', { email, error: error.message });
      throw error;
    }
  }
  
  /**
   * Login user
   */
  async login({ email, password }) {
    try {
      // Find user by email (with password field)
      const user = await User.findByEmail(email);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Check if account is locked
      if (user.isLocked) {
        const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000); // minutes
        throw new Error(`Account locked due to too many failed login attempts. Try again in ${lockTime} minutes.`);
      }
      
      // Check if account is active
      if (user.status !== 'active') {
        throw new Error(`Account is ${user.status}`);
      }
      
      // Verify password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        // Increment login attempts
        await user.incLoginAttempts();
        throw new Error('Invalid email or password');
      }
      
      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }
      
      // Update last login
      user.lastLogin = Date.now();
      await user.save();
      
      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      logger.info('User logged in successfully', { 
        userId: user._id, 
        email: user.email 
      });
      
      // Return user without password
      const userObj = user.toObject();
      delete userObj.password;
      
      return {
        user: userObj,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login failed', { email, error: error.message });
      throw error;
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyToken(refreshToken, 'refresh');
      
      // Find user
      const user = await User.findById(decoded.sub).select('+tokenVersion');
      
      if (!user || user.status !== 'active' || (decoded.ver ?? 0) !== (user.tokenVersion ?? 0)) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new access token
      const accessToken = this.generateAccessToken(user);
      
      logger.info('Access token refreshed', { userId: user._id });
      
      return { accessToken };
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  async revokeSessions(userId) {
    await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  }
  
  /**
   * Verify email
   */
  async verifyEmail(token) {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: Date.now() },
      }).select('+verificationToken +verificationTokenExpires');
      
      if (!user) {
        throw new Error('Invalid or expired verification token');
      }
      
      user.emailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();
      
      logger.info('Email verified', { userId: user._id });
      
      return { message: 'Email verified successfully' };
    } catch (error) {
      logger.error('Email verification failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        // Don't reveal if email exists
        return { message: 'If email exists, password reset link has been sent' };
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpires = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
      
      await user.save();
      
      logger.info('Password reset requested', { userId: user._id });
      
      return {
        message: 'If email exists, password reset link has been sent',
        resetToken, // Send this via email
      };
    } catch (error) {
      logger.error('Password reset request failed', { email, error: error.message });
      throw error;
    }
  }
  
  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      }).select('+resetPasswordToken +resetPasswordExpires +tokenVersion');
      
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }
      
      user.password = newPassword;
      user.tokenVersion += 1;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      logger.info('Password reset successful', { userId: user._id });
      
      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Change password (authenticated user)
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password +tokenVersion');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }
      
      user.password = newPassword;
      user.tokenVersion += 1;
      await user.save();
      
      logger.info('Password changed', { userId: user._id });
      
      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Password change failed', { userId, error: error.message });
      throw error;
    }
  }
}

export default new AuthService();
