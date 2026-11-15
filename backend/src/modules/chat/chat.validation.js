import Joi from 'joi';

/**
 * Chat Validation Schemas
 */

export const createConversationSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID',
      'any.required': 'userId is required',
    }),

  type: Joi.string()
    .valid('direct', 'booking', 'support')
    .default('direct'),

  bookingId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid booking ID',
    }),
}).custom((value, helpers) => {
  if (value.type === 'booking' && !value.bookingId) {
    return helpers.error('any.invalid', { message: 'bookingId is required for booking type conversations' });
  }
  return value;
});

export const sendMessageSchema = Joi.object({
  content: Joi.string()
    .trim()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 5000 characters',
      'any.required': 'Message content is required',
    }),

  type: Joi.string()
    .valid('text', 'file', 'image', 'audio', 'video', 'system')
    .default('text'),

  attachments: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('file', 'image', 'audio', 'video', 'document'),
        filename: Joi.string().required(),
        url: Joi.string().uri().required(),
        size: Joi.number().min(0),
        mimeType: Joi.string(),
      })
    )
    .max(5),
}).custom((value, helpers) => {
  if (value.type === 'text' && !value.content) {
    return helpers.error('any.invalid', { message: 'Text messages require content' });
  }
  if (value.type !== 'text' && !value.attachments?.length) {
    return helpers.error('any.invalid', { message: 'Non-text messages require attachments' });
  }
  return value;
});

export const getMessagesSchema = Joi.object({
  limit: Joi.number()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),

  before: Joi.date()
    .iso()
    .messages({
      'date.base': 'Invalid before date',
    }),

  after: Joi.date()
    .iso()
    .messages({
      'date.base': 'Invalid after date',
    }),
}).custom((value, helpers) => {
  if (value.before && value.after) {
    if (new Date(value.before) <= new Date(value.after)) {
      return helpers.error('any.invalid', { message: 'before must be after after' });
    }
  }
  return value;
});

export const markAsReadSchema = Joi.object({
  messageIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),
});
