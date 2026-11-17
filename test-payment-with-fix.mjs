#!/usr/bin/env node

/**
 * Test payment initialization with existing payment_pending booking
 * After fixing payment service to accept payment_pending status
 */

import axios from 'axios';
import { MongoClient } from 'mongodb';

const MONGO_URI = 'mongodb://127.0.0.1:27018/experthub?replicaSet=rs0&retryWrites=true&w=majority';
const API_BASE = 'http://localhost:3001';

// Test credentials - real users from database
const TEST_CLIENT_EMAIL = 'testclient-scfna5ba@example.com';
const TEST_CLIENT_PASSWORD = 'client123'; // Default test password

let authToken = null;
let client = null;
let mongoClient = null;

async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      email,
      password,
    });
    return response.data.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${email}:`, error.response?.data?.message || error.message);
    process.exit(1);
  }
}

async function getBookings(token) {
  try {
    const response = await axios.get(`${API_BASE}/api/v1/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data.bookings || [];
  } catch (error) {
    console.error('❌ Failed to fetch bookings:', error.response?.data?.message || error.message);
    return [];
  }
}

async function queryDatabase() {
  try {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    
    const db = mongoClient.db('experthub');
    const bookings = db.collection('bookings');
    
    const booking = await bookings.findOne({ status: 'payment_pending' });
    
    if (booking) {
      console.log('\n📊 Found booking in payment_pending status:');
      console.log(`   Booking ID: ${booking._id}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Total Amount: $${(booking.totalAmount || 0).toFixed(2)}`);
      console.log(`   Client ID: ${booking.clientId}`);
      console.log(`   Expert ID: ${booking.expertId}`);
    }
    
    return booking;
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
    return null;
  }
}

async function createPaymentIntent(bookingId, amount, currency, token) {
  try {
    console.log(`\n💳 Creating payment intent for booking ${bookingId}...`);
    console.log(`   Amount: $${(amount / 100).toFixed(2)} ${currency}`);
    
    const response = await axios.post(
      `${API_BASE}/api/v1/payments/create-intent`,
      {
        bookingId,
        amount,
        currency,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    if (response.data.success) {
      console.log('✅ Payment intent created successfully!');
      console.log(`   Payment Intent ID: ${response.data.data.id}`);
      console.log(`   Client Secret: ${response.data.data.client_secret}`);
      console.log(`   Amount: ${response.data.data.amount} cents`);
      console.log(`   Status: ${response.data.data.status}`);
      return response.data.data;
    } else {
      console.error('❌ Unexpected response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Payment intent creation failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.response.statusText}`);
      if (error.response.data?.errors) {
        error.response.data.errors.forEach(e => console.error(`   - ${e}`));
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return null;
  }
}

async function run() {
  console.log('🔄 Testing Payment Initialization (After Fix)\n');
  
  try {
    // Step 1: Query for payment_pending booking
    console.log('📋 Step 1: Querying for existing payment_pending booking...');
    const booking = await queryDatabase();
    
    if (!booking) {
      console.log('⚠️  No payment_pending booking found in database');
      console.log('    Creating test through API instead...\n');
    }
    
    // Step 2: Login as client
    console.log('\n🔐 Step 2: Logging in as client...');
    authToken = await login(TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD);
    console.log(`✅ Logged in as client: ${TEST_CLIENT_EMAIL}`);
    
    // Step 3: Get client's bookings
    console.log('\n📚 Step 3: Fetching client bookings...');
    const bookings = await getBookings(authToken);
    console.log(`   Found ${bookings.length} bookings`);
    
    const paymentPendingBooking = bookings.find(b => b.status === 'payment_pending');
    if (paymentPendingBooking) {
      console.log(`✅ Found payment_pending booking via API: ${paymentPendingBooking._id}`);
    } else {
      console.log('⚠️  No payment_pending bookings found via API');
      console.log('   Bookings:', bookings.map(b => `${b._id} (${b.status})`).join(', '));
    }
    
    // Step 4: Attempt payment with database booking
    if (booking) {
      const bookingId = booking._id.toString();
      const amountCents = Math.round(booking.totalAmount * 100);
      const currency = booking.pricing?.currency || 'USD';
      
      console.log('\n💳 Step 4: Creating payment intent...');
      const paymentIntent = await createPaymentIntent(
        bookingId,
        amountCents,
        currency,
        authToken
      );
      
      if (paymentIntent) {
        console.log('\n✨ SUCCESS: Payment initialization working!');
        console.log(`   The booking in payment_pending status can now be charged`);
        console.log(`   Frontend can initialize Stripe Elements with this client_secret`);
      } else {
        console.log('\n❌ Payment initialization failed - see error above');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

run();
