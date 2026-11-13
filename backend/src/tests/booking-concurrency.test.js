import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User, Expert, Service, ReservationUnit, BookingHold, Booking } from '../models/index.js';
import authService from '../modules/auth/auth.service.js';

describe('Booking Concurrency and Atomic Reservation Tests', () => {
  let authToken;
  let testUser;
  let testExpert;
  let testService;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost:27017/experthub');
    }

    // Clean up test data
    await User.deleteMany({ email: /concurrency-test/ });
    await Expert.deleteMany({ headline: /Concurrency Tester/ });
    await Service.deleteMany({ description: /concurrency-test/ });
    await ReservationUnit.deleteMany({});
    await BookingHold.deleteMany({});
    await Booking.deleteMany({});
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({ email: /concurrency-test/ });
    await Expert.deleteMany({ headline: /Concurrency Tester/ });
    await Service.deleteMany({ description: /concurrency-test/ });
    await ReservationUnit.deleteMany({});
    await BookingHold.deleteMany({});
    await Booking.deleteMany({});
    
    // Close mongoose connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create test user directly in database
    testUser = await User.create({
      email: `concurrency-test-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      role: 'client',
      status: 'active',
    });

    // Create test expert directly in database
    testExpert = await Expert.create({
      userId: testUser._id,
      headline: 'Expert Concurrency Tester',
      bio: 'concurrency-test expert with extensive experience in testing concurrent booking systems and ensuring atomic reservation mechanisms work correctly under high load. This expert specializes in concurrent programming.',
      skills: ['testing', 'concurrent programming', 'booking systems'],
      category: 'Technology & Engineering',
      hourlyRate: 100,
      languages: ['English'],
      verificationStatus: 'approved',
      verifiedBadge: true,
      acceptingBookings: true,
      availability: {
        timezone: 'America/New_York',
        bufferMinutes: 15,
        minNoticeHours: 2,
        maxAdvanceDays: 90,
        weeklySchedule: [
          {
            dayOfWeek: 1,
            slots: [{ startTime: '09:00', endTime: '17:00' }],
          },
          {
            dayOfWeek: 2,
            slots: [{ startTime: '09:00', endTime: '17:00' }],
          },
          {
            dayOfWeek: 3,
            slots: [{ startTime: '09:00', endTime: '17:00' }],
          },
          {
            dayOfWeek: 4,
            slots: [{ startTime: '09:00', endTime: '17:00' }],
          },
          {
            dayOfWeek: 5,
            slots: [{ startTime: '09:00', endTime: '17:00' }],
          },
        ],
      },
    });

    // Create test service directly in database
    testService = await Service.create({
      expertId: testExpert._id,
      title: 'Concurrency Test Service',
      description: 'concurrency-test service for testing atomic reservations and preventing double bookings in high concurrency scenarios',
      category: 'technology-consulting',
      deliveryMethod: 'video_call',
      duration: 60,
      pricing: {
        amount: 100,
        currency: 'USD',
      },
      isActive: true,
      status: 'approved',
    });

    // Generate auth token using the actual auth service
    authToken = authService.generateAccessToken(testUser);
  });

  afterEach(async () => {
    // Clean up after each test
    await ReservationUnit.deleteMany({ expertId: testExpert._id });
    await BookingHold.deleteMany({ expertId: testExpert._id });
    await Booking.deleteMany({ expertId: testExpert._id });
  });

  describe('Atomic Reservation - Identical Time Slots', () => {
    it('should prevent duplicate bookings for identical time slots (20 concurrent requests)', async () => {
      // Get next Monday at 10:00 AM
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      const bookingData = {
        expertId: testExpert._id.toString(),
        serviceId: testService._id.toString(),
        startTime: nextMonday.toISOString(),
        timezone: 'America/New_York',
      };

      // Send 20 concurrent requests for the SAME time slot
      const requests = Array(20)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/v1/bookings/holds')
            .set('Authorization', `Bearer ${authToken}`)
            .send(bookingData)
            .then((res) => res.body)
            .catch((err) => ({ error: err.message }))
        );

      const responses = await Promise.all(requests);

      // Count successful holds
      const successful = responses.filter((r) => r.success === true);
      const failed = responses.filter((r) => r.success === false || r.error);

      console.log(`✓ Successful holds: ${successful.length}`);
      console.log(`✓ Failed holds: ${failed.length}`);

      // CRITICAL: Exactly ONE should succeed
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(19);

      // Verify only one hold exists in database
      const holdCount = await BookingHold.countDocuments({
        expertId: testExpert._id,
        status: 'active',
      });
      expect(holdCount).toBe(1);

      // Verify reservation units
      const unitCount = await ReservationUnit.countDocuments({
        expertId: testExpert._id,
        status: 'held',
      });
      
      // 60-minute booking with 15-minute buffer = 90 minutes total
      // 90 / 15 = 6 units
      expect(unitCount).toBe(6);

      // Verify all units belong to the same hold
      const units = await ReservationUnit.find({
        expertId: testExpert._id,
        status: 'held',
      });
      const uniqueHolds = new Set(units.map((u) => u.holdId.toString()));
      expect(uniqueHolds.size).toBe(1);
    });
  });

  describe('Atomic Reservation - Partial Overlaps', () => {
    it('should prevent partial overlap: 10:00-11:00 vs 10:30-11:30', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // First booking: 10:00-11:00
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      expect(res1.body.success).toBe(true);

      // Second booking: 10:30-11:30 (30-minute overlap)
      const nextMonday1030 = new Date(nextMonday);
      nextMonday1030.setMinutes(30);

      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday1030.toISOString(),
        duration: 60,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(false);
      expect(res2.body.error).toMatch(/conflict|available/i);

      // Verify only one hold exists
      const holdCount = await BookingHold.countDocuments({
        expertId: testExpert._id,
        status: 'active',
      });
      expect(holdCount).toBe(1);
    });

    it('should prevent partial overlap: 10:00-11:00 vs 10:15-10:45', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // First booking: 10:00-11:00
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      expect(res1.body.success).toBe(true);

      // Second booking: 10:15-10:45 (completely inside first booking)
      const nextMonday1015 = new Date(nextMonday);
      nextMonday1015.setMinutes(15);

      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday1015.toISOString(),
        duration: 30,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(false);
    });

    it('should prevent partial overlap: 10:00-11:00 vs 09:30-10:30', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // First booking: 10:00-11:00
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      expect(res1.body.success).toBe(true);

      // Second booking: 09:30-10:30 (overlaps start)
      const nextMonday0930 = new Date(nextMonday);
      nextMonday0930.setMinutes(-30);

      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday0930.toISOString(),
        duration: 60,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(false);
    });
  });

  describe('Atomic Reservation - Buffer Conflicts', () => {
    it('should prevent booking that conflicts with buffer period', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // First booking: 10:00-11:00 (buffer: 09:45-10:00 and 11:00-11:15)
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      expect(res1.body.success).toBe(true);

      // Second booking: 11:00-12:00 (conflicts with buffer_after of first booking)
      const nextMonday1100 = new Date(nextMonday);
      nextMonday1100.setHours(11, 0, 0, 0);

      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday1100.toISOString(),
        duration: 60,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(false);
    });

    it('should allow booking after buffer period ends', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // First booking: 10:00-11:00 (buffer_after ends at 11:15)
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      expect(res1.body.success).toBe(true);

      // Second booking: 11:30-12:30 (after buffer_after, considering new buffer_before at 11:15)
      const nextMonday1130 = new Date(nextMonday);
      nextMonday1130.setHours(11, 30, 0, 0);

      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday1130.toISOString(),
        duration: 60,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(true);

      // Verify both holds exist
      const holdCount = await BookingHold.countDocuments({
        expertId: testExpert._id,
        status: 'active',
      });
      expect(holdCount).toBe(2);
    });
  });

  describe('Atomic Reservation - Different Durations', () => {
    it('should prevent conflicts with different duration bookings', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // First booking: 10:00-10:30 (30 minutes)
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 30,
      };

      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      expect(res1.body.success).toBe(true);

      // Second booking: 10:15-11:15 (60 minutes, overlaps with first)
      const nextMonday1015 = new Date(nextMonday);
      nextMonday1015.setMinutes(15);

      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday1015.toISOString(),
        duration: 60,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(false);
    });
  });

  describe('Booking Lifecycle - Hold Confirmation', () => {
    it('should successfully confirm a held booking', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // Create hold
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const holdRes = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      expect(holdRes.body.success).toBe(true);
      const holdId = holdRes.body.data._id;

      // Confirm hold
      const confirmRes = await request(app)
        .post(`/api/v1/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ holdId });

      expect(confirmRes.body.success).toBe(true);

      // Verify booking exists
      const booking = await Booking.findOne({ holdId });
      expect(booking).toBeTruthy();
      expect(booking.status).toBe('confirmed');

      // Verify reservation units updated to confirmed
      const units = await ReservationUnit.find({
        expertId: testExpert._id,
        bookingId: booking._id,
      });
      expect(units.length).toBe(6); // 90 minutes / 15 = 6 units
      expect(units.every((u) => u.status === 'confirmed')).toBe(true);

      // Verify hold is consumed
      const hold = await BookingHold.findById(holdId);
      expect(hold.status).toBe('confirmed');
    });

    it('should prevent new bookings after confirmation', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // Create and confirm first booking
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const holdRes = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      await request(app)
        .post(`/api/bookings/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ holdId: holdRes.body.data._id });

      // Try to book the same slot
      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(false);
    });
  });

  describe('Booking Lifecycle - Expiration', () => {
    it('should release expired holds and allow rebooking', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // Create hold
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const holdRes = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      const holdId = holdRes.body.data._id;

      // Mark hold as expired
      await BookingHold.findByIdAndUpdate(holdId, {
        expiresAt: new Date(Date.now() - 1000),
        status: 'expired',
      });

      await ReservationUnit.updateMany(
        { holdId },
        { expiresAt: new Date(Date.now() - 1000) }
      );

      // Run cleanup
      await ReservationUnit.cleanupExpired();

      // Try to book the same slot again
      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(true);
    });
  });

  describe('Booking Lifecycle - Cancellation', () => {
    it('should release reservation units when booking is cancelled', async () => {
      const nextMonday = getNextWeekday(1);
      nextMonday.setHours(10, 0, 0, 0);

      // Create and confirm booking
      const booking1 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const holdRes = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      const confirmRes = await request(app)
        .post(`/api/bookings/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ holdId: holdRes.body.data._id });

      const bookingId = confirmRes.body.data._id;

      // Cancel booking
      const cancelRes = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(cancelRes.body.success).toBe(true);

      // Verify reservation units are released
      const units = await ReservationUnit.find({
        bookingId,
        status: 'released',
      });
      expect(units.length).toBe(6);

      // Try to book the same slot again
      const booking2 = {
        expertId: testExpert._id,
        serviceId: testService._id,
        startTime: nextMonday.toISOString(),
        duration: 60,
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(true);
    });
  });

  describe('High Concurrency Stress Test', () => {
    it('should handle 50 concurrent requests with mixed overlapping slots', async () => {
      const nextMonday = getNextWeekday(1);
      
      // Create 50 requests with various overlapping patterns
      const requests = [];
      
      // 20 requests for 10:00-11:00 (all conflict with each other)
      for (let i = 0; i < 20; i++) {
        const startTime = new Date(nextMonday);
        startTime.setHours(10, 0, 0, 0);
        requests.push({
          expertId: testExpert._id,
          serviceId: testService._id,
          startTime: startTime.toISOString(),
          duration: 60,
        });
      }
      
      // 15 requests for 10:30-11:30 (partial overlap)
      for (let i = 0; i < 15; i++) {
        const startTime = new Date(nextMonday);
        startTime.setHours(10, 30, 0, 0);
        requests.push({
          expertId: testExpert._id,
          serviceId: testService._id,
          startTime: startTime.toISOString(),
          duration: 60,
        });
      }
      
      // 15 requests for 11:30-12:30 (should succeed after buffer)
      for (let i = 0; i < 15; i++) {
        const startTime = new Date(nextMonday);
        startTime.setHours(11, 30, 0, 0);
        requests.push({
          expertId: testExpert._id,
          serviceId: testService._id,
          startTime: startTime.toISOString(),
          duration: 60,
        });
      }

      // Send all 50 requests concurrently
      const responses = await Promise.all(
        requests.map((data) =>
          request(app)
            .post('/api/v1/bookings/hold')
            .set('Authorization', `Bearer ${authToken}`)
            .send(data)
            .then((res) => ({ success: res.body.success, startTime: data.startTime }))
            .catch(() => ({ success: false, startTime: data.startTime }))
        )
      );

      const successful = responses.filter((r) => r.success);
      const failed = responses.filter((r) => !r.success);

      console.log(`\n✓ Total requests: ${responses.length}`);
      console.log(`✓ Successful holds: ${successful.length}`);
      console.log(`✓ Failed holds: ${failed.length}`);

      // Exactly 2 should succeed: one for 10:00 slot, one for 11:30 slot
      expect(successful.length).toBe(2);
      expect(failed.length).toBe(48);

      // Verify database consistency
      const holdCount = await BookingHold.countDocuments({
        expertId: testExpert._id,
        status: 'active',
      });
      expect(holdCount).toBe(2);

      // Verify no orphaned reservation units
      const allUnits = await ReservationUnit.find({
        expertId: testExpert._id,
      });
      
      const holdIds = await BookingHold.find({
        expertId: testExpert._id,
        status: 'active',
      }).distinct('_id');
      
      const orphanedUnits = allUnits.filter(
        (u) => u.status === 'held' && !holdIds.some((hid) => hid.equals(u.holdId))
      );
      
      expect(orphanedUnits.length).toBe(0);
    });
  });
});

/**
 * Helper: Get next occurrence of a weekday (1=Monday, 7=Sunday)
 */
function getNextWeekday(targetDay) {
  const today = new Date();
  const currentDay = today.getDay() || 7; // Convert Sunday (0) to 7
  const daysUntilTarget = targetDay >= currentDay ? targetDay - currentDay : 7 - currentDay + targetDay;
  
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntilTarget);
  nextDate.setHours(0, 0, 0, 0);
  
  return nextDate;
}
