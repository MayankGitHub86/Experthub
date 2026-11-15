import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  // Participants
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['client', 'expert'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Conversation Type
  type: {
    type: String,
    enum: ['direct', 'booking', 'support'],
    default: 'direct',
    required: true
  },

  // Related Booking (if type is 'booking')
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    index: true
  },

  // Conversation Metadata
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'closed', 'blocked'],
    default: 'active',
    index: true
  },

  // Last Message Info (for quick queries)
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    type: {
      type: String,
      enum: ['text', 'file', 'image', 'system']
    }
  },

  // Unread Counts per User
  unreadCount: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],

  // Pinned Messages
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],

  // Flags and Settings
  flags: {
    isEncrypted: {
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

  // Auto-archive settings
  autoArchiveAfterDays: {
    type: Number,
    default: 30
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Metadata
  metadata: {
    messageCount: {
      type: Number,
      default: 0
    },
    fileCount: {
      type: Number,
      default: 0
    },
    imageCount: {
      type: Number,
      default: 0
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
conversationSchema.index({ 'participants.userId': 1, status: 1 });
conversationSchema.index({ bookingId: 1 });
conversationSchema.index({ status: 1, lastActivityAt: -1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });

// Compound index for finding conversations between two users
conversationSchema.index({ 
  'participants.userId': 1,
  type: 1,
  status: 1
});

// Virtual for messages
conversationSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversationId',
  options: { sort: { createdAt: 1 } }
});

// Virtual for booking
conversationSchema.virtual('booking', {
  ref: 'Booking',
  localField: 'bookingId',
  foreignField: '_id',
  justOne: true
});

// Virtual for active participants
conversationSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => p.isActive);
});

// Pre-save middleware
conversationSchema.pre('save', async function() {
  // Update lastActivityAt when conversation is modified
  if (this.isModified()) {
    this.lastActivityAt = new Date();
  }
});

// Static method: Find or create conversation between two users
conversationSchema.statics.findOrCreateDirect = async function(userId1, userId2) {
  // Check if conversation already exists
  const existing = await this.findOne({
    type: 'direct',
    status: { $ne: 'blocked' },
    'participants.userId': { $all: [userId1, userId2] },
    'participants': { $size: 2 }
  }).populate('participants.userId', 'firstName lastName profilePicture');

  if (existing) {
    return existing;
  }

  // Create new conversation
  const conversation = new this({
    type: 'direct',
    participants: [
      { userId: userId1, role: 'client' },
      { userId: userId2, role: 'expert' }
    ],
    unreadCount: [
      { userId: userId1, count: 0 },
      { userId: userId2, count: 0 }
    ]
  });

  await conversation.save();
  await conversation.populate('participants.userId', 'firstName lastName profilePicture');
  return conversation;
};

// Static method: Find conversation by booking
conversationSchema.statics.findByBooking = async function(bookingId) {
  return this.findOne({ bookingId, type: 'booking' })
    .populate('participants.userId', 'firstName lastName profilePicture email')
    .populate('bookingId');
};

// Static method: Get user conversations
conversationSchema.statics.getUserConversations = async function(userId, options = {}) {
  const { 
    status = 'active',
    limit = 20,
    skip = 0,
    type = null
  } = options;

  const query = {
    'participants.userId': userId,
    'participants.isActive': true
  };

  if (status) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ 'lastMessage.timestamp': -1 })
    .skip(skip)
    .limit(limit)
    .populate('participants.userId', 'firstName lastName profilePicture')
    .populate('lastMessage.senderId', 'firstName lastName')
    .populate('bookingId', 'bookingNumber scheduledAt status');
};

// Static method: Search conversations
conversationSchema.statics.searchConversations = async function(userId, searchTerm) {
  const User = mongoose.model('User');
  
  // Find users matching the search term
  const users = await User.find({
    $or: [
      { firstName: new RegExp(searchTerm, 'i') },
      { lastName: new RegExp(searchTerm, 'i') },
      { email: new RegExp(searchTerm, 'i') }
    ]
  }).select('_id');

  const userIds = users.map(u => u._id);

  return this.find({
    'participants.userId': userId,
    $or: [
      { title: new RegExp(searchTerm, 'i') },
      { subject: new RegExp(searchTerm, 'i') },
      { 'participants.userId': { $in: userIds } }
    ],
    status: 'active'
  })
    .sort({ 'lastMessage.timestamp': -1 })
    .limit(20)
    .populate('participants.userId', 'firstName lastName profilePicture')
    .populate('lastMessage.senderId', 'firstName lastName');
};

// Instance method: Add participant
conversationSchema.methods.addParticipant = async function(userId, role = 'client') {
  const exists = this.participants.some(p => p.userId.toString() === userId.toString());
  
  if (exists) {
    throw new Error('User is already a participant');
  }

  this.participants.push({
    userId,
    role,
    joinedAt: new Date(),
    isActive: true
  });

  this.unreadCount.push({
    userId,
    count: 0
  });

  await this.save();
  return this;
};

// Instance method: Remove participant
conversationSchema.methods.removeParticipant = async function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  
  if (!participant) {
    throw new Error('User is not a participant');
  }

  participant.isActive = false;
  participant.leftAt = new Date();

  await this.save();
  return this;
};

// Instance method: Update unread count
conversationSchema.methods.incrementUnread = async function(userId) {
  const unread = this.unreadCount.find(u => u.userId.toString() === userId.toString());
  
  if (unread) {
    unread.count += 1;
  } else {
    this.unreadCount.push({ userId, count: 1 });
  }

  await this.save();
  return this;
};

// Instance method: Mark as read
conversationSchema.methods.markAsRead = async function(userId) {
  const unread = this.unreadCount.find(u => u.userId.toString() === userId.toString());
  
  if (unread) {
    unread.count = 0;
  }

  await this.save();
  return this;
};

// Instance method: Update last message
conversationSchema.methods.updateLastMessage = async function(message) {
  this.lastMessage = {
    content: message.content.substring(0, 100),
    senderId: message.senderId,
    timestamp: message.createdAt || new Date(),
    type: message.type
  };

  this.lastActivityAt = new Date();
  this.metadata.messageCount += 1;

  if (message.type === 'file') {
    this.metadata.fileCount += 1;
  } else if (message.type === 'image') {
    this.metadata.imageCount += 1;
  }

  await this.save();
  return this;
};

// Instance method: Archive conversation
conversationSchema.methods.archive = async function() {
  this.status = 'archived';
  await this.save();
  return this;
};

// Instance method: Close conversation
conversationSchema.methods.close = async function() {
  this.status = 'closed';
  await this.save();
  return this;
};

// Instance method: Block conversation
conversationSchema.methods.block = async function(userId, reason) {
  this.status = 'blocked';
  this.flags.isReported = true;
  this.flags.reportedBy = userId;
  this.flags.reportReason = reason;
  this.flags.reportedAt = new Date();
  await this.save();
  return this;
};

// Instance method: Check if user is participant
conversationSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => {
    // Handle both populated (User object) and non-populated (ObjectId) references
    const participantUserId = p.userId._id ? p.userId._id : p.userId;
    return participantUserId.toString() === userId.toString() && p.isActive;
  });
};

// Instance method: Get other participant (for direct conversations)
conversationSchema.methods.getOtherParticipant = function(userId) {
  if (this.type !== 'direct') {
    return null;
  }

  const other = this.participants.find(
    p => p.userId.toString() !== userId.toString() && p.isActive
  );

  return other ? other.userId : null;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;

