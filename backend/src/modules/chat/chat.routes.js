import express from 'express';
import * as chatController from './chat.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = express.Router();

/**
 * Chat Routes - All protected, require authentication
 */

// GET /api/v1/chat/conversations - Get user's conversations
router.get(
  '/conversations',
  authenticate,
  chatController.getUserConversations
);

// POST /api/v1/chat/conversations - Create or get conversation
router.post(
  '/conversations',
  authenticate,
  chatController.createOrGetConversation
);

// GET /api/v1/chat/conversations/:conversationId - Get conversation details
router.get(
  '/conversations/:conversationId',
  authenticate,
  chatController.getConversation
);

// GET /api/v1/chat/conversations/:conversationId/messages - Get messages
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  chatController.getMessages
);

// POST /api/v1/chat/conversations/:conversationId/messages - Send message
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  chatController.sendMessage
);

// PATCH /api/v1/chat/conversations/:conversationId/read - Mark all as read
router.patch(
  '/conversations/:conversationId/read',
  authenticate,
  chatController.markConversationAsRead
);

// PATCH /api/v1/chat/messages/:messageId/read - Mark message as read
router.patch(
  '/messages/:messageId/read',
  authenticate,
  chatController.markMessageAsRead
);

// PATCH /api/v1/chat/messages/:messageId/edit - Edit message
router.patch(
  '/messages/:messageId/edit',
  authenticate,
  chatController.editMessage
);

// DELETE /api/v1/chat/messages/:messageId - Delete message
router.delete(
  '/messages/:messageId',
  authenticate,
  chatController.deleteMessage
);

// GET /api/v1/chat/search - Search conversations
router.get(
  '/search',
  authenticate,
  chatController.searchConversations
);

export default router;
