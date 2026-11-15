import { Conversation, Message } from '../../models/index.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Chat Service - Business logic for messaging
 */

class ChatService {
  /**
   * Authenticate Socket.io connection and verify token
   */
  async authenticateSocket(token) {
    const jwt = await import('jsonwebtoken');
    const config = (await import('../../config/environment.js')).default;

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    try {
      const decoded = jwt.default.verify(token, config.jwtSecret);
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }

  /**
   * Join conversation room - verify membership
   */
  async joinConversation(userId, conversationId) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.isParticipant(userId)) {
      throw new AppError('Not a participant in this conversation', 403);
    }

    return conversation;
  }

  /**
   * Save a real-time message with server-side validation
   */
  async saveRealTimeMessage(conversationId, senderId, content, messageType = 'text') {
    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.isParticipant(senderId)) {
      throw new AppError('Not authorized to send messages in this conversation', 403);
    }

    // Validate content
    if (!content || !content.trim() || content.length > 5000) {
      throw new AppError('Invalid message content', 400);
    }

    // Create and persist message
    const message = new Message({
      conversationId,
      senderId,
      type: messageType,
      content: content.trim(),
      deliveryStatus: 'sent',
    });

    await message.save();
    await message.populate('senderId', 'firstName lastName profilePicture');

    // Conversation.pre('save') middleware will:
    // - Update last message
    // - Increment unread counts for other participants
    // - Update lastActivityAt

    return message;
  }

  /**
   * Mark messages in conversation as read for a user
   */
  async markConversationRead(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.isParticipant(userId)) {
      throw new AppError('Not authorized', 403);
    }

    // Find all unread messages
    const messages = await Message.find({
      conversationId,
      deleted: false,
      'readBy.userId': { $ne: userId },
    });

    // Mark as read
    for (const message of messages) {
      await message.markAsRead(userId);
    }

    // Update conversation unread count
    await conversation.markAsRead(userId);

    return { count: messages.length };
  }

  /**
   * Handle disconnection cleanup
   */
  async handleDisconnect(userId, conversationId) {
    // Optional: could track user presence, update last seen, etc.
    // For now, just log the disconnection
    return { userId, conversationId };
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(conversationId, userId, searchTerm, limit = 20) {
    // Verify authorization
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(userId)) {
      throw new AppError('Not authorized', 403);
    }

    return Message.searchMessages(conversationId, searchTerm, limit);
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId) {
    const Conversation = (await import('../../models/index.js')).default.Conversation;

    const conversations = await Conversation.find({
      'participants.userId': userId,
      'participants.isActive': true,
    });

    let totalUnread = 0;
    conversations.forEach(conv => {
      const unread = conv.unreadCount.find(u => u.userId.toString() === userId.toString());
      if (unread) {
        totalUnread += unread.count;
      }
    });

    return totalUnread;
  }

  /**
   * Get conversation for booking
   */
  async getOrCreateBookingConversation(bookingId, userId, otherUserId) {
    let conversation = await Conversation.findOne({
      bookingId,
      type: 'booking',
    });

    if (!conversation) {
      conversation = new Conversation({
        type: 'booking',
        bookingId,
        participants: [
          { userId, role: 'client' },
          { userId: otherUserId, role: 'expert' },
        ],
        unreadCount: [
          { userId, count: 0 },
          { userId: otherUserId, count: 0 },
        ],
      });
      await conversation.save();
    }

    return conversation;
  }
}

export default new ChatService();
