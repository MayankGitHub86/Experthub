import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';

/**
 * ReservationUnit Model
 * 
 * Fixed-granularity reservation system for atomic double-booking prevention.
 * Each booking occupies multiple 15-minute reservation units.
 * 
 * CONCURRENCY DESIGN:
 * - Reservation granularity: 15 minutes
 * - Each unit has a unique {expertId, slotDateTime} combination
 * - A booking reserves ALL units it occupies ATOMICALLY
 * - Any conflict in ANY unit fails the ENTIRE reservation
 * - Buffer times are included as reserved units
 * 
 * Example: 60-minute booking at 10:00 with 15-minute buffer reserves:
 * - 09:45 (buffer before)
 * - 10:00 (booking start)
 * - 10:15
 * - 10:30
 * - 10:45
 * - 11:00 (buffer after)
 * 
 * This prevents:
 * - Identical slots
 * - Partially overlapping slots
 * - Buffer conflicts
 * - Different duration conflicts
 */

const reservationUnitSchema = new mongoose.Schema({
  // Expert being reserved
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expert',
    required: true,
    index: true,
  },
  
  // 15-minute slot datetime (rounded to nearest 15 minutes)
  slotDateTime: {
    type: Date,
    required: true,
    index: true,
  },
  
  // Hold reference
  holdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookingHold',
    required: true,
  },
  
  // Booking reference (null until confirmed)
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
  
  // Unit type
  unitType: {
    type: String,
    enum: ['buffer_before', 'booking', 'buffer_after'],
    required: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['held', 'confirmed', 'released'],
    default: 'held',
    required: true,
  },
  
  // Expiration (same as hold expiration)
  expiresAt: {
    type: Date,
    required: true,
    // Index is defined separately as TTL index below
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// CRITICAL: Unique compound index prevents ANY overlapping reservations
// This is the core of atomic double-booking prevention
reservationUnitSchema.index(
  {
    expertId: 1,
    slotDateTime: 1,
  },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['held', 'confirmed'] } },
    name: 'atomic_slot_reservation',
  }
);

// Additional indexes for queries
reservationUnitSchema.index({ holdId: 1 });
reservationUnitSchema.index({ bookingId: 1 });
reservationUnitSchema.index({ status: 1, expiresAt: 1 });

// TTL index for automatic cleanup (expires documents at the specified timestamp)
// Important: expireAfterSeconds: 0 means expire exactly at the timestamp, not after a delay
reservationUnitSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: 'ttl_cleanup',
  }
);

/**
 * Static method: Calculate 15-minute slot boundaries
 */
reservationUnitSchema.statics.roundToSlot = function(date) {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  d.setMinutes(roundedMinutes, 0, 0);
  return d;
};

/**
 * Static method: Generate slot times for a booking
 */
reservationUnitSchema.statics.generateSlots = function(startTime, duration, bufferBefore, bufferAfter) {
  const slots = [];
  
  // Round start time to 15-minute boundary
  const start = this.roundToSlot(startTime);
  
  // Calculate total duration including buffers
  const totalDuration = bufferBefore + duration + bufferAfter;
  const totalSlots = Math.ceil(totalDuration / 15);
  
  // Generate all slot times
  const currentSlot = new Date(start.getTime() - bufferBefore * 60 * 1000);
  
  for (let i = 0; i < totalSlots; i++) {
    const slotTime = this.roundToSlot(currentSlot);
    
    // Determine unit type
    let unitType;
    const minutesFromStart = (slotTime - start) / (60 * 1000);
    
    if (minutesFromStart < 0) {
      unitType = 'buffer_before';
    } else if (minutesFromStart >= duration) {
      unitType = 'buffer_after';
    } else {
      unitType = 'booking';
    }
    
    slots.push({
      slotDateTime: new Date(slotTime),
      unitType,
    });
    
    currentSlot.setMinutes(currentSlot.getMinutes() + 15);
  }
  
  return slots;
};

/**
 * Static method: Atomically create reservation units
 * Returns success or conflict error
 * 
 * @param {ObjectId} expertId - Expert booking the time
 * @param {ObjectId} holdId - The booking hold
 * @param {Date} startTime - Booking start time
 * @param {Number} duration - Duration in minutes
 * @param {Number} bufferMinutes - Buffer before and after
 * @param {Date} expiresAt - When the hold expires
 * @param {Session} session - Optional MongoDB session for transactions
 */
