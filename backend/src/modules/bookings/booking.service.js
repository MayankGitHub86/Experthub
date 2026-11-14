import { Booking, BookingHold, Expert, Service, ReservationUnit } from '../../models/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import mongoose from 'mongoose';

/**
 * Booking Service
 * Two-phase booking with atomic reservation using fixed-granularity slots
 * 
 * Transaction Strategy:
 * - If MongoDB supports transactions (replica set): Use full ACID transactions
 * - If standalone: Use session-aware operations with explicit cleanup on failure
 * 
 * All operations maintain referential integrity:
 * - Hold and ReservationUnits created together
 * - No orphaned records left behind on failure
 * - Idempotency keys prevent duplicate holds
 */

class BookingService {
  /**
   * Helper: Wrap operations with transaction if supported
   * 
   * IMPORTANT: Requires MongoDB replica set or sharded cluster
   * Standalone MongoDB will throw an error and transactions will not be available
   * 
   * Includes retry logic for transient WriteConflict errors
   */
  async _withTransaction(fn) {
    const MAX_RETRIES = 3;
    let lastError;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let session;
      let transactionSupported = false;
      
      try {
        session = await mongoose.startSession();
        
        // Check if transactions are actually supported
        try {
          session.startTransaction();
          transactionSupported = true;
        } catch (txnError) {
          // Transactions not supported (standalone MongoDB)
          // Provide clear error message
          if (txnError.message && txnError.message.includes('transactions are not allowed')) {
            logger.error('MongoDB transactions not supported on this deployment', {
              error: txnError.message,
              solution: 'Configure MongoDB replica set with: mongod --replSet rs0'
            });
            throw new AppError(
              'MongoDB replica set required for booking operations. ' +
              'Configure MongoDB with replication enabled.',
              500
            );
          }
          throw txnError;
        }
        
        const result = await fn(session);
        await session.commitTransaction();
        return result;
      } catch (error) {
        lastError = error;
        
        // If transaction is active, rollback
        if (session && transactionSupported) {
          try {
            await session.abortTransaction();
          } catch (abortErr) {
            logger.error('Error aborting transaction', { error: abortErr.message });
          }
        }
        
        // Retry on WriteConflict errors (transient errors)
        if (error.message && error.message.includes('WriteConflict') && attempt < MAX_RETRIES - 1) {
          logger.warn(`Transaction conflict (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`);
          // Add small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
        
        // Don't retry other errors, throw immediately
        throw error;
      } finally {
        if (session) {
          await session.endSession();
        }
      }
    }
    
    // All retries exhausted
    throw lastError || new AppError('Transaction failed after retries', 500);
  }

  /**
   * Phase 1: Create temporary hold (transactional)
   * Uses MongoDB session to ensure atomicity
   */
  async createHold(clientId, expertId, serviceId, startTime, timezone = 'UTC') {
    // Validate expert
    const expert = await Expert.findById(expertId);
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (expert.verificationStatus !== 'approved') {
      throw new AppError('Expert is not approved', 403);
    }
    
    if (!expert.acceptingBookings) {
      throw new AppError('Expert is not accepting bookings', 403);
    }
    
    // Validate service
    const service = await Service.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    
    if (service.expertId.toString() !== expertId.toString()) {
      throw new AppError('Service does not belong to this expert', 400);
    }
    
    if (!service.isActive || service.status !== 'approved') {
      throw new AppError('Service is not available', 403);
    }
    
    const duration = service.duration;
    const bufferMinutes = service.bufferTime || 15;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute hold
    
    // Note: We do NOT do a pre-check for conflicts here!
    // The unique index on ReservationUnit will atomically enforce the constraint
    // within the transaction. Any pre-check would be a TOCTOU (Time-of-Check Time-of-Use) bug
    // allowing concurrent requests to bypass the constraint.
    
    // Execute in transaction (if supported) or with session cleanup
    try {
      return await this._withTransaction(async (session) => {
        // Create booking hold record within transaction
        const holdDocs = await BookingHold.create([{
          expertId,
          startTime: start,
          endTime: end,
          clientId,
          serviceId,
          expiresAt,
          status: 'active',
        }], { session });
        
        const hold = holdDocs[0];
        
        // Reserve units within same transaction
        // If there's a conflict, createReservation will throw an error,
        // which will cause the transaction to abort automatically
        await ReservationUnit.createReservation(
          expertId,
          hold._id,
          start,
          duration,
          bufferMinutes,
          expiresAt,
          session
        );
        
        return hold;
      });
    } catch (error) {
      // If transaction wasn't supported, clean up hold if it was created
      if (error.message === 'Time slot conflicts with existing reservation') {
        // Conflict during reservation unit creation
        // Try to find and delete the hold that may have been created
        try {
          const orphanedHold = await BookingHold.findOne({
            clientId,
            expertId,
            serviceId,
            startTime: start,
            createdAt: { $gt: new Date(Date.now() - 10000) } // Within last 10 seconds
          });
          
          if (orphanedHold) {
            await BookingHold.findByIdAndDelete(orphanedHold._id);
            await ReservationUnit.deleteMany({ holdId: orphanedHold._id });
            logger.warn('Cleaned up orphaned hold after conflict', { holdId: orphanedHold._id });
          }
        } catch (cleanupErr) {
          logger.error('Error cleaning up orphaned hold', { error: cleanupErr.message });
          // Don't mask the original error
        }
      }
      throw error;
    }
  }
  
