import { Conversation, Message } from '../../models/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  createConversationSchema,
  sendMessageSchema,
  getMessagesSchema,
  markAsReadSchema,
} from './chat.validation.js';

/**
 * Chat Controllers - REST API endpoints
 */

/**
 * @route   GET /api/v1/chat/conversations
 * @desc    Get authenticated user's conversations
 * @access  Private
 */
export const getUserConversations = async (req, res, next) => {
  try {
    const { status = 'active', limit = 20, page = 1, type } = req.query;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.getUserConversations(
      req.user.id,
      { status, limit, skip: skip, type }
    );

    const total = await Conversation.countDocuments({
      'participants.userId': req.user.id,
      'participants.isActive': true,
      ...(status && { status }),
      ...(type && { type }),
    });

    res.status(200).json({
      success: true,
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/chat/conversations/:conversationId
 * @desc    Get conversation details
 * @access  Private
 */
export const getConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants.userId', 'firstName lastName profilePicture email role')
      .populate('lastMessage.senderId', 'firstName lastName')
      .populate('bookingId', 'bookingNumber scheduledAt status');

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Check authorization
    if (!conversation.isParticipant(req.user.id)) {
      throw new AppError('Not authorized to access this conversation', 403);
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/chat/conversations
 * @desc    Create or get direct conversation
 * @access  Private
 */
export const createOrGetConversation = async (req, res, next) => {
  try {
    const { error, value } = createConversationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }

    const { userId, type = 'direct', bookingId } = value;

    // Can't create conversation with self
    if (userId === req.user.id.toString()) {
      throw new AppError('Cannot create conversation with yourself', 400);
    }

    let conversation;

    if (type === 'direct') {
      conversation = await Conversation.findOrCreateDirect(req.user.id, userId);
    } else if (type === 'booking' && bookingId) {
      // Find or create conversation linked to booking
      conversation = await Conversation.findOne({
        bookingId,
        type: 'booking',
      });

      if (!conversation) {
        conversation = new Conversation({
          type: 'booking',
          bookingId,
          participants: [
            { userId: req.user.id, role: 'client' },
            { userId, role: 'expert' },
          ],
          unreadCount: [
            { userId: req.user.id, count: 0 },
            { userId, count: 0 },
          ],
        });
        await conversation.save();
        await conversation.populate(
          'participants.userId',
          'firstName lastName profilePicture'
        );
      }
    } else {
      throw new AppError('Invalid conversation type', 400);
    }

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/chat/conversations/:conversationId/messages
 * @desc    Get paginated message history
 * @access  Private
 */
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { error, value } = getMessagesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }

    const { limit = 50, before, after } = value;

    // Check authorization
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.isParticipant(req.user.id)) {
      throw new AppError('Not authorized to access this conversation', 403);
    }

    const messages = await Message.getConversationMessages(conversationId, {
      limit,
      before,
      after,
    });

    // Get total count for pagination
    const total = await Message.countDocuments({
      conversationId,
      deleted: false,
    });

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        total,
        limit,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/chat/conversations/:conversationId/messages
 * @desc    Send a message
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }

    // Check authorization
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.isParticipant(req.user.id)) {
      throw new AppError('Not authorized to send messages in this conversation', 403);
    }

    // Create and save message
    const message = new Message({
      conversationId,
      senderId: req.user.id,
      type: value.type || 'text',
      content: value.content,
      attachments: value.attachments || [],
    });

    await message.save();
    await message.populate('senderId', 'firstName lastName profilePicture');

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/chat/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
export const markMessageAsRead = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Check authorization
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation.isParticipant(req.user.id)) {
      throw new AppError('Not authorized', 403);
    }

    await message.markAsRead(req.user.id);

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/chat/conversations/:conversationId/read
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
export const markConversationAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.isParticipant(req.user.id)) {
      throw new AppError('Not authorized', 403);
    }

    // Mark all unread messages as read
    const messages = await Message.find({
      conversationId,
      deleted: false,
    });

    for (const message of messages) {
      const alreadyRead = message.readBy.some(
        r => r.userId.toString() === req.user.id.toString()
      );
      if (!alreadyRead) {
        await message.markAsRead(req.user.id);
      }
    }

    await conversation.markAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Marked conversation as read',
      data: { conversationId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/chat/messages/:messageId/edit
 * @desc    Edit message
 * @access  Private
 */
export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('Message content is required', 400);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Check authorization
    if (message.senderId.toString() !== req.user.id.toString()) {
      throw new AppError('Can only edit your own messages', 403);
    }

    await message.editContent(content.trim());

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/chat/messages/:messageId
 * @desc    Delete message
 * @access  Private
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { deleteFor = 'everyone' } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Check authorization
    if (message.senderId.toString() !== req.user.id.toString()) {
      throw new AppError('Can only delete your own messages', 403);
    }

    if (!message.canDelete(req.user.id)) {
      throw new AppError('Cannot delete this message', 400);
    }

    await message.deleteMessage(req.user.id, deleteFor);

    res.status(200).json({
      success: true,
      message: 'Message deleted',
      data: { messageId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/chat/search
 * @desc    Search conversations
 * @access  Private
 */
export const searchConversations = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      throw new AppError('Search term must be at least 2 characters', 400);
    }

    const conversations = await Conversation.searchConversations(req.user.id, q);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};