reservationUnitSchema.statics.createReservation = async function(
  expertId, 
  holdId, 
  startTime, 
  duration, 
  bufferMinutes, 
  expiresAt,
  session = null
) {
  const slots = this.generateSlots(startTime, duration, bufferMinutes, bufferMinutes);
  
  const units = slots.map(slot => ({
    expertId,
    holdId,
    slotDateTime: slot.slotDateTime,
    unitType: slot.unitType,
    status: 'held',
    expiresAt,
  }));
  
  try {
    // ATOMIC: ordered=true means STOP on first error
    // If session provided, operations are part of a transaction
    const options = { ordered: true };
    if (session) {
      options.session = session;
    }
    
    await this.insertMany(units, options);
    return { success: true, units };
  } catch (error) {
    // E11000 = duplicate key (conflict)
    if (error.code === 11000) {
      // Clean up any units that were created before the conflict
      // (only applies to non-transactional contexts; in transactions this is automatic)
      if (!session) {
        try {
          await this.deleteMany({ holdId });
        } catch (cleanupErr) {
          // Log but don't mask the E11000 error
          console.error('Error cleaning up conflicted units:', cleanupErr);
        }
      }
      // Note: If in a transaction (session != null), cleanup happens via rollback
      
      // THROW the error so the calling transaction can be rolled back
      // Do NOT return success:false - that masks the atomic constraint violation
      throw new AppError('Time slot conflicts with existing reservation', 409);
    }
    throw error;
  }
};

/**
 * Static method: Confirm reservation (convert held → confirmed)
 * Must verify hold hasn't expired
 */
reservationUnitSchema.statics.confirmReservation = async function(holdId, bookingId, session = null) {
  const options = session ? { session } : {};
  
  // Verify hold still exists and hasn't expired (read within same transaction context if available)
  const hold = await mongoose.model('BookingHold').findById(holdId, {}, options);
  
  if (!hold) {
    throw new Error('Hold not found');
  }
  
  if (hold.expiresAt < new Date()) {
    throw new Error('Hold has expired');
  }
  
  // Update all held units to confirmed
  const result = await this.updateMany(
    { holdId, status: 'held' },
    {
      $set: {
        status: 'confirmed',
        bookingId,
      },
    },
    options
  );
  
  return result.modifiedCount;
};

/**
 * Static method: Release reservation
 */
reservationUnitSchema.statics.releaseReservation = async function(holdId, session = null) {
  const options = session ? { session } : {};
  const result = await this.updateMany(
    { holdId, status: 'held' },
    { $set: { status: 'released' } },
    options
  );
  
  return result.modifiedCount;
};

/**
 * Static method: Release booking reservation (for cancellation)
 */
reservationUnitSchema.statics.releaseBookingReservation = async function(bookingId, session = null) {
  const options = session ? { session } : {};
  const result = await this.updateMany(
    { bookingId, status: 'confirmed' },
    { $set: { status: 'released' } },
    options
  );
  
  return result.modifiedCount;
};

/**
 * Static method: Check for conflicts
 */
reservationUnitSchema.statics.checkConflicts = async function(expertId, startTime, duration, bufferMinutes) {
  const slots = this.generateSlots(startTime, duration, bufferMinutes, bufferMinutes);
  
  const now = new Date();
  const conflicts = await this.find({
    expertId,
    slotDateTime: { $in: slots.map(s => s.slotDateTime) },
    status: { $in: ['held', 'confirmed'] },
    $or: [
      { status: 'confirmed' }, // Always check confirmed bookings
      { status: 'held', expiresAt: { $gt: now } }, // Only non-expired holds
    ],
  });
  
  return conflicts.length > 0;
};

/**
 * Static method: Clean up expired holds
 */
reservationUnitSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      status: 'held',
      expiresAt: { $lte: now },
    },
    {
      $set: { status: 'released' },
    }
  );
  
  return result.modifiedCount;
};

const ReservationUnit = mongoose.model('ReservationUnit', reservationUnitSchema);

export default ReservationUnit;
