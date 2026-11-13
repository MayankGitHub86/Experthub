import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  // Conversation
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // Sender
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Message Type
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'audio', 'video', 'system', 'booking_update'],
    default: 'text',
    required: true
  },

  // Content
  content: {
    type: String,
    required: function() {
      return this.type === 'text' || this.type === 'system';
    },
    maxlength: 5000
  },

  // Attachments
  attachments: [{
    type: {
      type: String,
      enum: ['file', 'image', 'audio', 'video', 'document']
    },
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    publicId: String, // Cloudinary or storage provider ID
    size: Number, // in bytes
    mimeType: String,
    thumbnail: String, // for images/videos
    duration: Number // for audio/video in seconds
  }],

  // Reply/Thread
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // Reactions
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Read Receipts
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Delivery Status
  deliveryStatus: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },

  // Edit History
  edited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Deletion
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }], // Soft delete for specific users

  // System Messages
  systemData: {
    eventType: {
      type: String,
      enum: [
        'booking_created',
        'booking_confirmed',
        'booking_cancelled',
        'booking_completed',
        'payment_received',
        'user_joined',
        'user_left',
        'conversation_archived'
      ]
    },
    data: mongoose.Schema.Types.Mixed
  },

  // Flags
  flags: {
    isImportant: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    isReported: {
      type: Boolean,
      default: false
    },
    reportReason: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: Date
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: {
      type: String,
      enum: ['web', 'mobile_ios', 'mobile_android', 'desktop']
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, deleted: 1, createdAt: -1 });
messageSchema.index({ 'readBy.userId': 1 });
messageSchema.index({ type: 1, conversationId: 1 });

// Text search index
messageSchema.index({ content: 'text' });

// Virtual for sender details
messageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
});

// Virtual for conversation
messageSchema.virtual('conversation', {
  ref: 'Conversation',
  localField: 'conversationId',
  foreignField: '_id',
  justOne: true
});

// Virtual for reply message
messageSchema.virtual('replyToMessage', {
  ref: 'Message',
  localField: 'replyTo',
  foreignField: '_id',
  justOne: true
});

// Virtual for is read
messageSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

// Virtual for reaction summary
messageSchema.virtual('reactionSummary').get(function() {
  if (!this.reactions || this.reactions.length === 0) return {};
  
  const summary = {};
  this.reactions.forEach(reaction => {
    if (summary[reaction.emoji]) {
      summary[reaction.emoji]++;
    } else {
      summary[reaction.emoji] = 1;
    }
  });
  return summary;
});

// Pre-save middleware
messageSchema.pre('save', async function(next) {
  // Update conversation's last message
  if (this.isNew && !this.deleted) {
    const Conversation = mongoose.model('Conversation');
    const conversation = await Conversation.findById(this.conversationId);
    
    if (conversation) {
      await conversation.updateLastMessage(this);
      
      // Increment unread count for other participants
      const participants = conversation.participants.filter(
        p => p.userId.toString() !== this.senderId.toString() && p.isActive
      );
      
      for (const participant of participants) {
        await conversation.incrementUnread(participant.userId);
      }
    }
  }
  
  next();
});

// Static method: Get conversation messages
messageSchema.statics.getConversationMessages = function(conversationId, options = {}) {
  const {
    limit = 50,
    before = null, // cursor-based pagination
    after = null,
    includeDeleted = false
  } = options;

  const query = { conversationId };

  if (!includeDeleted) {
    query.deleted = false;
  }

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  if (after) {
    query.createdAt = { $gt: new Date(after) };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'firstName lastName profilePicture')
    .populate('replyTo', 'content senderId type')
    .populate('readBy.userId', 'firstName lastName');
};

// Static method: Search messages
messageSchema.statics.searchMessages = function(conversationId, searchTerm, limit = 20) {
  return this.find({
    conversationId,
    deleted: false,
    type: 'text',
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  })
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'firstName lastName profilePicture');
};

