import availabilityService from './availability.service.js';
import expertService from '../experts/expert.service.js';
import {
  updateAvailabilitySchema,
  createExceptionSchema,
  updateExceptionSchema,
  getAvailableSlotsSchema,
} from './availability.validation.js';

/**
 * Availability Controllers
 */

/**
 * @route   GET /api/v1/experts/:expertId/availability
 * @desc    Get expert availability settings
 * @access  Public (with optional auth for /me)
 */
export const getAvailability = async (req, res, next) => {
  try {
    // If expertId is 'me', get the authenticated user's expert profile
    let expertId = req.params.expertId;
    if (expertId === 'me') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }
      const expert = await expertService.getExpertByUserId(req.user.id);
      if (!expert) {
        return res.status(404).json({
          success: false,
          message: 'Expert profile not found',
        });
      }
      expertId = expert._id.toString();
    }
    
    const availability = await availabilityService.getAvailability(expertId);
    
    res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/experts/me/availability
 * @desc    Update availability settings
 * @access  Private (Expert)
 */
export const updateAvailability = async (req, res, next) => {
  try {
    const { error, value } = updateAvailabilitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const expert = await expertService.getExpertByUserId(req.user.id);
    const availability = await availabilityService.updateAvailability(expert._id, req.user.id, value);
    
    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/experts/me/availability/exceptions
 * @desc    Create availability exception
 * @access  Private (Expert)
 */
export const createException = async (req, res, next) => {
  try {
    const { error, value } = createExceptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const expert = await expertService.getExpertByUserId(req.user.id);
    const exception = await availabilityService.createException(expert._id, req.user.id, value);
    
    res.status(201).json({
      success: true,
      message: 'Exception created successfully',
      data: exception,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/experts/me/availability/exceptions
 * @desc    Get all exceptions
 * @access  Private (Expert)
 */
export const getExceptions = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertByUserId(req.user.id);
    const exceptions = await availabilityService.getExceptions(expert._id);
    
    res.status(200).json({
      success: true,
      data: exceptions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/experts/me/availability/exceptions/:exceptionId
 * @desc    Update exception
 * @access  Private (Expert)
 */
export const updateException = async (req, res, next) => {
  try {
    const { error, value } = updateExceptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const expert = await expertService.getExpertByUserId(req.user.id);
    const exception = await availabilityService.updateException(
      expert._id,
      req.user.id,
      req.params.exceptionId,
      value
    );
    
    res.status(200).json({
      success: true,
      message: 'Exception updated successfully',
      data: exception,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/experts/me/availability/exceptions/:exceptionId
 * @desc    Delete exception
 * @access  Private (Expert)
 */
export const deleteException = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertByUserId(req.user.id);
    const result = await availabilityService.deleteException(expert._id, req.user.id, req.params.exceptionId);
    
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/experts/:expertId/availability/slots
 * @desc    Get available time slots
 * @access  Public
 */
export const getAvailableSlots = async (req, res, next) => {
  try {
    const { error, value } = getAvailableSlotsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const slots = await availabilityService.getAvailableSlots(
      req.params.expertId,
      value.serviceId,
      new Date(value.startDate),
      new Date(value.endDate),
      value.timezone
    );
    
    res.status(200).json({
      success: true,
      data: {
        slots,
        count: slots.length,
        startDate: value.startDate,
        endDate: value.endDate,
        timezone: value.timezone,
      },
    });
  } catch (error) {
    next(error);
  }
};
