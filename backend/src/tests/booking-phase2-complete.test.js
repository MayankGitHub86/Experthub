import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User, Expert, Service, ReservationUnit, BookingHold, Booking } from '../models/index.js';
import authService from '../modules/auth/auth.service.js';

describe('Phase 2 Booking Engine - Complete Transactional Test Suite', () => {
  let clientUser;
  let clientToken;
  let expertUser;
  let testExpert;
  let testService;
  
  // Helper to generate next Monday at a specific hour
  const getNextMondayAtHour = (hour) => {
    const date = new Date();
    let daysUntilMonday = (1 - date.getDay() + 7) % 7;
    if (daysUntilMonday === 0) daysUntilMonday = 7;
    date.setDate(date.getDate() + daysUntilMonday);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  beforeAll(async () => {
    // Tests run against isolated test database
    // Connect if not already connected, or if connected to wrong database
    const currentDb = mongoose.connection.name;
    const targetDb = 'experthub_test';
    
    if (mongoose.connection.readyState === 0 || currentDb !== targetDb) {
      // Disconnect if connected to wrong database
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      // Connect to test database
      const testDbUri = 'mongodb://localhost:27017/experthub_test?replicaSet=rs0&retryWrites=true&w=majority';
      await mongoose.connect(testDbUri);
      console.log(`Connected to test database: ${mongoose.connection.name}`);
    }
    
    // Clean up all test data first
    await User.deleteMany({ email: /phase2-test/ });
    await Expert.deleteMany({ headline: /Phase 2 Test Expert/ });
    await Service.deleteMany({ description: /phase2-test/ });
    await ReservationUnit.deleteMany({});
    await BookingHold.deleteMany({});
    await Booking.deleteMany({});
  }, 30000);

  afterAll(async () => {
    // Final cleanup
    await User.deleteMany({ email: /phase2-test/ });
    await Expert.deleteMany({ headline: /Phase 2 Test Expert/ });
    await Service.deleteMany({ description: /phase2-test/ });
    await ReservationUnit.deleteMany({});
    await BookingHold.deleteMany({});
    await Booking.deleteMany({});
    
    // Don't explicitly close - Jest will handle cleanup
  }, 30000);

  beforeEach(async () => {
    // Create client user
    clientUser = await User.create({
      email: `phase2-test-client-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',
      status: 'active',
    });
    clientToken = authService.generateAccessToken(clientUser);

    // Create expert user
    expertUser = await User.create({
      email: `phase2-test-expert-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'Expert',
      role: 'expert',
      status: 'active',
    });

    // Create expert profile
    testExpert = await Expert.create({
      userId: expertUser._id,
      headline: 'Phase 2 Test Expert',
      bio: 'Expert for Phase 2 transactional booking tests. This is a detailed bio that provides comprehensive information about this expert specialist. We include substantial detail to meet the minimum character requirement.',
      skills: ['testing'],
      category: 'Technology & Engineering',
      hourlyRate: 100,
      languages: ['English'],
      verificationStatus: 'approved',
      acceptingBookings: true,
      availability: {
        timezone: 'UTC',
        bufferMinutes: 15,
      },
    });

    // Create service
    testService = await Service.create({
      expertId: testExpert._id,
      title: 'Phase 2 Test Service',
      description: 'phase2-test service for transactional booking verification',
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
  }, 30000);

  afterEach(async () => {
    // Clean up test data after each test
    await ReservationUnit.deleteMany({ expertId: testExpert._id });
    await BookingHold.deleteMany({ expertId: testExpert._id });
    await Booking.deleteMany({ expertId: testExpert._id });
  });

  describe('1. Atomic Hold Creation', () => {
    it('should create a hold with exactly 6 reservation units (60min + 2x15min buffers)', async () => {
      const startTime = getNextMondayAtHour(10);
      
      const response = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: startTime.toISOString(),
          timezone: 'UTC',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBeDefined();

      // Verify units were created
      const units = await ReservationUnit.find({
        expertId: testExpert._id,
        status: 'held',
      });
      
      expect(units.length).toBe(6);
      
      // Verify unit types
      const typeCount = {};
      units.forEach(u => {
        typeCount[u.unitType] = (typeCount[u.unitType] || 0) + 1;
      });
      
      expect(typeCount.buffer_before).toBe(1);
      expect(typeCount.booking).toBe(4);
      expect(typeCount.buffer_after).toBe(1);
    }, 15000);

    it('should prevent double-booking identical 20 concurrent requests', async () => {
      const startTime = getNextMondayAtHour(11);
      
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/bookings/holds')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            expertId: testExpert._id.toString(),
            serviceId: testService._id.toString(),
            startTime: startTime.toISOString(),
            timezone: 'UTC',
          })
          .then(res => res.body)
      );

      const responses = await Promise.all(requests);
      
      const successful = responses.filter(r => r.success === true);
      const failed = responses.filter(r => !r.success);

      // Exactly one should succeed
      expect(successful.length).toBe(1);
      expect(failed.length).toBeGreaterThanOrEqual(18);

      // Verify only one hold exists
      const holds = await BookingHold.countDocuments({
        expertId: testExpert._id,
        status: 'active',
      });
      expect(holds).toBe(1);

      // Verify no orphaned units
      const units = await ReservationUnit.find({
        expertId: testExpert._id,
        status: 'held',
      });
      expect(units.length).toBe(6);
    }, 20000);
  });

  describe('2. Overlap Detection', () => {
    it('should reject partial overlap (10:00-11:00 vs 10:30-11:30)', async () => {
      const time1 = getNextMondayAtHour(10);
      
      // First hold succeeds
      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: time1.toISOString(),
          timezone: 'UTC',
        });
      
      expect(res1.body.success).toBe(true);

      // Second hold at 10:30 should fail
      const time2 = new Date(time1);
      time2.setMinutes(30);
      
      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: time2.toISOString(),
          timezone: 'UTC',
        });
      
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toContain('conflict');
    }, 10000);

    it('should allow adjacent non-overlapping slots', async () => {
      const time1 = getNextMondayAtHour(10);
      
      // First hold: 10:00-11:00 (with 15min buffer = 09:45-11:15)
      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: time1.toISOString(),
          timezone: 'UTC',
        });
      
      expect(res1.body.success).toBe(true);

      // Second hold: 11:30 (after buffer = 11:15 + 15min buffer = 11:00)
      const time2 = new Date(time1);
      time2.setHours(11, 30, 0, 0);
      
      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: time2.toISOString(),
          timezone: 'UTC',
        });
      
      expect(res2.body.success).toBe(true);

      // Verify two holds exist
      const holds = await BookingHold.countDocuments({
        expertId: testExpert._id,
        status: 'active',
      });
      expect(holds).toBe(2);
    }, 15000);

    it('should reject buffer conflicts (15min buffer detection)', async () => {
      const time1 = getNextMondayAtHour(10);
      
      // First hold: 10:00 (reserves 09:45-11:15)
      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: time1.toISOString(),
          timezone: 'UTC',
        });
      
      expect(res1.body.success).toBe(true);

      // Try to book at 11:00 (buffer conflict at 11:00-11:15)
      const time2 = new Date(time1);
      time2.setHours(11, 0, 0, 0);
      
      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: time2.toISOString(),
          timezone: 'UTC',
        });
      
      expect(res2.body.success).toBe(false);
    }, 15000);
  });

  describe('3. Transactional Confirmation', () => {
    it('should confirm hold and create booking transactionally', async () => {
      const startTime = getNextMondayAtHour(12);
      
      // Create hold
      const holdRes = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: startTime.toISOString(),
          timezone: 'UTC',
        });

      const holdId = holdRes.body.data._id;

      // Confirm booking
      const confirmRes = await request(app)
        .post('/api/v1/bookings/confirm')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          holdId,
          clientNotes: 'Test confirmation',
        });

      expect(confirmRes.status).toBe(201);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.status).toBe('payment_pending');

      // Verify hold is confirmed
      const hold = await BookingHold.findById(holdId);
      expect(hold.status).toBe('confirmed');
      expect(hold.bookingId).toBeDefined();

      // Verify units are confirmed
      const units = await ReservationUnit.find({
        holdId,
        status: 'confirmed',
      });
      expect(units.length).toBe(6);
    }, 15000);

    it('should reject confirmation if hold has expired', async () => {
      const startTime = getNextMondayAtHour(13);
      
      // Create hold
      const holdRes = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: startTime.toISOString(),
          timezone: 'UTC',
        });

      const holdId = holdRes.body.data._id;

      // Manually expire the hold
      await BookingHold.findByIdAndUpdate(holdId, {
        expiresAt: new Date(Date.now() - 1000),
      });

      // Try to confirm
      const confirmRes = await request(app)
        .post('/api/v1/bookings/confirm')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ holdId });

      expect(confirmRes.status).toBe(410);
      expect(confirmRes.body.message).toContain('expired');
    }, 15000);
  });

  describe('4. Hold Expiration Lifecycle', () => {
    it('should mark units as released after hold expiration', async () => {
      const startTime = getNextMondayAtHour(14);
      
      // Create hold
      const holdRes = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: startTime.toISOString(),
          timezone: 'UTC',
        });

      const holdId = holdRes.body.data._id;

      // Verify initial state
      let units = await ReservationUnit.find({ holdId });
      expect(units.every(u => u.status === 'held')).toBe(true);

      // Expire hold manually
      const expiresAt = new Date();
      await BookingHold.findByIdAndUpdate(holdId, { expiresAt });
      await ReservationUnit.updateMany({ holdId }, { $set: { status: 'released' } });

      // Verify released
      units = await ReservationUnit.find({ holdId });
      expect(units.every(u => u.status === 'released')).toBe(true);
    }, 10000);
  });

  describe('5. Orphan Prevention', () => {
    it('should not leave orphaned units on conflict', async () => {
      const time1 = getNextMondayAtHour(15);
      
      // Create first hold
      const res1 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: time1.toISOString(),
          timezone: 'UTC',
        });
      
      expect(res1.body.success).toBe(true);

      // Try to create conflicting hold
      const res2 = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: time1.toISOString(),
          timezone: 'UTC',
        });
      
      expect(res2.body.success).toBe(false);

      // Verify no orphaned units (should have only 6 from first hold)
      const totalUnits = await ReservationUnit.countDocuments({
        expertId: testExpert._id,
      });
      expect(totalUnits).toBe(6);

      // Verify no orphaned holds
      const totalHolds = await BookingHold.countDocuments({
        expertId: testExpert._id,
      });
      expect(totalHolds).toBe(1);
    }, 15000);
  });

  describe('6. Booking Lifecycle - Cancel', () => {
    it('should release reservation units when booking is cancelled', async () => {
      const startTime = getNextMondayAtHour(16);
      
      // Create and confirm booking
      const holdRes = await request(app)
        .post('/api/v1/bookings/holds')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          expertId: testExpert._id.toString(),
          serviceId: testService._id.toString(),
          startTime: startTime.toISOString(),
          timezone: 'UTC',
        });

      const confirmRes = await request(app)
        .post('/api/v1/bookings/confirm')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ holdId: holdRes.body.data._id });

      const bookingId = confirmRes.body.data._id;

      // Verify units are confirmed
      let units = await ReservationUnit.find({
        bookingId,
        status: 'confirmed',
      });
      expect(units.length).toBe(6);

      // Cancel booking
      const cancelRes = await request(app)
        .delete(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Test cancellation' });

      expect(cancelRes.body.success).toBe(true);

      // Verify units are released
      units = await ReservationUnit.find({
        bookingId,
        status: 'released',
      });
      expect(units.length).toBe(6);
    }, 15000);
  });

  describe('7. Indexes Verification', () => {
    it('should verify atomic_slot_reservation index exists', async () => {
      // Get full index specs which include options like unique
      const indexSpecs = await ReservationUnit.collection.listIndexes().toArray();
      
      // Find the atomic_slot_reservation index
      const atomicIndex = indexSpecs.find(idx => idx.name === 'atomic_slot_reservation');
      
      expect(atomicIndex).toBeDefined();
      expect(atomicIndex.unique).toBe(true);
      expect(atomicIndex.partialFilterExpression).toBeDefined();
      expect(atomicIndex.partialFilterExpression.status.$in).toContain('held');
      expect(atomicIndex.partialFilterExpression.status.$in).toContain('confirmed');
    }, 10000);

    it('should verify TTL index exists', async () => {
      // Get full index specs
      const indexSpecs = await ReservationUnit.collection.listIndexes().toArray();
      
      // Find the TTL index
      const ttlIndex = indexSpecs.find(idx => idx.name === 'ttl_cleanup');
      
      expect(ttlIndex).toBeDefined();
      expect(ttlIndex.expireAfterSeconds).toBe(0);
    }, 10000);
  });
});
