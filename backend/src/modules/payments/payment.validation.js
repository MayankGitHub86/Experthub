/**
 * Payment Validation Schemas
 * 
 * Joi validation for payment endpoints
 */

import Joi from 'joi';

export const createPaymentIntentSchema = Joi.object({
  bookingId: Joi.string()
    .required()
    .description('Booking MongoDB ID'),
    
  amount: Joi.number()
    .integer()
    .min(50) // Minimum $0.50
    .max(999999) // Maximum $9,999.99
    .required()
    .description('Amount in cents'),
    
  currency: Joi.string()
    .default('USD')
    .valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR')
    .description('Currency code')
});

export const refundPaymentSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .max(999999)
    .optional()
    .description('Refund amount (omit for full refund)'),
    
  reason: Joi.string()
    .max(500)
    .default('Customer requested')
    .description('Refund reason')
});

export const webhookEventSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().required(),
  data: Joi.object().required(),
  created: Joi.number().required()
});
