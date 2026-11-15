import express from 'express';
import * as expertController from './expert.controller.js';
import * as availabilityController from '../availability/availability.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { isAdmin, authorize } from '../../middleware/authorize.js';

const router = express.Router();

/**
 * Public Routes
 */

// Search experts (public)
router.get('/', expertController.searchExperts);

// Get featured experts
router.get('/featured', expertController.getFeaturedExperts);

// Get top-rated experts
router.get('/top-rated', expertController.getTopRatedExperts);

/**
 * Protected Routes (Authenticated Users)
 */

// Get my expert profile
router.get('/me/profile', authenticate, authorize('expert'), expertController.getMyExpertProfile);

// Get my availability (protected)
router.get('/me/availability', authenticate, authorize('expert'), availabilityController.getMyAvailability);

// Create expert profile
router.post('/', authenticate, expertController.createExpert);

// Update my expert profile
router.patch('/me', authenticate, authorize('expert'), expertController.updateExpert);

// Submit profile for verification
router.post('/me/submit-verification', authenticate, authorize('expert'), expertController.submitForVerification);

// Update my availability
router.put('/me/availability', authenticate, authorize('expert'), availabilityController.updateAvailability);

// Exception management
router.post('/me/availability/exceptions', authenticate, authorize('expert'), availabilityController.createException);
router.get('/me/availability/exceptions', authenticate, authorize('expert'), availabilityController.getExceptions);
router.patch('/me/availability/exceptions/:exceptionId', authenticate, authorize('expert'), availabilityController.updateException);
router.delete('/me/availability/exceptions/:exceptionId', authenticate, authorize('expert'), availabilityController.deleteException);

/**
 * Admin Routes
 */

// Get pending experts
router.get('/admin/pending', authenticate, isAdmin, expertController.getPendingExperts);

// Approve expert
router.patch('/admin/:id/approve', authenticate, isAdmin, expertController.approveExpert);

// Reject expert
router.patch('/admin/:id/reject', authenticate, isAdmin, expertController.rejectExpert);

// Suspend expert
router.patch('/admin/:id/suspend', authenticate, isAdmin, expertController.suspendExpert);

// Reactivate expert
router.patch('/admin/:id/reactivate', authenticate, isAdmin, expertController.reactivateExpert);

/**
 * Public Routes (continued - must be after /me and /admin routes)
 */

// Get expert by ID (public)
router.get('/:id', expertController.getExpertById);

// Get expert availability (public)
router.get('/:expertId/availability', availabilityController.getExpertAvailability);

// Get expert availability slots (public)
router.get('/:expertId/availability/slots', availabilityController.getAvailableSlots);

export default router;