// Static method: Get unread count
messageSchema.statics.getUnreadCount = async function(userId) {
  const Conversation = mongoose.model('Conversation');
  
  const conversations = await Conversation.find({
    'participants.userId': userId,
    'participants.isActive': true
  });

  let totalUnread = 0;
  conversations.forEach(conv => {
    const unread = conv.unreadCount.find(u => u.userId.toString() === userId.toString());
    if (unread) {
      totalUnread += unread.count;
    }
  });

  return totalUnread;
};

// Static method: Get messages with attachments
messageSchema.statics.getMessagesWithAttachments = function(conversationId, attachmentType = null) {
  const query = {
    conversationId,
    deleted: false,
    attachments: { $exists: true, $ne: [] }
  };

  if (attachmentType) {
    query['attachments.type'] = attachmentType;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('senderId', 'firstName lastName profilePicture');
};

// Instance method: Mark as read by user
messageSchema.methods.markAsRead = async function(userId) {
  const alreadyRead = this.readBy.some(r => r.userId.toString() === userId.toString());
  
  if (alreadyRead) {
    return this;
  }

  this.readBy.push({
    userId,
    readAt: new Date()
  });

  this.deliveryStatus = 'read';

  await this.save();

  // Update conversation unread count
  const Conversation = mongoose.model('Conversation');
  const conversation = await Conversation.findById(this.conversationId);
  if (conversation) {
    await conversation.markAsRead(userId);
  }

  return this;
};

// Instance method: Edit message
messageSchema.methods.editContent = async function(newContent) {
  if (this.type !== 'text') {
    throw new Error('Can only edit text messages');
  }

  if (this.deleted) {
    throw new Error('Cannot edit deleted messages');
  }

  // Save to edit history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });

  this.content = newContent;
  this.edited = true;

  await this.save();
  return this;
};

// Instance method: Delete message
messageSchema.methods.deleteMessage = async function(userId, deleteFor = 'everyone') {
  if (deleteFor === 'everyone') {
    this.deleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
  } else {
    // Soft delete for specific user
    if (!this.deletedFor.includes(userId)) {
      this.deletedFor.push(userId);
    }
  }

  await this.save();
  return this;
};

// Instance method: Add reaction
messageSchema.methods.addReaction = async function(userId, emoji) {
  // Check if user already reacted with this emoji
  const existingIndex = this.reactions.findIndex(
    r => r.userId.toString() === userId.toString() && r.emoji === emoji
  );

  if (existingIndex !== -1) {
    // Remove reaction (toggle)
    this.reactions.splice(existingIndex, 1);
  } else {
    // Remove any other reaction from this user
    this.reactions = this.reactions.filter(
      r => r.userId.toString() !== userId.toString()
    );
    
    // Add new reaction
    this.reactions.push({
      userId,
      emoji,
      createdAt: new Date()
    });
  }

  await this.save();
  return this;
};

// Instance method: Report message
messageSchema.methods.reportMessage = async function(userId, reason) {
  this.flags.isReported = true;
  this.flags.reportReason = reason;
  this.flags.reportedBy = userId;
  this.flags.reportedAt = new Date();

  await this.save();
  return this;
};

// Instance method: Pin message
messageSchema.methods.togglePin = async function() {
  this.flags.isPinned = !this.flags.isPinned;
  
  if (this.flags.isPinned) {
    // Add to conversation's pinned messages
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(
      this.conversationId,
      { $addToSet: { pinnedMessages: this._id } }
    );
  } else {
    // Remove from conversation's pinned messages
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(
      this.conversationId,
      { $pull: { pinnedMessages: this._id } }
    );
  }

  await this.save();
  return this;
};

// Instance method: Check if user can delete
messageSchema.methods.canDelete = function(userId) {
  // Users can delete their own messages
  // Admins can delete any message (checked separately)
  return this.senderId.toString() === userId.toString();
};

// Instance method: Check if user can edit
messageSchema.methods.canEdit = function(userId) {
  if (this.type !== 'text') return false;
  if (this.deleted) return false;
  if (this.senderId.toString() !== userId.toString()) return false;
  
  // Allow editing within 15 minutes
  const fifteenMinutes = 15 * 60 * 1000;
  const now = new Date();
  const timeSinceSent = now - this.createdAt;
  
  return timeSinceSent < fifteenMinutes;
};

const Message = mongoose.model('Message', messageSchema);

export default Message;

