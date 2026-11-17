#!/usr/bin/env node

/**
 * Test Full Payment Flow
 * Simulates actual browser flow to identify real cause of ERR_CONNECTION_RESET
 */

import axios from 'axios';
import mongoose from 'mongoose';

const API_BASE = 'http://localhost:3001/api/v1';
const MONGODB_URI = 'mongodb://127.0.0.1:27018/experthub?replicaSet=rs0&retryWrites=true&w=majority';

// Import models
import { User, Expert, Booking, Service } from './backend/src/models/index.js';

let accessToken = null;

async function connectDB() {
  console.log('\n📦 Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB connected');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

async function createTestData() {
  console.log('\n📝 Finding test booking...');
  
  // Find any confirmed booking in the system
  let booking = await Booking.findOne({ status: 'confirmed' })
    .populate('clientId')
    .populate('expertId')
    .populate('serviceId');

  if (booking) {
    console.log('✓ Found existing booking:', booking._id);
    console.log('  - Client:', booking.clientId?.email);
    console.log('  - Expert:', booking.expertId?._id);
    console.log('  - Amount:', booking.totalAmount);
    console.log('  - Status:', booking.status);
    return {
      client: booking.clientId,
      expert: booking.expertId,
      service: booking.serviceId,
      booking: booking
    };
  }

  console.log('✗ No confirmed booking found in database');
  console.log('  To proceed, manually create a booking in the app first');
  return null;
}

async function login(email, password) {
  console.log('\n🔐 Attempting login...');
  try {
    const response = await axios.post(
      `${API_BASE}/auth/login`,
      { email, password },
      {
        headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5173' },
        timeout: 5000,
        withCredentials: true
      }
    );
    
    accessToken = response.data.data.accessToken;
    console.log('✓ Login successful');
    return accessToken;
  } catch (err) {
    console.error('✗ Login failed:', err.response?.data?.message || err.message);
    return null;
  }
}

async function testPaymentIntent(bookingId, amount) {
  console.log('\n💳 Testing PaymentIntent creation...');
  
  if (!accessToken) {
    console.error('✗ No access token available');
    return null;
  }

  try {
    const response = await axios.post(
      `${API_BASE}/payments/create-intent`,
      {
        bookingId,
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'USD'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:5173'
        },
        timeout: 10000,
        withCredentials: true
      }
    );

    console.log('✓ PaymentIntent created successfully');
    console.log('  - Intent ID:', response.data.data.paymentIntentId);
    console.log('  - Client Secret:', response.data.data.clientSecret ? '(present)' : '(MISSING!)');
    console.log('  - Status:', response.data.data.status);
    console.log('  - Amount:', response.data.data.amount, response.data.data.currency);
    
    return response.data.data;
  } catch (err) {
    console.error('✗ PaymentIntent creation failed');
    console.error('  Code:', err.code);
    console.error('  Message:', err.message);
    if (err.response?.data) {
      console.error('  Backend error:', err.response.data.message);
    }
    return null;
  }
}

async function runTests() {
  try {
    await connectDB();
    
    console.log('\n🧪 PAYMENT FLOW TEST\n' + '='.repeat(50));

    // Create test data
    const data = await createTestData();
    if (!data) {
      console.error('\n✗ Failed to create test data');
      process.exit(1);
    }

    // Login
    const token = await login('testclient@example.com', 'Test1234!');
    if (!token) {
      console.error('\n✗ Login required for payment test');
      process.exit(1);
    }

    // Test payment intent
    const paymentIntent = await testPaymentIntent(data.booking._id.toString(), data.booking.totalAmount);

    console.log('\n' + '='.repeat(50));
    if (paymentIntent && paymentIntent.clientSecret) {
      console.log('\n✅ PAYMENT FLOW TEST PASSED');
      console.log('   Frontend can now initialize Stripe Elements with client_secret');
    } else {
      console.log('\n✗ PAYMENT FLOW TEST FAILED');
      console.log('   Check backend logs for detailed error');
    }

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Test harness error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
