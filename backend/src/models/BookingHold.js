import mongoose from 'mongoose';

/**
 * BookingHold Model
 * 
 * Temporary reservation to prevent double-booking race conditions.
 * Holds are created atomically before booking confirmation.
 * Expired holds are automatically cleaned up via TTL index.
 */

const bookingHoldSchema = new mongoose.Schema({
  // Expert being booked
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expert',
    required: true,
    index: true,
  },
  
  // Time slot being held
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  
  endTime: {
    type: Date,
    required: true,
    index: true,
  },
  
  // Client holding the slot
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Associated service
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  
  // Hold expiration
  expiresAt: {
    type: Date,
    required: true,
    index: true, // TTL index will be added below
  },
  
  // Booking ID once confirmed (null while held)
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
  
  // Hold status
  status: {
    type: String,
    enum: ['active', 'confirmed', 'expired', 'released'],
    default: 'active',
    required: true,
    index: true,
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // Manual createdAt to avoid updatedAt
});

// CRITICAL: Compound unique index to prevent overlapping holds
// This ensures no two active holds can overlap for the same expert
bookingHoldSchema.index(
  {
    expertId: 1,
    startTime: 1,
    endTime: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'prevent_overlapping_holds',
  }
);

// TTL index to automatically delete expired documents
// Note: MongoDB checks TTL indexes every 60 seconds
bookingHoldSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: 'ttl_expiration',
  }
);

// Additional indexes for queries
bookingHoldSchema.index({ clientId: 1, status: 1 });
bookingHoldSchema.index({ bookingId: 1 });

// Static method: Create an atomic hold
bookingHoldSchema.statics.createHold = async function(data) {
  const {
    expertId,
    startTime,
    endTime,
    clientId,
    serviceId,
    holdDurationMinutes = 15, // Default 15-minute hold
  } = data;
  
  const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);
  
  try {
    // Attempt to create hold
    // If overlapping active hold exists, unique index will throw error
    const hold = new this({
      expertId,
      startTime,
      endTime,
      clientId,
      serviceId,
      expiresAt,
      status: 'active',
    });
    
    await hold.save();
    return { success: true, hold };
  } catch (error) {
    // Check if it's a duplicate key error (code 11000)
    if (error.code === 11000) {
      return {
        success: false,
        error: 'TIME_SLOT_UNAVAILABLE',
        message: 'This time slot is already held or booked',
      };
    }
    throw error;
  }
};

// Static method: Check for conflicting holds or bookings
bookingHoldSchema.statics.checkConflicts = async function(expertId, startTime, endTime) {
  const now = new Date();
  
  // Find any active holds that overlap
  const conflictingHolds = await this.find({
    expertId,
    status: 'active',
    expiresAt: { $gt: now }, // Not expired
    $or: [
      // New slot starts during existing hold
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      // New slot ends during existing hold
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      // New slot contains existing hold
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
    ],
  });
  
  return conflictingHolds.length > 0;
};

// Instance method: Confirm hold (link to booking)
bookingHoldSchema.methods.confirm = async function(bookingId) {
  if (this.status !== 'active') {
    throw new Error('Can only confirm active holds');
  }
  
  if (new Date() > this.expiresAt) {
    this.status = 'expired';
    await this.save();
    throw new Error('Hold has expired');
  }
  
  this.bookingId = bookingId;
  this.status = 'confirmed';
  await this.save();
  
  return this;
};

// Instance method: Release hold (cancel before booking)
bookingHoldSchema.methods.release = async function() {
  if (this.status !== 'active') {
    throw new Error('Can only release active holds');
  }
  
  this.status = 'released';
  await this.save();
  
  return this;
};

// Instance method: Check if hold is still valid
bookingHoldSchema.methods.isValid = function() {
  return this.status === 'active' && new Date() < this.expiresAt;
};

// Static method: Clean up expired holds manually (backup to TTL)
bookingHoldSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lte: now },
    },
    {
      $set: { status: 'expired' },
    }
  );
  
  return result.modifiedCount;
};

// Static method: Get user's active holds
bookingHoldSchema.statics.getUserActiveHolds = function(clientId) {
  const now = new Date();
  
  return this.find({
    clientId,
    status: 'active',
    expiresAt: { $gt: now },
  })
    .populate('expertId', 'userId headline hourlyRate')
    .populate('serviceId', 'title duration price')
    .sort({ createdAt: -1 });
};

// Static method: Get expert's active holds
bookingHoldSchema.statics.getExpertActiveHolds = function(expertId) {
  const now = new Date();
  
  return this.find({
    expertId,
    status: 'active',
    expiresAt: { $gt: now },
  })
    .populate('clientId', 'firstName lastName email')
    .populate('serviceId', 'title duration')
    .sort({ startTime: 1 });
};

const BookingHold = mongoose.model('BookingHold', bookingHoldSchema);

export default BookingHold;
