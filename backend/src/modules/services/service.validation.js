import Joi from 'joi';

/**
 * Service Validation Schemas
 */

// Create Service
export const createServiceSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(100)
    .required()
    .messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required',
    }),
    
  description: Joi.string()
    .min(50)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Description must be at least 50 characters',
      'string.max': 'Description cannot exceed 2000 characters',
      'any.required': 'Description is required',
    }),
    
  shortDescription: Joi.string()
    .max(200)
    .allow('', null),
    
  category: Joi.string()
    .valid(
      'business-consulting',
      'career-coaching',
      'financial-advice',
      'legal-consultation',
      'marketing-strategy',
      'technology-consulting',
      'health-wellness',
      'education-tutoring',
      'creative-services',
      'personal-development',
      'real-estate',
      'other'
    )
    .required()
    .messages({
      'any.only': 'Invalid category',
      'any.required': 'Category is required',
    }),
    
  tags: Joi.array()
    .items(Joi.string().trim())
    .max(10)
    .default([]),
    
  pricing: Joi.object({
    type: Joi.string()
      .valid('hourly', 'fixed', 'package')
      .required()
      .messages({
        'any.only': 'Pricing type must be hourly, fixed, or package',
        'any.required': 'Pricing type is required',
      }),
    amount: Joi.number()
      .min(10)
      .max(10000)
      .required()
      .messages({
        'number.min': 'Price must be at least $10',
        'number.max': 'Price cannot exceed $10,000',
        'any.required': 'Price amount is required',
      }),
    currency: Joi.string()
      .valid('USD', 'EUR', 'GBP', 'CAD', 'AUD')
      .default('USD'),
    packageDetails: Joi.when('type', {
      is: 'package',
      then: Joi.object({
        sessionsIncluded: Joi.number().min(1).required(),
        validityDays: Joi.number().min(1).required(),
      }).required(),
      otherwise: Joi.forbidden(),
    }),
  }).required(),
  
  duration: Joi.number()
    .min(15)
    .max(480)
    .required()
    .messages({
      'number.min': 'Duration must be at least 15 minutes',
      'number.max': 'Duration cannot exceed 8 hours (480 minutes)',
      'any.required': 'Duration is required',
    }),
    
  deliveryTime: Joi.number()
    .min(1)
    .max(365)
    .allow(null),
    
  maxBookingsPerDay: Joi.number()
    .min(1)
    .max(20)
    .default(5),
    
  bufferTime: Joi.number()
    .min(0)
    .max(120)
    .default(15),
    
  advanceBookingDays: Joi.number()
    .min(1)
    .max(365)
    .default(30),
    
  cancellationPolicy: Joi.string()
    .valid('flexible', 'moderate', 'strict')
    .default('moderate'),
    
  cancellationHours: Joi.number()
    .min(0)
    .max(168)
    .default(24),
    
  requirements: Joi.object({
    preparationNeeded: Joi.string().max(500).allow(''),
    documentsNeeded: Joi.array().items(Joi.string().trim()).max(10),
    prerequisites: Joi.string().max(500).allow(''),
  }).optional(),
  
  faqs: Joi.array().items(
    Joi.object({
      question: Joi.string().max(200).required(),
      answer: Joi.string().max(1000).required(),
    })
  ).max(10).default([]),
});

// Update Service
export const updateServiceSchema = Joi.object({
  title: Joi.string().min(5).max(100),
  description: Joi.string().min(50).max(2000),
  shortDescription: Joi.string().max(200).allow('', null),
  category: Joi.string().valid(
    'business-consulting',
    'career-coaching',
    'financial-advice',
    'legal-consultation',
    'marketing-strategy',
    'technology-consulting',
    'health-wellness',
    'education-tutoring',
    'creative-services',
    'personal-development',
    'real-estate',
    'other'
  ),
  tags: Joi.array().items(Joi.string().trim()).max(10),
  pricing: Joi.object({
    type: Joi.string().valid('hourly', 'fixed', 'package'),
    amount: Joi.number().min(10).max(10000),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD'),
    packageDetails: Joi.object({
      sessionsIncluded: Joi.number().min(1),
      validityDays: Joi.number().min(1),
    }),
  }),
  duration: Joi.number().min(15).max(480),
  deliveryTime: Joi.number().min(1).max(365).allow(null),
  maxBookingsPerDay: Joi.number().min(1).max(20),
  bufferTime: Joi.number().min(0).max(120),
  advanceBookingDays: Joi.number().min(1).max(365),
  cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict'),
  cancellationHours: Joi.number().min(0).max(168),
  requirements: Joi.object({
    preparationNeeded: Joi.string().max(500).allow(''),
    documentsNeeded: Joi.array().items(Joi.string().trim()).max(10),
    prerequisites: Joi.string().max(500).allow(''),
  }),
  faqs: Joi.array().items(
    Joi.object({
      question: Joi.string().max(200).required(),
      answer: Joi.string().max(1000).required(),
    })
  ).max(10),
  isActive: Joi.boolean(),
}).min(1); // At least one field must be provided

// Search Services
export const searchServicesSchema = Joi.object({
  query: Joi.string().max(100).allow(''),
  category: Joi.string().valid(
    'business-consulting',
    'career-coaching',
    'financial-advice',
    'legal-consultation',
    'marketing-strategy',
    'technology-consulting',
    'health-wellness',
    'education-tutoring',
    'creative-services',
    'personal-development',
    'real-estate',
    'other'
  ),
  expertId: Joi.string().regex(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  minDuration: Joi.number().min(15),
  maxDuration: Joi.number().max(480),
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('price_low', 'price_high', 'rating', 'popular', 'newest').default('rating'),
});
