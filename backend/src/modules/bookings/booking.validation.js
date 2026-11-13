import Joi from 'joi';

/**
 * Booking Validation Schemas
 */

// Create booking hold
export const createHoldSchema = Joi.object({
  expertId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  serviceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  startTime: Joi.date()
    .iso()
    .min('now')
    .required(),
  timezone: Joi.string().default('UTC'),
});

// Confirm booking
export const confirmBookingSchema = Joi.object({
  holdId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  clientNotes: Joi.string().max(1000).allow('', null),
});

// Cancel booking
export const cancelBookingSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .required(),
});

// Reschedule booking
export const rescheduleBookingSchema = Joi.object({
  newStartTime: Joi.date()
    .iso()
    .min('now')
    .required(),
  reason: Joi.string().max(500).allow('', null),
});
