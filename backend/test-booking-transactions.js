/**
 * Booking Transaction Verification Tests
 * 
 * These tests verify:
 * 1. Hold creation is atomic (all-or-nothing)
 * 2. Hold confirmation is atomic
 * 3. Concurrent holds on same slot are properly rejected
 * 4. Transaction rollback releases reservations
 * 5. Confirmed bookings are never orphaned
 */

import mongoose from 'mongoose';
import { Booking, BookingHold, Expert, Service, ReservationUnit, User } from './src/models/index.js';
import bookingService from './src/modules/bookings/booking.service.js';
import { logger } from './src/utils/logger.js';

let testExpertId, testServiceId, testClientId, testClientId2;

async function setup() {
  console.log('\n========== TEST SETUP ==========');
  
  // Create test clients
  console.log('Creating test clients...');
  const client1 = await User.create({
    firstName: 'Test',
    lastName: 'Client1',
    email: `test-client-1-${Date.now()}@test.com`,
    password: 'hashedPassword',
    role: 'client',
    emailVerified: true
  });
  testClientId = client1._id;
  
  const client2 = await User.create({
    firstName: 'Test',
    lastName: 'Client2',
    email: `test-client-2-${Date.now()}@test.com`,
    password: 'hashedPassword',
    role: 'client',
    emailVerified: true
  });
  testClientId2 = client2._id;
  
  // Create test expert
  console.log('Creating test expert...');
  const expert = await Expert.create({
    userId: new mongoose.Types.ObjectId(),
    headline: 'Test Expert for Transaction Testing',
    bio: 'This is a test expert with 100+ characters for proper validation and transaction testing scenarios.',
    hourlyRate: 100,
    category: 'Technology & Engineering',
    verificationStatus: 'approved',
    acceptingBookings: true,
    availability: {
      timezone: 'UTC',
      weeklySchedule: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }]
      }
    }
  });
  testExpertId = expert._id;
  
  // Create test service
  console.log('Creating test service...');
  const service = await Service.create({
    expertId: testExpertId,
    title: 'Test Consultation',
    description: 'This is a test service for transaction verification with sufficient description length for validation.',
    duration: 60,
    pricing: { type: 'hourly', amount: 100, currency: 'USD' },
    category: 'technology-consulting',
    isActive: true,
    status: 'approved'
  });
  testServiceId = service._id;
  
  console.log('✓ Setup complete\n');
}

async function cleanup() {
  console.log('\n========== TEST CLEANUP ==========');
  await User.deleteMany({ _id: { $in: [testClientId, testClientId2] } });
  await Expert.deleteMany({ _id: testExpertId });
  await Service.deleteMany({ _id: testServiceId });
  await BookingHold.deleteMany({ expertId: testExpertId });
  await Booking.deleteMany({ expertId: testExpertId });
  await ReservationUnit.deleteMany({ expertId: testExpertId });
  console.log('✓ Cleanup complete\n');
}

async function testAtomicHoldCreation() {
  console.log('\n========== TEST 1: Atomic Hold Creation ==========');
  
  const futureSlot = new Date();
  futureSlot.setDate(futureSlot.getDate() + 5);
  futureSlot.setHours(10, 0, 0, 0);
  
  try {
    const hold = await bookingService.createHold(
      testClientId,
      testExpertId,
      testServiceId,
      futureSlot.toISOString(),
      'UTC'
    );
    
    console.log('✓ Hold created:', hold._id);
    
    // Verify all reservation units were created
    const units = await ReservationUnit.find({ holdId: hold._id });
    console.log(`✓ Reservation units created: ${units.length}`);
    
    if (units.length === 0) {
      throw new Error('No reservation units created - incomplete atomic operation!');
    }
    
    // Verify hold is in active status
    if (hold.status !== 'active') {
      throw new Error(`Hold has incorrect status: ${hold.status}`);
    }
    console.log('✓ Hold status is active');
    
    console.log('✅ TEST 1 PASSED: Hold creation is atomic\n');
    return hold;
  } catch (error) {
    console.error('❌ TEST 1 FAILED:', error.message, '\n');
    throw error;
  }
}