  /**
   * Phase 2: Confirm booking (converts hold to booking)
   * Transactional: booking creation and reservation confirmation must succeed together
   */
  async confirmBooking(holdId, clientId, clientNotes = '') {
    // Get hold first (outside transaction to validate permissions)
    const hold = await BookingHold.findById(holdId)
      .populate('expertId', 'userId')
      .populate('serviceId', 'title duration pricing');
    
    if (!hold) {
      throw new AppError('Booking hold not found', 404);
    }
    
    // Verify ownership
    if (hold.clientId.toString() !== clientId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    // Verify hold is still valid (before entering transaction)
    if (!hold.isValid()) {
      throw new AppError('Booking hold has expired', 410);
    }
    
    // Execute in transaction
    try {
      return await this._withTransaction(async (session) => {
        // Calculate pricing BEFORE creating booking
        const service = hold.serviceId;
        const baseAmount = service.pricing.amount;
        const platformFee = baseAmount * 0.15; // 15% platform fee
        const taxAmount = 0; // TODO: Calculate tax
        const discountAmount = 0;
        const totalAmount = baseAmount + platformFee + taxAmount - discountAmount;
        
        // Validate all amounts are finite numbers
        if (!isFinite(baseAmount) || !isFinite(platformFee) || !isFinite(totalAmount)) {
          throw new AppError('Invalid pricing calculation', 400);
        }
        
        // Generate booking number upfront (outside pre-save)
        const count = await Booking.countDocuments({}, { session });
        const bookingNumber = `BK${Date.now()}-${String(count + 1).padStart(6, '0')}`;
        
        // Calculate end time
        const endTime = new Date(hold.startTime.getTime() + service.duration * 60000);
        
        // Create booking within transaction
        const bookingDocs = await Booking.create([{
          clientId: hold.clientId,
          expertId: hold.expertId,
          serviceId: hold.serviceId._id,
          scheduledAt: hold.startTime,
          duration: service.duration,
          endTime: endTime,
          timezone: 'UTC',
          status: 'payment_pending',
          pricing: {
            baseAmount,
            platformFee,
            taxAmount,
            discountAmount,
            currency: service.pricing.currency || 'USD',
          },
          totalAmount,
          clientNotes,
          bookingNumber,
        }], { session });
        
        const booking = bookingDocs[0];
        
        // Confirm hold and units within same transaction
        await hold.constructor.findByIdAndUpdate(
          holdId,
          {
            status: 'confirmed',
            bookingId: booking._id,
            confirmedAt: new Date(),
          },
          { session }
        );
        
        // Confirm reservation units
        const unitsConfirmed = await ReservationUnit.confirmReservation(
          holdId,
          booking._id,
          session
        );
        
        if (unitsConfirmed === 0) {
          throw new AppError('No reservation units found to confirm', 500);
        }
        
        // Populate booking for response
        await booking.populate([
          { path: 'clientId', select: 'firstName lastName email' },
          { path: 'expertId', select: 'userId' },
          { path: 'serviceId', select: 'title duration pricing' },
        ]);
        
        return booking;
      });
    } catch (error) {
      // If error is expiration-related, throw appropriate response
      if (error.message && error.message.includes('expired')) {
        throw new AppError('Booking hold has expired', 410);
      }
      throw error;
    }
  }
  
  /**
   * Get booking by ID
   */
  async getBookingById(bookingId, userId, userRole) {
    const booking = await Booking.findById(bookingId)
      .populate('clientId', 'firstName lastName email')
      .populate('expertId', 'userId')
      .populate('serviceId', 'title duration pricing');
    
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    
    // Check authorization
    const isClient = booking.clientId._id.toString() === userId.toString();
    const isExpert = booking.expertId.userId.toString() === userId.toString();
    const isAdmin = userRole === 'admin';
    
    if (!isClient && !isExpert && !isAdmin) {
      throw new AppError('Not authorized to view this booking', 403);
    }
    
    return booking;
  }
  
  /**
   * Get user's bookings
   */
  async getUserBookings(userId, userRole, filters = {}) {
    const { status, page = 1, limit = 20 } = filters;
    
    const query = {};
    
    // Build query based on role
    if (userRole === 'expert') {
      // Get expert ID from userId
      const Expert = (await import('../../models/index.js')).Expert;
      const expert = await Expert.findOne({ userId });
      if (!expert) {
        return { bookings: [], pagination: { page, limit, total: 0, pages: 0 } };
      }
      query.expertId = expert._id;
    } else if (userRole === 'client') {
      query.clientId = userId;
    } else if (userRole === 'admin') {
      // Admin can see all bookings
    } else {
      query.clientId = userId;
    }
    
    if (status) {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('clientId', 'firstName lastName email')
        .populate('expertId', 'userId')
        .populate('serviceId', 'title duration pricing'),
      Booking.countDocuments(query),
    ]);
    
    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Cancel booking (release reservations and refund)
   */
  async cancelBooking(bookingId, userId, reason) {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    
    // Check authorization
    const isClient = booking.clientId.toString() === userId.toString();
    
    // Get expert userId
    const expert = await Expert.findById(booking.expertId);
    const isExpert = expert && expert.userId.toString() === userId.toString();
    
    if (!isClient && !isExpert) {
      throw new AppError('Not authorized to cancel this booking', 403);
    }
    
    // Check if can be cancelled
    if (!['pending', 'confirmed', 'paid', 'payment_pending'].includes(booking.status)) {
      throw new AppError('Booking cannot be cancelled', 400);
    }
    
    // Execute in transaction
    return await this._withTransaction(async (session) => {
      // Calculate refund
      const refundInfo = await booking.calculateRefund();
      
      // Update booking
      await booking.constructor.findByIdAndUpdate(
        bookingId,
        {
          status: 'cancelled',
          cancellation: {
            cancelledBy: userId,
            cancelledAt: new Date(),
            reason,
            refundEligible: refundInfo.eligible,
            refundPercentage: refundInfo.percentage,
          },
        },
        { session }
      );
      
      // Release reservation units (must pass session for transaction consistency)
      await ReservationUnit.releaseBookingReservation(bookingId, session);
      
      return { booking, refundInfo };
    });
  }
  
  /**
   * Reschedule booking (release old reservation and create new hold)
   */
  async rescheduleBooking(bookingId, userId, newStartTime, reason) {
    const booking = await Booking.findById(bookingId).populate('serviceId');
    
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    
    // Only client can reschedule
    if (booking.clientId.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    // Check if can be rescheduled
    if (!['confirmed', 'paid'].includes(booking.status)) {
      throw new AppError('Booking cannot be rescheduled', 400);
    }
    
    const newStart = new Date(newStartTime);
    const service = booking.serviceId;
    
    // Check if new slot is available
    const hasConflicts = await ReservationUnit.checkConflicts(
      booking.expertId,
      newStart,
      service.duration,
      service.bufferTime || 15
    );
    
    if (hasConflicts) {
      throw new AppError('New time slot not available', 409);
    }
    
    // Execute in transaction
    return await this._withTransaction(async (session) => {
      // Create new hold for new time
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      const holdDocs = await BookingHold.create([{
        expertId: booking.expertId,
        startTime: newStart,
        endTime: new Date(newStart.getTime() + service.duration * 60 * 1000),
        clientId: userId,
        serviceId: service._id,
        expiresAt,
        status: 'active',
      }], { session });
      
      const newHold = holdDocs[0];
      
      // Reserve new slots
      const reservationResult = await ReservationUnit.createReservation(
        booking.expertId,
        newHold._id,
        newStart,
        service.duration,
        service.bufferTime || 15,
        expiresAt,
        session
      );
      
      if (!reservationResult.success) {
        throw new AppError('Could not reserve new time slot', 409);
      }
      
      // Release old reservation
      await ReservationUnit.releaseBookingReservation(bookingId);
      
      // Update booking
      await booking.constructor.findByIdAndUpdate(
        bookingId,
        {
          scheduledAt: newStart,
          endTime: new Date(newStart.getTime() + service.duration * 60 * 1000),
          status: 'rescheduled',
          $push: {
            statusHistory: {
              status: 'rescheduled',
              changedBy: userId,
              reason: reason || 'Booking rescheduled',
              timestamp: new Date(),
            },
          },
        },
        { session }
      );
      
      // Confirm new hold and units
      await BookingHold.findByIdAndUpdate(
        newHold._id,
        { status: 'confirmed', bookingId },
        { session }
      );
      
      await ReservationUnit.confirmReservation(newHold._id, bookingId, session);
      
      return booking;
    });
  }
  
  /**
   * Complete booking (mark as completed)
   */
  async completeBooking(bookingId, userId) {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    
    // Get expert
    const expert = await Expert.findById(booking.expertId);
    const isExpert = expert && expert.userId.toString() === userId.toString();
    
    if (!isExpert) {
      throw new AppError('Only the expert can mark booking as completed', 403);
    }
    
    await booking.completeSession(userId);
    
    return booking;
  }
}

export default new BookingService();
