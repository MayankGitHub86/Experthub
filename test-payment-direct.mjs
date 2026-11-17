#!/usr/bin/env node

/**
 * Direct payment intent test with real booking
 * Uses JWT token generation for auth
 */

import axios from 'axios';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const MONGO_URI = 'mongodb://127.0.0.1:27018/experthub?replicaSet=rs0&retryWrites=true&w=majority';
const API_BASE = 'http://localhost:3001';
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production-12345';

async function getPaymentPendingBooking() {
  const mongoClient = new MongoClient(MONGO_URI);
  
  try {
    await mongoClient.connect();
    const db = mongoClient.db('experthub');
    const bookings = db.collection('bookings');
    
    const booking = await bookings.findOne({ status: 'payment_pending' });
    
    if (booking) {
      console.log('📊 Payment-pending booking found:');
      console.log(`   ID: ${booking._id}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Amount: $${booking.totalAmount}`);
      console.log(`   Client ID: ${booking.clientId}`);
    }
    
    return booking;
  } finally {
    await mongoClient.close();
  }
}

async function createPaymentIntent(booking, clientToken) {
  try {
    const bookingId = booking._id.toString();
    const amountCents = Math.round(booking.totalAmount * 100);
    const currency = booking.pricing?.currency || 'USD';
    
    console.log(`\n💳 Creating payment intent...`);
    console.log(`   Booking: ${bookingId}`);
    console.log(`   Amount: $${(amountCents / 100).toFixed(2)}`);
    console.log(`   Status: ${booking.status}`);
    
    const response = await axios.post(
      `${API_BASE}/api/v1/payments/create-intent`,
      {
        bookingId,
        amount: amountCents,
        currency,
      },
      {
        headers: { Authorization: `Bearer ${clientToken}` },
      }
    );
    
    if (response.data.success) {
      console.log('\n✅ SUCCESS! Payment intent created!');
      console.log(`   Intent ID: ${response.data.data.id}`);
      console.log(`   Client Secret: ${response.data.data.client_secret}`);
      console.log(`   Amount: ${response.data.data.amount} cents`);
      console.log(`   Status: ${response.data.data.status}`);
      console.log(`   Charges: ${response.data.data.charges?.data?.length || 0} charge(s)`);
      return response.data.data;
    } else {
      console.error('❌ Unexpected response:', response.data);
    }
  } catch (error) {
    console.error('\n❌ Payment intent creation FAILED:');
    if (error.response?.status === 401) {
      console.error(`   Status: ${error.response.status} - Unauthorized`);
      console.error('   Token may be invalid or expired');
    } else if (error.response?.data?.message) {
      console.error(`   Message: ${error.response.data.message}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    if (error.response?.data?.errors) {
      error.response.data.errors.forEach(e => console.error(`   - ${e}`));
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Direct Payment Intent Test\n');
  
  // Get booking
  const booking = await getPaymentPendingBooking();
  if (!booking) {
    console.error('❌ No payment_pending booking found');
    process.exit(1);
  }
  
  // Create a token for the booking's client
  // In real scenario, this would come from login
  const clientToken = jwt.sign(
    {
      sub: booking.clientId.toString(),
      type: 'access',
      email: 'test@example.com',
      role: 'client',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  console.log(`\n🔐 Using JWT token for client: ${booking.clientId}`);
  
  // Attempt payment
  const paymentIntent = await createPaymentIntent(booking, clientToken);
  
  if (paymentIntent) {
    console.log('\n🎉 PAYMENT INITIALIZATION WORKS!');
    console.log('   ✅ Booking status validation fixed');
    console.log('   ✅ PaymentIntent created successfully');
    console.log('   ✅ Frontend can now initialize Stripe Elements');
  } else {
    console.log('\n❌ Payment initialization still failing');
    console.log('   Check the error messages above');
  }
}

main().catch(e => console.error('Fatal error:', e.message));
