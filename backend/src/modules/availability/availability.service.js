import { Expert, Service } from '../../models/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateAvailableSlots, isSlotAvailable } from './slotGenerator.js';

/**
 * Availability Service
 * Business logic for expert availability management
 */

class AvailabilityService {
  /**
   * Get expert's availability settings
   */
  async getAvailability(expertId) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    return {
      timezone: expert.availability?.timezone || 'UTC',
      weeklySchedule: expert.availability?.weeklySchedule || {},
      exceptions: expert.availability?.exceptions || [],
      bufferMinutes: expert.availability?.bufferMinutes || 15,
      minNoticeHours: expert.availability?.minNoticeHours || 2,
      maxAdvanceDays: expert.availability?.maxAdvanceDays || 90,
    };
  }
  
  /**
   * Update expert's availability settings
   */
  async updateAvailability(expertId, userId, updates) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    // Verify ownership
    if (expert.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized to update this availability', 403);
    }
    
    // Update availability settings
    if (!expert.availability) {
      expert.availability = {};
    }
    
    if (updates.timezone !== undefined) {
      expert.availability.timezone = updates.timezone;
    }
    
    if (updates.weeklySchedule !== undefined) {
      expert.availability.weeklySchedule = updates.weeklySchedule;
    }
    
    if (updates.bufferMinutes !== undefined) {
      expert.availability.bufferMinutes = updates.bufferMinutes;
    }
    
    if (updates.minNoticeHours !== undefined) {
      expert.availability.minNoticeHours = updates.minNoticeHours;
    }
    
    if (updates.maxAdvanceDays !== undefined) {
      expert.availability.maxAdvanceDays = updates.maxAdvanceDays;
    }
    
    expert.markModified('availability');
    await expert.save();
    
    return this.getAvailability(expertId);
  }
  
  /**
   * Create availability exception
   */
  async createException(expertId, userId, exceptionData) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (expert.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    if (!expert.availability) {
      expert.availability = { exceptions: [] };
    }
    
    if (!expert.availability.exceptions) {
      expert.availability.exceptions = [];
    }
    
    // Check if exception already exists for this date
    const dateStr = new Date(exceptionData.date).toISOString().split('T')[0];
    const existingIndex = expert.availability.exceptions.findIndex(exc => {
      const excDateStr = new Date(exc.date).toISOString().split('T')[0];
      return excDateStr === dateStr;
    });
    
    if (existingIndex !== -1) {
      throw new AppError('Exception already exists for this date', 400);
    }
    
    expert.availability.exceptions.push(exceptionData);
    expert.markModified('availability');
    await expert.save();
    
    // Return the created exception with its ID
    const newException = expert.availability.exceptions[expert.availability.exceptions.length - 1];
    return newException;
  }
  
  /**
   * Get all exceptions
   */
  async getExceptions(expertId) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    return expert.availability?.exceptions || [];
  }
  
  /**
   * Update exception
   */
  async updateException(expertId, userId, exceptionId, updates) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (expert.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    const exception = expert.availability?.exceptions?.id(exceptionId);
    
    if (!exception) {
      throw new AppError('Exception not found', 404);
    }
    
    // Update fields
    if (updates.available !== undefined) {
      exception.available = updates.available;
    }
    
    if (updates.slots !== undefined) {
      exception.slots = updates.slots;
    }
    
    if (updates.reason !== undefined) {
      exception.reason = updates.reason;
    }
    
    expert.markModified('availability');
    await expert.save();
    
    return exception;
  }
  
  /**
   * Delete exception
   */
  async deleteException(expertId, userId, exceptionId) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (expert.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    if (!expert.availability?.exceptions) {
      throw new AppError('Exception not found', 404);
    }
    
    const exception = expert.availability.exceptions.id(exceptionId);
    
    if (!exception) {
      throw new AppError('Exception not found', 404);
    }
    
    exception.remove();
    expert.markModified('availability');
    await expert.save();
    
    return { message: 'Exception deleted successfully' };
  }
  
  /**
   * Get available slots for expert and service
   */
  async getAvailableSlots(expertId, serviceId, startDate, endDate, timezone = 'UTC') {
    // Get expert and service
    const [expert, service] = await Promise.all([
      Expert.findById(expertId),
      Service.findById(serviceId),
    ]);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    
    // Verify service belongs to expert
    if (service.expertId.toString() !== expertId.toString()) {
      throw new AppError('Service does not belong to this expert', 400);
    }
    
    // Verify expert is approved and accepting bookings
    if (expert.verificationStatus !== 'approved') {
      throw new AppError('Expert is not approved', 403);
    }
    
    if (!expert.acceptingBookings) {
      throw new AppError('Expert is not accepting bookings', 403);
    }
    
    // Verify service is active
    if (!service.isActive || service.status !== 'approved') {
      throw new AppError('Service is not available', 403);
    }
    
    // Generate slots
    const slots = await generateAvailableSlots(expert, service, startDate, endDate, timezone);
    
    return slots;
  }
  
  /**
   * Check if specific slot is available
   */
  async checkSlotAvailability(expertId, serviceId, startTime, duration) {
    const result = await isSlotAvailable(expertId, serviceId, new Date(startTime), duration);
    return result;
  }
}

export default new AvailabilityService();
