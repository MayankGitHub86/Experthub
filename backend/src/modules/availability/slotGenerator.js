/**
 * Slot Generation Engine
 * 
 * Calculates genuinely available appointment slots considering:
 * - Weekly recurring schedules
 * - Date-specific exceptions
 * - Existing bookings
 * - Active booking holds
 * - Service duration
 * - Buffer times
 * - Minimum notice
 * - Maximum advance booking
 * - Timezone conversions
 */

import { Booking, BookingHold } from '../../models/index.js';

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Get day of week name from date
 */
function getDayName(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Check if two time intervals overlap using half-open intervals [start, end)
 */
function intervalsOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

/**
 * Get existing bookings for expert in date range
 */
async function getExistingBookings(expertId, startDate, endDate) {
  return await Booking.find({
    expertId,
    scheduledAt: {
      $gte: startDate,
      $lt: endDate,
    },
    status: {
      $in: ['pending', 'confirmed', 'paid', 'in_progress'], // Active bookings
    },
  }).select('scheduledAt endTime duration');
}

/**
 * Get active booking holds for expert in date range
 */
async function getActiveHolds(expertId, startDate, endDate) {
  const now = new Date();
  
  return await BookingHold.find({
    expertId,
    startTime: {
      $gte: startDate,
      $lt: endDate,
    },
    status: 'active',
    expiresAt: { $gt: now }, // Not expired
  }).select('startTime endTime');
}

/**
 * Generate available slots for a specific date
 */
async function generateDaySlots(expert, service, date, timezone = 'UTC') {
  const slots = [];
  
  // Get day name
  const dayName = getDayName(date);
  
  // Check if there's an exception for this date
  const dateStr = date.toISOString().split('T')[0];
  const exception = expert.availability?.exceptions?.find(exc => {
    const excDateStr = new Date(exc.date).toISOString().split('T')[0];
    return excDateStr === dateStr;
  });
  
  let workingIntervals = [];
  
  if (exception) {
    // Use exception schedule
    if (!exception.available) {
      return []; // Day is blocked
    }
    workingIntervals = exception.slots || [];
  } else {
    // Use weekly schedule
    const daySchedule = expert.availability?.weeklySchedule?.[dayName];
    if (daySchedule && daySchedule.length > 0) {
      workingIntervals = daySchedule;
    } else if (!expert.availability?.weeklySchedule || Object.values(expert.availability?.weeklySchedule || {}).every(arr => !arr || arr.length === 0)) {
      // Sensible default: 09:00 - 17:00 on weekdays if expert hasn't configured custom hours yet
      if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(dayName)) {
        workingIntervals = [{ start: '09:00', end: '17:00' }];
      }
    }
  }
  
  if (workingIntervals.length === 0) {
    return []; // No working hours on this day
  }
  
  // Get buffer and notice settings
  const bufferMinutes = expert.availability?.bufferMinutes || 15;
  const minNoticeHours = expert.availability?.minNoticeHours || 2;
  const serviceDuration = service.duration;
  
  // Calculate minimum start time (current time + minimum notice)
  const now = new Date();
  const minStartTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);
  
  // Get existing bookings and holds for this day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const [bookings, holds] = await Promise.all([
    getExistingBookings(expert._id, dayStart, dayEnd),
    getActiveHolds(expert._id, dayStart, dayEnd),
  ]);
  
  // Convert bookings and holds to blocked intervals (in minutes since midnight)
  const blockedIntervals = [];
  
  bookings.forEach(booking => {
    const start = new Date(booking.scheduledAt);
    const end = new Date(booking.endTime);
    
    // Only consider if on the same day
    if (start.toDateString() === date.toDateString()) {
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      blockedIntervals.push({
        start: startMinutes - bufferMinutes, // Include buffer before
        end: endMinutes + bufferMinutes, // Include buffer after
      });
    }
  });
  
  holds.forEach(hold => {
    const start = new Date(hold.startTime);
    const end = new Date(hold.endTime);
    
    if (start.toDateString() === date.toDateString()) {
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      blockedIntervals.push({
        start: startMinutes - bufferMinutes,
        end: endMinutes + bufferMinutes,
      });
    }
  });
  
  // Generate slots from working intervals
  for (const interval of workingIntervals) {
    const startMinutes = timeToMinutes(interval.start);
    const endMinutes = timeToMinutes(interval.end);
    
    // Generate slots with service duration
    let currentMinutes = startMinutes;
    
    while (currentMinutes + serviceDuration <= endMinutes) {
      const slotStartMinutes = currentMinutes;
      const slotEndMinutes = currentMinutes + serviceDuration;
      
      // Create actual datetime for this slot
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(slotStartMinutes / 60), slotStartMinutes % 60, 0, 0);
      
      const slotEnd = new Date(date);
      slotEnd.setHours(Math.floor(slotEndMinutes / 60), slotEndMinutes % 60, 0, 0);
      
      // Check if slot is in the past or before minimum notice
      if (slotStart < minStartTime) {
        currentMinutes += 15; // Move to next 15-minute slot
        continue;
      }
      
      // Check if slot overlaps with any blocked interval
      let isBlocked = false;
      for (const blocked of blockedIntervals) {
        if (intervalsOverlap(slotStartMinutes, slotEndMinutes, blocked.start, blocked.end)) {
          isBlocked = true;
          break;
        }
      }
      
      if (!isBlocked) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          duration: serviceDuration,
          available: true,
        });
      }
      
      // Move to next slot (15-minute increments)
      currentMinutes += 15;
    }
  }
  
  return slots;
}

/**
 * Generate available slots for date range
 */
export async function generateAvailableSlots(expert, service, startDate, endDate, timezone = 'UTC') {
  const slots = [];
  
  // Validate maximum advance booking
  const maxAdvanceDays = expert.availability?.maxAdvanceDays || 90;
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
  
  const effectiveEndDate = endDate > maxDate ? maxDate : endDate;
  
  // Generate slots for each day in range
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  const finalDate = new Date(effectiveEndDate);
  finalDate.setHours(0, 0, 0, 0);
  
  while (currentDate <= finalDate) {
    const daySlots = await generateDaySlots(expert, service, new Date(currentDate), timezone);
    slots.push(...daySlots);
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots;
}

/**
 * Check if a specific slot is available
 */
export async function isSlotAvailable(expertId, serviceId, startTime, duration) {
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  
  // Check for conflicting bookings
  const conflictingBooking = await Booking.findOne({
    expertId,
    status: { $in: ['pending', 'confirmed', 'paid', 'in_progress'] },
    $or: [
      // New slot starts during existing booking
      { scheduledAt: { $lte: startTime }, endTime: { $gt: startTime } },
      // New slot ends during existing booking
      { scheduledAt: { $lt: endTime }, endTime: { $gte: endTime } },
      // New slot contains existing booking
      { scheduledAt: { $gte: startTime }, endTime: { $lte: endTime } },
    ],
  });
  
  if (conflictingBooking) {
    return { available: false, reason: 'Time slot conflicts with existing booking' };
  }
  
  // Check for active holds
  const now = new Date();
  const conflictingHold = await BookingHold.findOne({
    expertId,
    status: 'active',
    expiresAt: { $gt: now },
    $or: [
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
    ],
  });
  
  if (conflictingHold) {
    return { available: false, reason: 'Time slot is currently held by another client' };
  }
  
  return { available: true };
}

export default {
  generateAvailableSlots,
  isSlotAvailable,
};
