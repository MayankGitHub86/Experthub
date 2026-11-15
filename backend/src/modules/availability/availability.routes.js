import express from 'express';
import * as availabilityController from './availability.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

/**
 * Protected Routes (Expert) - Must come FIRST before public /:expertId route
 */

// Get expert's availability settings
router.get('/experts/me/availability', authenticate, authorize('expert'), availabilityController.getAvailability);

// Update availability settings
router.put('/experts/me/availability', authenticate, authorize('expert'), availabilityController.updateAvailability);

// Exception management
router.post('/experts/me/availability/exceptions', authenticate, authorize('expert'), availabilityController.createException);
router.get('/experts/me/availability/exceptions', authenticate, authorize('expert'), availabilityController.getExceptions);
router.patch('/experts/me/availability/exceptions/:exceptionId', authenticate, authorize('expert'), availabilityController.updateException);
router.delete('/experts/me/availability/exceptions/:exceptionId', authenticate, authorize('expert'), availabilityController.deleteException);

/**
 * Public Routes
 */

// Get expert availability settings (legacy route)
router.get('/experts/:expertId/availability', availabilityController.getAvailability);

// Get available slots (legacy route)
router.get('/experts/:expertId/availability/slots', availabilityController.getAvailableSlots);

// New API v1 routes for booking workflow
// Get expert's available time slots for booking (with date filter)
router.get('/availability/expert/:expertId', availabilityController.getAvailableSlots);

// Get all expert's available slots without date filter
router.get('/availability/expert/:expertId/all', availabilityController.getAvailableSlots);

export default router;
