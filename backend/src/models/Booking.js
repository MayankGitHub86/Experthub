import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  // Parties
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expert',
    required: true,
    index: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },

  // Booking Details
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled time is required'],
    index: true
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: 15
  },
  endTime: {
    type: Date,
    required: true
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC'
  },

  // Status Management with State Machine
  status: {
    type: String,
    enum: [
      'pending',           // Initial state after creation
      'confirmed',         // Expert confirmed
      'payment_pending',   // Awaiting payment
      'paid',             // Payment completed
      'in_progress',      // Session started
      'completed',        // Session finished
      'cancelled',        // Cancelled by either party
      'refunded',         // Payment refunded
      'disputed',         // Dispute raised
      'no_show'          // Client didn't show up
    ],
    default: 'pending',
    required: true,
    index: true
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Pricing
  pricing: {
    baseAmount: {
      type: Number,
      required: true,
      min: 0
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Payment Details
  payment: {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    stripePaymentIntentId: String,
    stripeChargeId: String,
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'wallet', 'other']
    },
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String
  },

  // Cancellation
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    refundEligible: {
      type: Boolean,
      default: false
    },
    refundPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },

  // Communication
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  meetingLink: String, // Video call link
  meetingPlatform: {
    type: String,
    enum: ['zoom', 'google_meet', 'microsoft_teams', 'platform_internal', 'other']
  },

  // Client Information
  clientNotes: {
    type: String,
    maxlength: 1000
  },
  clientDocuments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Expert Notes (private)
  expertNotes: {
    type: String,
    maxlength: 2000
  },
  internalNotes: {
    type: String,
    maxlength: 1000
  },

  // Session Tracking
  session: {
    startedAt: Date,
    endedAt: Date,
    actualDuration: Number, // in minutes
    recordingUrl: String,
    transcript: String
  },

  // Reminders
  reminders: {
    clientReminded: {
      type: Boolean,
      default: false
    },
    expertReminded: {
      type: Boolean,
      default: false
    },
    lastReminderSent: Date
  },

  // Review
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },
  reviewRequestSent: {
    type: Boolean,
    default: false
  },

  // Dispute
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    raisedAt: Date,
    reason: String,
    resolution: String,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Metadata
  bookingNumber: {
    type: String,
    unique: true,
    index: true
  },
  source: {
    type: String,
    enum: ['web', 'mobile_app', 'api', 'admin'],
    default: 'web'
  },
  ipAddress: String,
  userAgent: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bookingSchema.index({ clientId: 1, status: 1, scheduledAt: -1 });
bookingSchema.index({ expertId: 1, status: 1, scheduledAt: -1 });
bookingSchema.index({ serviceId: 1, scheduledAt: -1 });
bookingSchema.index({ scheduledAt: 1, status: 1 });
bookingSchema.index({ 'payment.stripePaymentIntentId': 1 });
bookingSchema.index({ bookingNumber: 1 }, { unique: true });

// Compound index for double-booking prevention
bookingSchema.index({ 
  expertId: 1, 
  scheduledAt: 1, 
  endTime: 1,
  status: 1 
});

