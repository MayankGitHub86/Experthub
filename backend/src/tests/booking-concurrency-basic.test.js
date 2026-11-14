import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User, Expert, Service, ReservationUnit, BookingHold, Booking } from '../models/index.js';
import authService from '../modules/auth/auth.service.js';

describe('Booking Concurrency - Critical Atomic Reservation Test', () => {
  let authToken;
  let testUser;
  let testExpert;
  let testService;

  beforeAll(async () => {
    // Connect to test database
    const currentDb = mongoose.connection.name;
    const targetDb = 'experthub_test';
    
    if (mongoose.connection.readyState === 0 || currentDb !== targetDb) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      const testDbUri = 'mongodb://localhost:27017/experthub_test?replicaSet=rs0&retryWrites=true&w=majority';
      await mongoose.connect(testDbUri);
    }
    
    // FULL database flush to ensure complete isolation from other test suites
    await User.deleteMany({});
    await Expert.deleteMany({});
    await Service.deleteMany({});
    await ReservationUnit.deleteMany({});
    await BookingHold.deleteMany({});
    await Booking.deleteMany({});
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({ email: /concurrency-basic-test/ });
    await Expert.deleteMany({ headline: /Atomic Reservation Tester/ });
    await Service.deleteMany({ description: /atomic reservation test/ });
    await ReservationUnit.deleteMany({});
    await BookingHold.deleteMany({});
    await Booking.deleteMany({});
  }, 30000);

  beforeEach(async () => {
    testUser = await User.create({
      email: `concurrency-basic-test-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      role: 'client',
      status: 'active',
    });

    testExpert = await Expert.create({
      userId: testUser._id,
      headline: 'Atomic Reservation Tester',
      bio: 'Expert for testing atomic reservation mechanisms and ensuring no double-bookings occur under concurrent load. This expert specializes in testing booking systems.',
      skills: ['testing', 'atomic reservations', 'concurrency'],
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

    testService = await Service.create({
      expertId: testExpert._id,
      title: 'Atomic Reservation Test Service',
      description: 'atomic reservation test service',
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

    authToken = authService.generateAccessToken(testUser);
  });

  afterEach(async () => {
    await ReservationUnit.deleteMany({ expertId: testExpert._id });
    await BookingHold.deleteMany({ expertId: testExpert._id });
    await Booking.deleteMany({ expertId: testExpert._id });
  });

  describe('Atomic Double-Booking Prevention', () => {
    it('CRITICAL: 20 concurrent requests for identical time slot - EXACTLY ONE succeeds', async () => {
      // Get next Monday at 10:00 AM
      const nextMonday = new Date();
      let daysUntilMonday = (1 - nextMonday.getDay() + 7) % 7;
      if (daysUntilMonday === 0) daysUntilMonday = 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      nextMonday.setHours(10, 0, 0, 0);

      const bookingData = {
        expertId: testExpert._id.toString(),
        serviceId: testService._id.toString(),
        startTime: nextMonday.toISOString(),
        timezone: 'America/New_York',
      };

      // Send 20 concurrent requests for the SAME time slot
      const responses = await Promise.all(
        Array(20)
          .fill(null)
          .map(() =>
            request(app)
              .post('/api/v1/bookings/holds')
              .set('Authorization', `Bearer ${authToken}`)
              .send(bookingData)
              .then((res) => res.body)
              .catch((err) => ({ error: err.message }))
          )
      );

      // Count successful holds
      const successful = responses.filter((r) => r.success === true);
      const failed = responses.filter((r) => !r.success);

      console.log(`\n✓ Total requests: 20`);
      console.log(`✓ Successful holds: ${successful.length}`);
      console.log(`✓ Failed holds: ${failed.length}`);

      // CRITICAL ASSERTION: Exactly ONE should succeed
      expect(successful.length).toBe(1);
      expect(failed.length).toBeGreaterThanOrEqual(18); // At least 18 failed (may be 19)

      // Verify database consistency
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
      // 60-minute booking with 15-minute buffer = 90 minutes total = 6 × 15-minute units
      expect(unitCount).toBe(6);

      // Verify all units belong to the same hold
      const units = await ReservationUnit.find({
        expertId: testExpert._id,
        status: 'held',
      });
      const uniqueHolds = new Set(units.map((u) => u.holdId.toString()));
      expect(uniqueHolds.size).toBe(1);
    });

    it('Partial overlap prevention: 10:00-11:00 vs 10:30-11:30', async () => {
      const nextMonday = new Date();
      let daysUntilMonday = (1 - nextMonday.getDay() + 7) % 7;
      if (daysUntilMonday === 0) daysUntilMonday = 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      nextMonday.setHours(10, 0, 0, 0);

      // First booking: 10:00-11:00
      const booking1 = {
        expertId: testExpert._id.toString(),
        serviceId: testService._id.toString(),
        startTime: nextMonday.toISOString(),
        timezone: 'America/New_York',
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
        expertId: testExpert._id.toString(),
        serviceId: testService._id.toString(),
        startTime: nextMonday1030.toISOString(),
        timezone: 'America/New_York',
      };

      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking2);

      expect(res2.body.success).toBe(false);
      expect(res2.body.message || res2.body.errors?.[0]).toContain('conflict');

      // Verify only one hold exists
      const holdCount = await BookingHold.countDocuments({
        expertId: testExpert._id,
        status: 'active',
      });
      expect(holdCount).toBe(1);
    });

    it('Adjacent non-overlapping slots should both succeed', async () => {
      const nextMonday = new Date();
      let daysUntilMonday = (1 - nextMonday.getDay() + 7) % 7;
      if (daysUntilMonday === 0) daysUntilMonday = 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      nextMonday.setHours(10, 0, 0, 0);

      // First booking: 10:00-11:00 (with 15-min buffer after = 11:15)
      const booking1 = {
        expertId: testExpert._id.toString(),
        serviceId: testService._id.toString(),
        startTime: nextMonday.toISOString(),
        timezone: 'America/New_York',
      };

      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1);

      expect(res1.body.success).toBe(true);

      // Second booking: 11:30-12:30 (after buffer, with 15-min buffer before = 11:15)
      // This should succeed as there's no overlap with the 11:15 boundary
      const nextMonday1130 = new Date(nextMonday);
      nextMonday1130.setHours(11, 30, 0, 0);

      const booking2 = {
        expertId: testExpert._id.toString(),
        serviceId: testService._id.toString(),
        startTime: nextMonday1130.toISOString(),
        timezone: 'America/New_York',
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
});
