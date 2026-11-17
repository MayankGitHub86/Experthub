import express from 'express';
import * as serviceController from './service.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

/**
 * Public Routes
 */

// Search services
router.get('/', serviceController.searchServices);

// Get featured services
router.get('/featured', serviceController.getFeaturedServices);

// Get popular services
router.get('/popular', serviceController.getPopularServices);

// Get services by category
router.get('/category/:category', serviceController.getServicesByCategory);

/**
 * Protected Routes (Expert)
 */

// Create service
router.post('/', authenticate, authorize('expert'), serviceController.createService);

// Get my services (including inactive) - must be before /:id to avoid catching 'me' as an ID
router.get('/me', authenticate, authorize('expert'), serviceController.getMyServices);
router.get('/me/all', authenticate, authorize('expert'), serviceController.getMyServices);

/**
 * Public Routes (continued)
 */

// Get service by ID
router.get('/:id', serviceController.getServiceById);

// Get expert's services
router.get('/expert/:expertId', serviceController.getExpertServices);

/**
 * Protected Routes (Expert - continued)
 */

// Update service
router.patch('/:id', authenticate, authorize('expert'), serviceController.updateService);

// Delete service
router.delete('/:id', authenticate, authorize('expert'), serviceController.deleteService);

// Activate service
router.patch('/:id/activate', authenticate, authorize('expert'), serviceController.activateService);

// Deactivate service
router.patch('/:id/deactivate', authenticate, authorize('expert'), serviceController.deactivateService);

export default router;
