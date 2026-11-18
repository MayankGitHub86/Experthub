import express from 'express';
import { listUsers, getUserDetails } from './user.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { isAdmin } from '../../middleware/authorize.js';

const router = express.Router();

// Admin only routes
router.get('/', authenticate, isAdmin, listUsers);
router.get('/:id', authenticate, isAdmin, getUserDetails);

export default router;
