import bookingService from './booking.service.js';
import {
  createHoldSchema,
  confirmBookingSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
} from './booking.validation.js';

/**
 * Booking Controllers
 */

export const createHold = async (req, res, next) => {
  try {
    const { error, value } = createHoldSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const hold = await bookingService.createHold(
      req.user.id,
      value.expertId,
      value.serviceId,
      value.startTime,
      value.timezone
    );
    
    res.status(201).json({
      success: true,
      message: 'Time slot reserved',
      data: hold,
      expiresAt: hold.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmBooking = async (req, res, next) => {
  try {
    const { error, value } = confirmBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const booking = await bookingService.confirmBooking(
      value.holdId,
      req.user.id,
      value.clientNotes
    );
    
    res.status(201).json({
      success: true,
      message: 'Booking confirmed',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getUserBookings(
      req.user.id,
      req.user.role,
      {
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      }
    );
    
    res.status(200).json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(
      req.params.id,
      req.user.id,
      req.user.role
    );
    
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { error, value } = cancelBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const result = await bookingService.cancelBooking(
      req.params.id,
      req.user.id,
      value.reason
    );
    
    res.status(200).json({
      success: true,
      message: 'Booking cancelled',
      data: result.booking,
      refundInfo: result.refundInfo,
    });
  } catch (error) {
    next(error);
  }
};

export const rescheduleBooking = async (req, res, next) => {
  try {
    const { error, value } = rescheduleBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const booking = await bookingService.rescheduleBooking(
      req.params.id,
      req.user.id,
      value.newStartTime,
      value.reason
    );
    
    res.status(200).json({
      success: true,
      message: 'Booking rescheduled',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const completeBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.completeBooking(
      req.params.id,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      message: 'Booking marked as completed',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
