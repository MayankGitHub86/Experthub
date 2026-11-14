/**
 * Test the complete booking workflow end-to-end
 * Tests: Register → Login → Get Expert → Get Services → Get Availability → Create Hold → Confirm Booking
 */

const API_BASE = 'http://localhost:3001/api/v1';

// Test data
const testUser = {
  firstName: 'Test',
  lastName: 'Booking',
  email: `test-booking-${Date.now()}@example.com`,
  password: 'TestPassword123!'
};

let authToken = null;
let expertId = null;
let serviceId = null;
let slotStartTime = null;
let holdId = null;

// Utility functions
const request = async (method, path, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${method} ${path}: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
};

const log = (step, message) => {
  console.log(`\n✓ [${step}] ${message}`);
};

// Test workflow
(async () => {
  try {
    // 1. Register user
    log('1', 'Registering test user...');
    const registerRes = await request('POST', '/auth/register', {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
      password: testUser.password
    });
    log('1', `User registered: ${registerRes.data.user?.email}`);

    // 2. Login
    log('2', 'Logging in...');
    const loginRes = await request('POST', '/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginRes.data.accessToken;
    log('2', `Logged in successfully, token: ${authToken.substring(0, 20)}...`);

    // 3. Get experts list to find one
    log('3', 'Fetching experts list...');
    const expertsRes = await request('GET', '/experts');
    const expertsList = expertsRes.data || expertsRes;
    if (!Array.isArray(expertsList) || expertsList.length === 0) {
      throw new Error('No experts available for booking');
    }
    expertId = expertsList[0]._id;
    log('3', `Found expert: ${expertsList[0].userId?.firstName || 'Unknown'} ${expertsList[0].userId?.lastName || ''} (ID: ${expertId})`);

    // 4. Get expert's services
    log('4', 'Fetching expert services...');
    const servicesRes = await request('GET', `/services/expert/${expertId}`);
    const servicesList = servicesRes.data || servicesRes;
    if (!Array.isArray(servicesList) || servicesList.length === 0) {
      throw new Error(`No services for expert ${expertId}`);
    }
    serviceId = servicesList[0]._id;
    log('4', `Found service: ${servicesList[0].title} ($${servicesList[0].pricing?.amount})`);

    // 5. Get availability for next weekday
    log('5', 'Fetching availability...');
    const today = new Date();
    let targetDate = new Date(today);
    
    // Find next weekday (Mon-Fri)
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const availRes = await request('GET', `/availability/expert/${expertId}?serviceId=${serviceId}&startDate=${targetDate.toISOString()}&endDate=${nextDay.toISOString()}&timezone=UTC`);
    const availSlots = availRes.data?.slots || availRes.slots || availRes.data || availRes;
    if (!Array.isArray(availSlots) || availSlots.length === 0) {
      throw new Error(`No available slots for ${targetDate.toDateString()}`);
    }
    slotStartTime = availSlots[0].startTime;
    log('5', `Found slot at: ${new Date(slotStartTime).toLocaleString()}`);

    // 6. Create hold
    log('6', 'Creating booking hold...');
    const holdRes = await request('POST', '/bookings/holds', {
      expertId,
      serviceId,
      startTime: slotStartTime,
      timezone: 'UTC'
    });
    const holdData = holdRes.data;
    holdId = holdData._id;
    log('6', `Hold created: ${holdId}, expires at: ${new Date(holdData.expiresAt).toLocaleString()}`);

    // 7. Confirm booking
    log('7', 'Confirming booking...');
    const confirmRes = await request('POST', '/bookings/confirm', {
      holdId,
      clientNotes: 'Test booking notes'
    });
    log('7', `Booking confirmed! Status: ${confirmRes.status}, Booking ID: ${confirmRes._id}`);

    // 8. Get my bookings to verify
    log('8', 'Fetching my bookings...');
    const myBookingsRes = await request('GET', '/bookings/me');
    const foundBooking = myBookingsRes.find(b => b._id === confirmRes._id);
    if (!foundBooking) {
      throw new Error('Created booking not found in my bookings list');
    }
    log('8', `Booking found in list: ${foundBooking.bookingNumber} - Status: ${foundBooking.status}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE BOOKING WORKFLOW TEST PASSED');
    console.log('='.repeat(60));
    console.log('All operations succeeded:');
    console.log(`  • User registered & logged in`);
    console.log(`  • Found expert and services`);
    console.log(`  • Fetched availability`);
    console.log(`  • Created booking hold (15-min TTL)`);
    console.log(`  • Confirmed booking (payment_pending)`);
    console.log(`  • Verified booking in list`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
})();
