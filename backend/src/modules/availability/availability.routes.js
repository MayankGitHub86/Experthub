import express from 'express';
import * as availabilityController from './availability.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

/**
 * Public Routes
 */

// Get expert availability settings
router.get('/experts/:expertId/availability', availabilityController.getAvailability);

// Get available slots
router.get('/experts/:expertId/availability/slots', availabilityController.getAvailableSlots);

/**
 * Protected Routes (Expert)
 */

// Update availability settings
router.put('/experts/me/availability', authenticate, authorize('expert'), availabilityController.updateAvailability);

// Exception management
router.post('/experts/me/availability/exceptions', authenticate, authorize('expert'), availabilityController.createException);
router.get('/experts/me/availability/exceptions', authenticate, authorize('expert'), availabilityController.getExceptions);
router.patch('/experts/me/availability/exceptions/:exceptionId', authenticate, authorize('expert'), availabilityController.updateException);
router.delete('/experts/me/availability/exceptions/:exceptionId', authenticate, authorize('expert'), availabilityController.deleteException);

export default router;
