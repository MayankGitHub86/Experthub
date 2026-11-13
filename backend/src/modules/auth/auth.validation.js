import Joi from 'joi';

/**
 * Authentication Validation Schemas
 * 
 * Input validation for auth endpoints using Joi
 */

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required',
    }),
  
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required',
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required',
    }),
  
  role: Joi.string()
    .valid('client', 'expert')
    .default('client')
    .messages({
      'any.only': 'Role must be either client or expert',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .length(64)
    .hex()
    .required()
    .messages({
      'string.length': 'Invalid verification token',
      'string.hex': 'Invalid verification token',
      'any.required': 'Verification token is required',
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .length(64)
    .hex()
    .required()
    .messages({
      'string.length': 'Invalid reset token',
      'string.hex': 'Invalid reset token',
      'any.required': 'Reset token is required',
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required',
    }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.invalid': 'New password must be different from current password',
      'any.required': 'New password is required',
    }),
});
