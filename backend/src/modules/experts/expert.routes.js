import express from 'express';
import * as expertController from './expert.controller.js';
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

// Get expert by ID (public)
router.get('/:id', expertController.getExpertById);

/**
 * Protected Routes (Authenticated Users)
 */

// Create expert profile
router.post('/', authenticate, expertController.createExpert);

// Get my expert profile
router.get('/me/profile', authenticate, authorize('expert'), expertController.getMyExpertProfile);

// Update my expert profile
router.patch('/me', authenticate, authorize('expert'), expertController.updateExpert);

// Submit profile for verification
router.post('/me/submit-verification', authenticate, authorize('expert'), expertController.submitForVerification);

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

export default router;