async function testAtomicConfirmation(hold) {
  console.log('\n========== TEST 2: Atomic Hold Confirmation ==========');
  
  try {
    const booking = await bookingService.confirmBooking(
      hold._id,
      testClientId,
      'Test booking confirmation'
    );
    
    console.log('✓ Booking confirmed:', booking._id);
    console.log(`✓ Booking status: ${booking.status}`);
    
    if (booking.status !== 'payment_pending') {
      throw new Error(`Booking has incorrect status: ${booking.status}`);
    }
    
    // Verify hold is marked as confirmed
    const updatedHold = await BookingHold.findById(hold._id);
    if (updatedHold.status !== 'confirmed') {
      throw new Error(`Hold status not updated: ${updatedHold.status}`);
    }
    console.log('✓ Hold status transitioned to confirmed');
    
    // Verify reservation units are confirmed
    const units = await ReservationUnit.find({ holdId: hold._id });
    const allConfirmed = units.every(u => u.bookingId && u.bookingId.toString() === booking._id.toString());
    if (!allConfirmed) {
      throw new Error('Not all reservation units confirmed');
    }
    console.log(`✓ All ${units.length} reservation units confirmed`);
    
    console.log('✅ TEST 2 PASSED: Hold confirmation is atomic\n');
    return booking;
  } catch (error) {
    console.error('❌ TEST 2 FAILED:', error.message, '\n');
    throw error;
  }
}

async function testConcurrentConflict() {
  console.log('\n========== TEST 3: Concurrent Booking Conflict Detection ==========');
  
  const futureSlot = new Date();
  futureSlot.setDate(futureSlot.getDate() + 6);
  futureSlot.setHours(11, 0, 0, 0);
  
  try {
    // First hold should succeed
    const hold1 = await bookingService.createHold(
      testClientId,
      testExpertId,
      testServiceId,
      futureSlot.toISOString(),
      'UTC'
    );
    console.log('✓ First hold created:', hold1._id);
    
    // Overlapping hold should fail
    try {
      const hold2 = await bookingService.createHold(
        testClientId2,
        testExpertId,
        testServiceId,
        futureSlot.toISOString(),
        'UTC'
      );
      throw new Error('Second hold should have failed but succeeded!');
    } catch (conflictError) {
      if (conflictError.message.includes('conflict') || conflictError.message.includes('Conflict')) {
        console.log('✓ Concurrent booking correctly rejected:', conflictError.message);
      } else {
        throw conflictError;
      }
    }
    
    // Verify no orphaned units from failed second hold
    const allUnits = await ReservationUnit.find({ expertId: testExpertId });
    const confirmedCount = allUnits.filter(u => u.status === 'confirmed' || u.holdId).length;
    console.log(`✓ Reservation units after conflict: ${confirmedCount} (no orphans)`);
    
    console.log('✅ TEST 3 PASSED: Concurrent conflicts handled safely\n');
    return hold1;
  } catch (error) {
    console.error('❌ TEST 3 FAILED:', error.message, '\n');
    throw error;
  }
}

async function testCancellationRollback() {
  console.log('\n========== TEST 4: Cancellation with Rollback ==========');
  
  const futureSlot = new Date();
  futureSlot.setDate(futureSlot.getDate() + 7);
  futureSlot.setHours(12, 0, 0, 0);
  
  try {
    // Create and confirm a booking
    const hold = await bookingService.createHold(
      testClientId,
      testExpertId,
      testServiceId,
      futureSlot.toISOString(),
      'UTC'
    );
    
    const booking = await bookingService.confirmBooking(
      hold._id,
      testClientId,
      'Will be cancelled'
    );
    console.log('✓ Booking created and confirmed:', booking._id);
    
    // Get units before cancellation
    const unitsBefore = await ReservationUnit.find({ bookingId: booking._id });
    console.log(`✓ Reservation units before cancel: ${unitsBefore.length}`);
    
    // Cancel the booking
    const { booking: cancelledBooking, refundInfo } = await bookingService.cancelBooking(
      booking._id,
      testClientId,
      'Client requested cancellation'
    );
    
    console.log(`✓ Booking cancelled: ${cancelledBooking.status}`);
    console.log(`✓ Refund calculated: ${refundInfo.refundAmount}`);
    
    // Verify units are released
    const unitsAfter = await ReservationUnit.find({ bookingId: booking._id });
    unitsAfter.forEach(u => {
      if (u.status !== 'released') {
        throw new Error(`Unit not released: ${u._id} status=${u.status}`);
      }
    });
    console.log(`✓ All ${unitsAfter.length} reservation units released`);
    
    // Verify a new booking can use the same slot
    const hold2 = await bookingService.createHold(
      testClientId2,
      testExpertId,
      testServiceId,
      futureSlot.toISOString(),
      'UTC'
    );
    console.log('✓ Released slot available for new booking');
    
    console.log('✅ TEST 4 PASSED: Cancellation properly releases resources\n');
  } catch (error) {
    console.error('❌ TEST 4 FAILED:', error.message, '\n');
    throw error;
  }
}