// Virtual for client details
bookingSchema.virtual('client', {
  ref: 'User',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Virtual for expert details
bookingSchema.virtual('expert', {
  ref: 'Expert',
  localField: 'expertId',
  foreignField: '_id',
  justOne: true
});

// Virtual for service details
bookingSchema.virtual('service', {
  ref: 'Service',
  localField: 'serviceId',
  foreignField: '_id',
  justOne: true
});

// Virtual for conversation
bookingSchema.virtual('conversation', {
  ref: 'Conversation',
  localField: 'conversationId',
  foreignField: '_id',
  justOne: true
});

// Virtual for review
bookingSchema.virtual('review', {
  ref: 'Review',
  localField: 'reviewId',
  foreignField: '_id',
  justOne: true
});

// Virtual for time until booking
bookingSchema.virtual('hoursUntilBooking').get(function() {
  const now = new Date();
  const scheduled = new Date(this.scheduledAt);
  const diff = scheduled - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
});

// Virtual for can cancel
bookingSchema.virtual('canCancel').get(function() {
  if (!['pending', 'confirmed', 'paid'].includes(this.status)) {
    return false;
  }
  // Check if within cancellation window
  const hoursUntil = this.hoursUntilBooking;
  return hoursUntil > 0; // Service-specific cancellation hours checked in method
});

// Pre-save middleware (Mongoose 9 async pattern)
bookingSchema.pre('save', async function() {
  // Calculate end time
  if (this.isModified('scheduledAt') || this.isModified('duration')) {
    this.endTime = new Date(this.scheduledAt.getTime() + this.duration * 60000);
  }

  // Generate booking number
  if (this.isNew && !this.bookingNumber) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNumber = `BK${Date.now()}-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate total amount
  if (this.isModified('pricing')) {
    this.totalAmount = this.pricing.baseAmount 
      + this.pricing.platformFee 
      + this.pricing.taxAmount 
      - this.pricing.discountAmount;
  }
});

// Pre-save: Add status to history (Mongoose 9 async pattern)
bookingSchema.pre('save', async function() {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
});

// Static method: Check for double booking
bookingSchema.statics.checkDoubleBooking = async function(expertId, scheduledAt, duration, excludeBookingId = null) {
  const endTime = new Date(scheduledAt.getTime() + duration * 60000);
  
  const query = {
    expertId,
    status: { $in: ['pending', 'confirmed', 'paid', 'in_progress'] },
    $or: [
      // New booking starts during existing booking
      {
        scheduledAt: { $lte: scheduledAt },
        endTime: { $gt: scheduledAt }
      },
      // New booking ends during existing booking
      {
        scheduledAt: { $lt: endTime },
        endTime: { $gte: endTime }
      },
      // New booking contains existing booking
      {
        scheduledAt: { $gte: scheduledAt },
        endTime: { $lte: endTime }
      }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await this.findOne(query);
  return conflictingBooking;
};

// Static method: Get bookings for date range
bookingSchema.statics.getBookingsInRange = function(expertId, startDate, endDate, statuses = null) {
  const query = {
    expertId,
    scheduledAt: { $gte: startDate, $lte: endDate }
  };

  if (statuses) {
    query.status = { $in: statuses };
  }

  return this.find(query)
    .populate('clientId', 'firstName lastName email profilePicture')
    .populate('serviceId', 'title duration')
    .sort({ scheduledAt: 1 });
};

// Static method: Get upcoming bookings
bookingSchema.statics.getUpcomingBookings = function(userId, limit = 10) {
  const now = new Date();
  return this.find({
    $or: [{ clientId: userId }, { expertId: userId }],
    scheduledAt: { $gte: now },
    status: { $in: ['confirmed', 'paid'] }
  })
    .sort({ scheduledAt: 1 })
    .limit(limit)
    .populate('clientId expertId serviceId');
};

// Static method: Get past bookings
bookingSchema.statics.getPastBookings = function(userId, limit = 20) {
  const now = new Date();
  return this.find({
    $or: [{ clientId: userId }, { expertId: userId }],
    scheduledAt: { $lt: now },
    status: { $in: ['completed', 'cancelled', 'no_show'] }
  })
    .sort({ scheduledAt: -1 })
    .limit(limit)
    .populate('clientId expertId serviceId reviewId');
};

// Instance method: Change status with validation
bookingSchema.methods.changeStatus = async function(newStatus, userId, reason = '') {
  const allowedTransitions = {
    pending: ['confirmed', 'cancelled', 'payment_pending'],
    confirmed: ['payment_pending', 'paid', 'cancelled'],
    payment_pending: ['paid', 'cancelled'],
    paid: ['in_progress', 'cancelled', 'no_show'],
    in_progress: ['completed'],
    completed: ['disputed', 'refunded'],
    cancelled: ['refunded'],
    disputed: ['completed', 'refunded'],
    no_show: ['refunded'],
    refunded: []
  };

  const currentStatus = this.status;
  
  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }

  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    reason,
    timestamp: new Date()
  });

  // Handle special status changes
  if (newStatus === 'cancelled') {
    this.cancellation.cancelledBy = userId;
    this.cancellation.cancelledAt = new Date();
    this.cancellation.reason = reason;
  }

  if (newStatus === 'in_progress' && !this.session.startedAt) {
    this.session.startedAt = new Date();
  }

  if (newStatus === 'completed' && !this.session.endedAt) {
    this.session.endedAt = new Date();
    const duration = Math.floor((this.session.endedAt - this.session.startedAt) / 60000);
    this.session.actualDuration = duration;
  }

  await this.save();
  return this;
};

// Instance method: Calculate refund eligibility
bookingSchema.methods.calculateRefund = async function() {
  const Service = mongoose.model('Service');
  const service = await Service.findById(this.serviceId);
  
  if (!service) {
    return { eligible: false, percentage: 0, amount: 0 };
  }

  const hoursUntil = this.hoursUntilBooking;
  const cancellationHours = service.cancellationHours || 24;

  let refundPercentage = 0;

  if (hoursUntil >= cancellationHours) {
    // Full refund if cancelled with sufficient notice
    refundPercentage = 100;
  } else if (service.cancellationPolicy === 'flexible') {
    refundPercentage = hoursUntil >= 12 ? 50 : 0;
  } else if (service.cancellationPolicy === 'moderate') {
    refundPercentage = 0;
  } else if (service.cancellationPolicy === 'strict') {
    refundPercentage = 0;
  }

  const refundAmount = (this.totalAmount * refundPercentage) / 100;

  return {
    eligible: refundPercentage > 0,
    percentage: refundPercentage,
    amount: refundAmount,
    policy: service.cancellationPolicy
  };
};

// Instance method: Send reminders
bookingSchema.methods.shouldSendReminder = function() {
  const hoursUntil = this.hoursUntilBooking;
  
  // Send reminder 24 hours before
  if (hoursUntil <= 24 && hoursUntil > 23 && !this.reminders.lastReminderSent) {
    return true;
  }
  
  // Send reminder 1 hour before
  if (hoursUntil <= 1 && hoursUntil > 0) {
    const lastSent = this.reminders.lastReminderSent;
    if (!lastSent || (new Date() - lastSent) > 3600000) { // 1 hour
      return true;
    }
  }
  
  return false;
};

// Instance method: Mark as no-show
bookingSchema.methods.markAsNoShow = async function(userId) {
  if (this.status !== 'paid' && this.status !== 'in_progress') {
    throw new Error('Can only mark paid or in-progress bookings as no-show');
  }

  const now = new Date();
  if (now < this.endTime) {
    throw new Error('Cannot mark as no-show before scheduled end time');
  }

  await this.changeStatus('no_show', userId, 'Client did not show up');
  return this;
};

// Instance method: Start session
bookingSchema.methods.startSession = async function(userId) {
  if (this.status !== 'paid') {
    throw new Error('Can only start sessions for paid bookings');
  }

  await this.changeStatus('in_progress', userId, 'Session started');
  return this;
};

// Instance method: Complete session
bookingSchema.methods.completeSession = async function(userId) {
  if (this.status !== 'in_progress') {
    throw new Error('Can only complete in-progress sessions');
  }

  await this.changeStatus('completed', userId, 'Session completed');
  return this;
};

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;

