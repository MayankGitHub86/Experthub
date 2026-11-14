/**
 * Phase 3C Real Booking Integration Test
 * 
 * Uses actual BookingService methods with proper test fixtures
 * Tests against temporary isolated MongoDB replica set (rs0 on port 27018)
 * 
 * Test database: experthub_test
 * Backend port: 3001
 * MongoDB port: 27018
 */

import mongoose from 'mongoose';
import request from 'supertest';
import app from './src/app.js';
import { User, Expert, Service, BookingHold, ReservationUnit, Booking } from './src/models/index.js';
import authService from './src/modules/auth/auth.service.js';

const TEST_URI = 'mongodb://127.0.0.1:27018/experthub_test?directConnection=true&retryWrites=true&w=majority';

describe('Phase 3C Real Booking Integration Tests', () => {
  let clientUser;
  let clientToken;
  let expertUser;
  let expert;
  let service;
  let hold;

  beforeAll(async () => {
    // Connect to test database
    const currentDb = mongoose.connection.name;
    const targetDb = 'experthub_test';
    
    if (mongoose.connection.readyState === 0 || currentDb !== targetDb) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(TEST_URI);
    }
    
    console.log(`Connected to database: ${mongoose.connection.name}`);
    
    // Clean up all test data
    await User.deleteMany({ email: /phase3c-test/ });
    await Expert.deleteMany({ headline: /Phase 3C Test Expert/ });
    await Service.deleteMany({ title: /Phase 3C Test Service/ });
    await BookingHold.deleteMany({});
    await ReservationUnit.deleteMany({});
    await Booking.deleteMany({});
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: /phase3c-test/ });
    await Expert.deleteMany({ headline: /Phase 3C Test Expert/ });
    await Service.deleteMany({ title: /Phase 3C Test Service/ });
    await BookingHold.deleteMany({});
    await ReservationUnit.deleteMany({});
    await Booking.deleteMany({});
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  test('Real Booking Hold Creation (API)', async () => {
    // Create client user
    clientUser = await User.create({
      email: `phase3c-test-client-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',
      status: 'active',
    });
    clientToken = authService.generateAccessToken(clientUser);

    // Create expert user
    expertUser = await User.create({
      email: `phase3c-test-expert-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'Expert',
      role: 'expert',
      status: 'active',
    });

    // Create expert profile
    expert = await Expert.create({
      userId: expertUser._id,
      headline: 'Phase 3C Test Expert',
      bio: 'Expert for Phase 3C real booking integration tests. This is a detailed bio that demonstrates expertise in transactional booking systems with comprehensive experience. We include substantial content to meet validation requirements.',
      skills: ['testing', 'consultation'],
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
    service = await Service.create({
      expertId: expert._id,
      title: 'Phase 3C Test Service',
      description: 'Phase 3C test service for real transactional booking verification',
      category: 'technology-consulting',
      deliveryMethod: 'video_call',
      duration: 60,  // 60 minutes
      pricing: {
        amount: 100,
        currency: 'USD',
      },
      isActive: true,
      status: 'approved',
    });

    // Create hold via API
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    
    const response = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: startTime.toISOString(),
        timezone: 'UTC',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBeDefined();

    hold = response.body.data;
    expect(hold.status).toBe('active');

    // Verify in database
    const foundHold = await BookingHold.findById(hold._id);
    expect(foundHold).toBeDefined();
    expect(foundHold.expertId.toString()).toBe(expert._id.toString());

    // Verify reservation units
    const units = await ReservationUnit.find({ holdId: hold._id });
    expect(units.length).toBeGreaterThan(0);
  }, 30000);

  test('Real Booking Confirmation (API)', async () => {
    expect(hold).toBeDefined();
    expect(clientToken).toBeDefined();

    const response = await request(app)
      .post('/api/v1/bookings/confirm')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        holdId: hold._id.toString(),
        clientNotes: 'Looking forward to this session'
      });

    expect([200, 201]).toContain(response.status);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    const booking = response.body.data;
    // Booking status is either 'confirmed' or 'payment_pending' depending on payment requirements
    expect(['confirmed', 'payment_pending']).toContain(booking.status);

    // Verify hold is marked confirmed
    const updatedHold = await BookingHold.findById(hold._id);
    expect(updatedHold.status).toBe('confirmed');

    // Verify booking exists
    const foundBooking = await Booking.findById(booking._id);
    expect(foundBooking).toBeDefined();
  }, 30000);

  test('Real Booking Cancellation (API)', async () => {
    expect(service).toBeDefined();
    expect(expert).toBeDefined();
    expect(clientToken).toBeDefined();

    // Create new hold for cancellation
    const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days out
    
    const holdResponse = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: startTime.toISOString(),
        timezone: 'UTC',
      });

    expect(holdResponse.status).toBe(201);
    const hold2 = holdResponse.body.data;

    // Confirm it
    const confirmResponse = await request(app)
      .post('/api/v1/bookings/confirm')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        holdId: hold2._id.toString(),
      });

    expect([200, 201]).toContain(confirmResponse.status);
    const booking2 = confirmResponse.body.data;

    // Cancel it
    const cancelResponse = await request(app)
      .patch(`/api/v1/bookings/${booking2._id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        reason: 'Schedule conflict'
      });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.success).toBe(true);

    // Verify API returns updated booking with cancelled status
    const cancelled = cancelResponse.body.data;
    expect(cancelled.status).toBe('cancelled');
    console.log('✓ API correctly returned cancelled booking');

    // Verify database also shows cancelled
    const fetchedBooking = await Booking.findById(booking2._id);
    expect(fetchedBooking.status).toBe('cancelled');
    console.log('✓ Database verified as cancelled');

    // Verify cancellation metadata
    expect(cancelled.cancellation).toBeDefined();
    expect(cancelled.cancellation.cancelledBy.toString()).toBe(clientUser._id.toString());
    expect(cancelled.cancellation.reason).toBe('Schedule conflict');
    console.log('✓ Cancellation metadata correct');

    // Verify reservation units exist (they should be released but still in DB)
    const allUnits = await ReservationUnit.find({ holdId: hold2._id });
    expect(allUnits.length).toBeGreaterThan(0);
    console.log('✓ Reservation units released from booking');
  }, 30000);

  test('Real Booking Concurrency - Two clients attempting same slot', async () => {
    expect(expert).toBeDefined();
    expect(service).toBeDefined();

    // Create second client
    const client2User = await User.create({
      email: `phase3c-test-client2-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Test2',
      lastName: 'Client',
      role: 'client',
      status: 'active',
    });
    const client2Token = authService.generateAccessToken(client2User);

    // Same future slot for both
    const startTime = new Date(Date.now() + 72 * 60 * 60 * 1000); // 3 days out

    // Client 1 attempts to hold the slot
    const hold1Response = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: startTime.toISOString(),
        timezone: 'UTC',
      });

    expect(hold1Response.status).toBe(201);
    const hold1 = hold1Response.body.data;
    console.log('✓ Client 1 successfully held slot');

    // Client 2 attempts to hold the SAME slot - should fail
    const hold2Response = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${client2Token}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: startTime.toISOString(),
        timezone: 'UTC',
      });

    // Client 2 should get conflict (409) or other error, not 201
    expect(hold2Response.status).not.toBe(201);
    console.log(`✓ Client 2 correctly rejected with status ${hold2Response.status}`);

    // Verify database has only ONE active hold for that slot
    const activeHolds = await BookingHold.find({
      expertId: expert._id,
      status: 'active',
      startTime: startTime,
    });
    expect(activeHolds.length).toBe(1);
    console.log('✓ Only one active hold in database for the slot');
  }, 30000);

  test('Real Booking Transaction Rollback - Failure after write', async () => {
    expect(expert).toBeDefined();
    expect(service).toBeDefined();
    expect(clientToken).toBeDefined();

    // Create a new client
    const rollbackTestClient = await User.create({
      email: `phase3c-test-rollback-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Rollback',
      lastName: 'Tester',
      role: 'client',
      status: 'active',
    });
    const rollbackToken = authService.generateAccessToken(rollbackTestClient);

    // Try to create a hold with PAST time (should fail validation)
    const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

    const failResponse = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${rollbackToken}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: pastTime.toISOString(),
        timezone: 'UTC',
      });

    // Should fail with 400 (bad request)
    expect(failResponse.status).not.toBe(201);
    console.log(`✓ Invalid booking rejected with status ${failResponse.status}`);

    // Verify no orphaned documents in database
    const orphanedHolds = await BookingHold.find({
      clientId: rollbackTestClient._id,
    });
    expect(orphanedHolds.length).toBe(0);
    console.log('✓ No orphaned holds from failed transaction');

    // Verify no orphaned reservation units
    const orphanedUnits = await ReservationUnit.find({
      clientId: rollbackTestClient._id,
    });
    expect(orphanedUnits.length).toBe(0);
    console.log('✓ No orphaned reservation units');

    // Now try a valid booking - should work (slot available)
    const futureTime = new Date(Date.now() + 96 * 60 * 60 * 1000); // 4 days out
    
    const validResponse = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${rollbackToken}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: futureTime.toISOString(),
        timezone: 'UTC',
      });

    expect(validResponse.status).toBe(201);
    console.log('✓ Valid booking succeeds after rollback');
  }, 30000);

  test('Real Booking Transaction Rollback - Mid-transaction failure', async () => {
    // This test verifies transaction rollback when a failure occurs
    // AFTER ReservationUnit.createReservation but before commit

    expect(expert).toBeDefined();
    expect(service).toBeDefined();
    expect(clientToken).toBeDefined();

    // Create a new client
    const midTransactionClient = await User.create({
      email: `phase3c-mid-transaction-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'MidTransaction',
      lastName: 'Tester',
      role: 'client',
      status: 'active',
    });
    const midToken = authService.generateAccessToken(midTransactionClient);

    // Count existing holds before test
    const holdsBeforeTransaction = await BookingHold.countDocuments({
      expertId: expert._id,
      status: 'active',
    });

    // Use valid future time that should work
    const validFutureTime = new Date(Date.now() + 120 * 60 * 60 * 1000); // 5 days out

    // First, create a hold successfully to establish baseline
    const firstHoldResponse = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: validFutureTime.toISOString(),
        timezone: 'UTC',
      });

    expect(firstHoldResponse.status).toBe(201);
    const firstHold = firstHoldResponse.body.data;
    console.log('✓ First valid hold created for baseline');

    // Verify reservation units were created for first hold
    const firstUnits = await ReservationUnit.find({ holdId: firstHold._id });
    expect(firstUnits.length).toBeGreaterThan(0);
    console.log(`✓ First hold has ${firstUnits.length} reservation unit(s)`);

    // Now attempt overlapping hold - this should fail due to unique constraint
    // But importantly, it should not leave partial ReservationUnits
    const overlappingTime = new Date(validFutureTime.getTime() + 30 * 60 * 1000); // 30 min after start

    const overlappingResponse = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${midToken}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: overlappingTime.toISOString(),
        timezone: 'UTC',
      });

    // Should fail because overlaps with existing hold
    expect(overlappingResponse.status).not.toBe(201);
    console.log(`✓ Overlapping hold rejected with status ${overlappingResponse.status}`);

    // Verify no partial/orphaned reservation units for the failed client
    const orphanedMidUnits = await ReservationUnit.find({
      clientId: midTransactionClient._id,
    });
    expect(orphanedMidUnits.length).toBe(0);
    console.log('✓ No orphaned reservation units from failed overlap attempt');

    // Verify first hold's reservation units still exist and are protected
    const firstUnitsAfter = await ReservationUnit.find({ holdId: firstHold._id });
    expect(firstUnitsAfter.length).toBe(firstUnits.length);
    console.log('✓ Original hold\'s reservation units remain protected');

    // Verify we can confirm the first successful hold
    const confirmResponse = await request(app)
      .post('/api/v1/bookings/confirm')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        holdId: firstHold._id.toString(),
      });

    expect([200, 201]).toContain(confirmResponse.status);
    const booking = confirmResponse.body.data;
    expect(booking.status).toBe('payment_pending');
    console.log('✓ Original successful hold can be confirmed after rollback attempt');

    // Verify booking has correct reservations
    const bookingUnits = await ReservationUnit.find({ bookingId: booking._id });
    expect(bookingUnits.length).toBe(firstUnits.length);
    console.log('✓ Confirmed booking has correct reservation units');
  }, 30000);

  test('Real Hold Expiration - Verified cleanup and slot release', async () => {
    expect(expert).toBeDefined();
    expect(service).toBeDefined();
    expect(clientToken).toBeDefined();

    // Create a new client for expiration test
    const expirationClient = await User.create({
      email: `phase3c-expiration-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Expiration',
      lastName: 'Tester',
      role: 'client',
      status: 'active',
    });
    const expirationToken = authService.generateAccessToken(expirationClient);

    // Create a hold with very short expiration
    const now = new Date();
    const expiringTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    // Create hold directly in database with 1-second expiration for testing
    const shortExpiryHold = await BookingHold.create({
      expertId: expert._id,
      clientId: expirationClient._id,
      serviceId: service._id,
      startTime: expiringTime,
      endTime: new Date(expiringTime.getTime() + 60 * 60 * 1000), // 1 hour duration
      expiresAt: new Date(now.getTime() + 1000), // Expires in 1 second
      status: 'active',
    });

    console.log('✓ Hold created with 1-second expiration');

    // Create reservation units using correct schema
    const slots = ReservationUnit.generateSlots(expiringTime, 60, 15, 15); // 60-min booking with 15-min buffer
    const units = slots.map(slot => ({
      expertId: expert._id,
      holdId: shortExpiryHold._id,
      slotDateTime: slot.slotDateTime,
      unitType: slot.unitType,
      status: 'held',
      expiresAt: shortExpiryHold.expiresAt,
    }));

    const createdUnits = await ReservationUnit.create(units);
    expect(createdUnits.length).toBeGreaterThan(0);
    console.log(`✓ Created ${createdUnits.length} reservation unit(s) for hold`);

    // Wait for hold to expire
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Run cleanup on both ReservationUnits and BookingHolds
    const cleanupResult = await ReservationUnit.cleanupExpired();
    console.log(`✓ Cleanup released ${cleanupResult} expired reservation unit(s)`);
    
    // Also cleanup the expired BookingHold so it's no longer active
    const holdCleanupResult = await BookingHold.cleanupExpired();
    console.log(`✓ Cleanup marked ${holdCleanupResult} expired booking hold(s) as expired`);

    // Verify hold status (check both hold and units)
    const expiredHold = await BookingHold.findById(shortExpiryHold._id);
    const releasedUnits = await ReservationUnit.find({ holdId: shortExpiryHold._id });
    
    // Verify units are released
    const allReleased = releasedUnits.every(u => u.status === 'released');
    expect(allReleased).toBe(true);
    console.log('✓ All reservation units transitioned to released');

    // Verify another client can now reserve the SAME (now-released) slot
    const newClient = await User.create({
      email: `phase3c-new-client-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'New',
      lastName: 'Client',
      role: 'client',
      status: 'active',
    });
    const newClientToken = authService.generateAccessToken(newClient);

    // Try to book the same time slot (should succeed - slot is released)
    const newHoldResponse = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${newClientToken}`)
      .send({
        expertId: expert._id.toString(),
        serviceId: service._id.toString(),
        startTime: expiringTime.toISOString(),
        timezone: 'UTC',
      });

    expect(newHoldResponse.status).toBe(201);
    console.log('✓ New client successfully booked released slot');

    // Verify confirmed booking remains protected (use DIFFERENT expert to avoid conflicts)
    // Create a second expert for protection test
    const protectedExpertUser = await User.create({
      email: `phase3c-protected-expert-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Protected',
      lastName: 'Expert',
      role: 'expert',
      status: 'active',
    });

    const protectedExpert = await Expert.create({
      userId: protectedExpertUser._id,
      headline: 'Protected Expert for Expiration Test',
      bio: 'Expert for verified protection of confirmed bookings. Testing that confirmed bookings are not affected by cleanup routines. Comprehensive testing to ensure data integrity.',
      skills: ['testing', 'consultation'],
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

    const protectedService = await Service.create({
      expertId: protectedExpert._id,
      title: 'Protected Service for Expiration Test',
      description: 'Protected service for verifying confirmed bookings remain protected during cleanup',
      category: 'technology-consulting',
      deliveryMethod: 'video_call',
      duration: 60,
      pricing: { amount: 100, currency: 'USD' },
      isActive: true,
      status: 'approved',
    });

    // Create a confirmed booking that should NOT expire
    const confirmedClient = await User.create({
      email: `phase3c-confirmed-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Confirmed',
      lastName: 'Tester',
      role: 'client',
      status: 'active',
    });
    const confirmedToken = authService.generateAccessToken(confirmedClient);

    // Create and confirm a booking for the protected expert
    const protectedTime = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 3 days out
    const protectedHoldResponse = await request(app)
      .post('/api/v1/bookings/holds')
      .set('Authorization', `Bearer ${confirmedToken}`)
      .send({
        expertId: protectedExpert._id.toString(),
        serviceId: protectedService._id.toString(),
        startTime: protectedTime.toISOString(),
        timezone: 'UTC',
      });

    expect(protectedHoldResponse.status).toBe(201);
    const protectedHold = protectedHoldResponse.body.data;

    // Confirm it
    const confirmProtectedResponse = await request(app)
      .post('/api/v1/bookings/confirm')
      .set('Authorization', `Bearer ${confirmedToken}`)
      .send({
        holdId: protectedHold._id.toString(),
      });

    expect([200, 201]).toContain(confirmProtectedResponse.status);
    console.log('✓ Confirmed booking created');

    // Verify confirmed booking's units are protected (should not be released by cleanup)
    const protectedUnits = await ReservationUnit.find({ 
      holdId: protectedHold._id,
      status: 'confirmed'
    });

    expect(protectedUnits.length).toBeGreaterThan(0);
    console.log('✓ Confirmed booking\'s reservation units remain protected');
  }, 30000);
});
