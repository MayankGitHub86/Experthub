/**
 * Request Validation Middleware
 * 
 * Validates request body, params, and query using Joi schemas
 */

export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });
    
    if (error) {
      const errors = {};
      error.details.forEach((detail) => {
        const key = detail.path.join('.');
        errors[key] = detail.message;
      });
      
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        errors,
      });
    }
    
    // Replace request data with validated & sanitized value
    req[property] = value;
    next();
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate request params
 */
export const validateParams = (schema) => validate(schema, 'params');

/**
 * Validate request query
 */
export const validateQuery = (schema) => validate(schema, 'query');

export default validate;
