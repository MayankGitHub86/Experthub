import Joi from 'joi';

/**
 * Expert Validation Schemas
 */

// Create Expert Profile
export const createExpertSchema = Joi.object({
  headline: Joi.string()
    .min(10)
    .max(200)
    .required()
    .messages({
      'string.min': 'Headline must be at least 10 characters',
      'string.max': 'Headline cannot exceed 200 characters',
      'any.required': 'Headline is required',
    }),
    
  bio: Joi.string()
    .min(100)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Bio must be at least 100 characters',
      'string.max': 'Bio cannot exceed 2000 characters',
      'any.required': 'Bio is required',
    }),
    
  hourlyRate: Joi.number()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'number.min': 'Hourly rate must be at least $10',
      'number.max': 'Hourly rate cannot exceed $1000',
      'any.required': 'Hourly rate is required',
    }),
    
  category: Joi.string()
    .valid(
      'Business & Strategy',
      'Marketing & Growth',
      'Product & Design',
      'Technology & Engineering',
      'Finance & Investing',
      'Leadership & HR',
      'Legal & Compliance',
      'Other'
    )
    .required()
    .messages({
      'any.only': 'Invalid category',
      'any.required': 'Category is required',
    }),
    
  company: Joi.string()
    .max(100)
    .allow('', null),
    
  experienceYears: Joi.number()
    .min(0)
    .max(70)
    .allow(null),
    
  skills: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one skill is required',
      'array.max': 'Cannot exceed 20 skills',
      'any.required': 'Skills are required',
    }),
    
  specialties: Joi.array()
    .items(Joi.string().trim())
    .max(10),
    
  languages: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one language is required',
      'any.required': 'Languages are required',
    }),
    
  // Availability settings
  availability: Joi.object({
    timezone: Joi.string().default('UTC'),
    bufferMinutes: Joi.number().min(0).max(120).default(15),
    minNoticeHours: Joi.number().min(0).max(168).default(2),
    maxAdvanceDays: Joi.number().min(1).max(365).default(90),
  }).optional(),
});

// Update Expert Profile
export const updateExpertSchema = Joi.object({
  headline: Joi.string().min(10).max(200),
  bio: Joi.string().min(100).max(2000),
  hourlyRate: Joi.number().min(10).max(1000),
  category: Joi.string().valid(
    'Business & Strategy',
    'Marketing & Growth',
    'Product & Design',
    'Technology & Engineering',
    'Finance & Investing',
    'Leadership & HR',
    'Legal & Compliance',
    'Other'
  ),
  company: Joi.string().max(100).allow('', null),
  experienceYears: Joi.number().min(0).max(70).allow(null),
  skills: Joi.array().items(Joi.string().trim()).min(1).max(20),
  specialties: Joi.array().items(Joi.string().trim()).max(10),
  languages: Joi.array().items(Joi.string().trim()).min(1),
  availability: Joi.object({
    timezone: Joi.string(),
    bufferMinutes: Joi.number().min(0).max(120),
    minNoticeHours: Joi.number().min(0).max(168),
    maxAdvanceDays: Joi.number().min(1).max(365),
    weeklySchedule: Joi.object({
      monday: Joi.array().items(Joi.object({
        start: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      })),
      tuesday: Joi.array().items(Joi.object({
        start: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      })),
      wednesday: Joi.array().items(Joi.object({
        start: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      })),
      thursday: Joi.array().items(Joi.object({
        start: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      })),
      friday: Joi.array().items(Joi.object({
        start: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      })),
      saturday: Joi.array().items(Joi.object({
        start: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      })),
      sunday: Joi.array().items(Joi.object({
        start: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      })),
    }),
  }),
  profilePublic: Joi.boolean(),
  acceptingBookings: Joi.boolean(),
}).min(1); // At least one field must be provided

// Admin Verification
export const approveExpertSchema = Joi.object({
  notes: Joi.string().max(500).allow('', null),
  verifiedBadge: Joi.boolean().default(true),
});

export const rejectExpertSchema = Joi.object({
  notes: Joi.string().max(500).required().messages({
    'any.required': 'Rejection reason is required',
  }),
});

export const suspendExpertSchema = Joi.object({
  reason: Joi.string().max(500).required().messages({
    'any.required': 'Suspension reason is required',
  }),
});

// Search and Filter
export const searchExpertsSchema = Joi.object({
  query: Joi.string().max(100).allow(''),
  category: Joi.string().valid(
    'Business & Strategy',
    'Marketing & Growth',
    'Product & Design',
    'Technology & Engineering',
    'Finance & Investing',
    'Leadership & HR',
    'Legal & Compliance',
    'Other'
  ),
  minRate: Joi.number().min(0),
  maxRate: Joi.number().min(0),
  minRating: Joi.number().min(0).max(5),
  skills: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('rating', 'price_low', 'price_high', 'reviews', 'newest').default('rating'),
});