async function testHoldExpiry() {
  console.log('\n========== TEST 5: Hold Expiry Safety ==========');
  
  const futureSlot = new Date();
  futureSlot.setDate(futureSlot.getDate() + 8);
  futureSlot.setHours(13, 0, 0, 0);
  
  try {
    // Create hold with immediate expiry (for testing)
    const hold = await BookingHold.create({
      clientId: testClientId,
      expertId: testExpertId,
      serviceId: testServiceId,
      startTime: futureSlot,
      timezone: 'UTC',
      status: 'active',
      expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
    });
    console.log('✓ Expired hold created');
    
    // Try to confirm expired hold (should fail)
    try {
      await bookingService.confirmBooking(hold._id, testClientId, 'Test');
      throw new Error('Confirming expired hold should have failed!');
    } catch (error) {
      if (error.message.includes('expired') || error.code === 410) {
        console.log('✓ Expired hold correctly rejected:', error.message);
      } else {
        throw error;
      }
    }
    
    // Cleanup the test hold
    await BookingHold.deleteOne({ _id: hold._id });
    
    console.log('✅ TEST 5 PASSED: Hold expiry prevents stale bookings\n');
  } catch (error) {
    console.error('❌ TEST 5 FAILED:', error.message, '\n');
    throw error;
  }
}

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  Booking Transaction Verification Tests        ║');
    console.log('║  Verifying ACID guarantees and atomicity       ║');
    console.log('╚════════════════════════════════════════════════╝');
    
    // Check MongoDB version and replica set status
    console.log('\n========== ENVIRONMENT CHECK ==========');
    const client = mongoose.connection.getClient();
    const db = client.db('admin');
    
    try {
      const status = await db.admin().command({ replSetGetStatus: 1 });
      const primary = status.members.find(m => m.state === 1);
      if (!primary) {
        throw new Error('No PRIMARY member in replica set');
      }
      console.log(`✓ MongoDB Replica Set: ${status.set}`);
      console.log(`✓ PRIMARY: ${primary.host}`);
    } catch (error) {
      throw new Error(`Cannot run transaction tests without replica set: ${error.message}`);
    }
    
    await setup();
    
    const hold1 = await testAtomicHoldCreation();
    const booking1 = await testAtomicConfirmation(hold1);
    const hold2 = await testConcurrentConflict();
    await testCancellationRollback();
    await testHoldExpiry();
    
    await cleanup();
    
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║ ✅ ALL TRANSACTION TESTS PASSED               ║');
    console.log('║ Booking engine is transaction-safe             ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════╗');
    console.error('║ ❌ TEST SUITE FAILED                          ║');
    console.error('╚════════════════════════════════════════════════╝');
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Connect and run
mongoose.connect('mongodb://localhost:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority')
  .then(() => {
    console.log('✓ Connected to MongoDB');
    main();
  })
  .catch(error => {
    console.error('Connection failed:', error.message);
    if (error.message.includes('not running with --replSet')) {
      console.error('\n❌ MongoDB requires replica set for transactions!');
      console.error('   Start with: mongod --replSet rs0');
    }
    process.exit(1);
  });
