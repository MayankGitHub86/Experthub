import express from 'express';
import * as bookingController from './booking.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = express.Router();

/**
 * Protected Routes (Authenticated)
 */

// Create hold (atomic reservation)
router.post('/holds', authenticate, bookingController.createHold);

// Confirm booking
router.post('/confirm', authenticate, bookingController.confirmBooking);
router.post('/', authenticate, bookingController.confirmBooking);

// Get my bookings
router.get('/me', authenticate, bookingController.getBookings);

// Get all bookings (filtered by user role)
router.get('/', authenticate, bookingController.getBookings);

// Get booking by ID
router.get('/:id', authenticate, bookingController.getBookingById);

// Cancel booking
router.patch('/:id/cancel', authenticate, bookingController.cancelBooking);
router.delete('/:id', authenticate, bookingController.cancelBooking);

// Reschedule booking
router.patch('/:id/reschedule', authenticate, bookingController.rescheduleBooking);

// Complete booking
router.post('/:id/complete', authenticate, bookingController.completeBooking);

export default router;
