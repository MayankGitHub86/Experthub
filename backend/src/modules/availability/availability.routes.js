import express from 'express';
import * as availabilityController from './availability.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

/**
 * Protected Routes (Expert) - Must come FIRST before public /:expertId route
 */

// Get expert's availability settings
router.get('/me/availability', authenticate, authorize('expert'), availabilityController.getAvailability);

// Update availability settings
router.put('/me/availability', authenticate, authorize('expert'), availabilityController.updateAvailability);

// Exception management
router.post('/me/availability/exceptions', authenticate, authorize('expert'), availabilityController.createException);
router.get('/me/availability/exceptions', authenticate, authorize('expert'), availabilityController.getExceptions);
router.patch('/me/availability/exceptions/:exceptionId', authenticate, authorize('expert'), availabilityController.updateException);
router.delete('/me/availability/exceptions/:exceptionId', authenticate, authorize('expert'), availabilityController.deleteException);

/**
 * Public Routes
 */

// Get expert availability settings (legacy route)
router.get('/:expertId/availability', availabilityController.getAvailability);

// Get available slots (legacy route)
router.get('/:expertId/availability/slots', availabilityController.getAvailableSlots);

export default router;
