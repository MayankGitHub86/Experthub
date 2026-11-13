import Joi from 'joi';

/**
 * Availability Validation Schemas
 */

// Time slot validation (HH:MM format)
const timeSlotSchema = Joi.object({
  start: Joi.string()
    .pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'Start time must be in HH:MM format (00:00-23:59)',
      'any.required': 'Start time is required',
    }),
  end: Joi.string()
    .pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'End time must be in HH:MM format (00:00-23:59)',
      'any.required': 'End time is required',
    }),
}).custom((value, helpers) => {
  // Validate that end time is after start time
  if (value.start >= value.end) {
    return helpers.error('any.invalid', { message: 'End time must be after start time' });
  }
  return value;
});

// Weekly schedule validation
const weeklyScheduleSchema = Joi.object({
  monday: Joi.array().items(timeSlotSchema).max(10).default([]),
  tuesday: Joi.array().items(timeSlotSchema).max(10).default([]),
  wednesday: Joi.array().items(timeSlotSchema).max(10).default([]),
  thursday: Joi.array().items(timeSlotSchema).max(10).default([]),
  friday: Joi.array().items(timeSlotSchema).max(10).default([]),
  saturday: Joi.array().items(timeSlotSchema).max(10).default([]),
  sunday: Joi.array().items(timeSlotSchema).max(10).default([]),
});

// Update availability settings
export const updateAvailabilitySchema = Joi.object({
  timezone: Joi.string()
    .min(3)
    .max(50)
    .messages({
      'string.min': 'Invalid timezone',
      'string.max': 'Invalid timezone',
    }),
  
  weeklySchedule: weeklyScheduleSchema,
  
  bufferMinutes: Joi.number()
    .min(0)
    .max(120)
    .messages({
      'number.min': 'Buffer time cannot be negative',
      'number.max': 'Buffer time cannot exceed 2 hours',
    }),
  
  minNoticeHours: Joi.number()
    .min(0)
    .max(168)
    .messages({
      'number.min': 'Minimum notice cannot be negative',
      'number.max': 'Minimum notice cannot exceed 1 week',
    }),
  
  maxAdvanceDays: Joi.number()
    .min(1)
    .max(365)
    .messages({
      'number.min': 'Maximum advance booking must be at least 1 day',
      'number.max': 'Maximum advance booking cannot exceed 1 year',
    }),
}).min(1);

// Exception validation
export const createExceptionSchema = Joi.object({
  date: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.min': 'Exception date must be in the future',
      'any.required': 'Date is required',
    }),
  
  available: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Available status is required',
    }),
  
  slots: Joi.when('available', {
    is: true,
    then: Joi.array()
      .items(timeSlotSchema)
      .min(1)
      .max(10)
      .required()
      .messages({
        'array.min': 'At least one time slot is required when available is true',
        'any.required': 'Time slots are required when available is true',
      }),
    otherwise: Joi.array().items(timeSlotSchema).max(0).default([]),
  }),
  
  reason: Joi.string()
    .max(200)
    .allow('', null),
});

// Update exception
export const updateExceptionSchema = Joi.object({
  available: Joi.boolean(),
  slots: Joi.array().items(timeSlotSchema).max(10),
  reason: Joi.string().max(200).allow('', null),
}).min(1);

// Get available slots query
export const getAvailableSlotsSchema = Joi.object({
  serviceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid service ID',
      'any.required': 'Service ID is required',
    }),
  
  startDate: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Start date is required',
    }),
  
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required',
    }),
  
  timezone: Joi.string()
    .default('UTC')
    .messages({
      'string.base': 'Invalid timezone',
    }),
}).custom((value, helpers) => {
  // Validate date range is not too large (max 60 days)
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 60) {
    return helpers.error('any.invalid', { message: 'Date range cannot exceed 60 days' });
  }
  
  return value;
});
