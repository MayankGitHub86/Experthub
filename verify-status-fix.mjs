#!/usr/bin/env node

/**
 * Verify that payment service now accepts payment_pending status
 * This doesn't test Stripe connectivity, just the validation fix
 */

import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const MONGO_URI = 'mongodb://127.0.0.1:27018/experthub?replicaSet=rs0&retryWrites=true&w=majority';
const API_BASE = 'http://localhost:3001';
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production-12345';

async function test() {
  console.log('🔍 Verifying Payment Service Status Fix\n');
  
  const mongoClient = new MongoClient(MONGO_URI);
  
  try {
    await mongoClient.connect();
    const db = mongoClient.db('experthub');
    
    // Get payment_pending booking
    const booking = await db.collection('bookings').findOne({ status: 'payment_pending' });
    
    if (!booking) {
      console.log('❌ No payment_pending booking found');
      return false;
    }
    
    console.log('📊 Test booking:');
    console.log(`   Status: ${booking.status}`);
    console.log(`   Amount: $${booking.totalAmount}`);
    console.log(`   Client: ${booking.clientId}`);
    
    // Create token
    const token = jwt.sign(
      { sub: booking.clientId.toString(), type: 'access', role: 'client' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('\n💳 Testing payment intent creation with payment_pending booking...');
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/v1/payments/create-intent`,
        {
          bookingId: booking._id.toString(),
          amount: Math.round(booking.totalAmount * 100),
          currency: 'USD',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // If we get here, status validation passed
      // Stripe error means the validation fix worked
      console.log('✅ STATUS VALIDATION PASSED');
      console.log('   Payment service accepted payment_pending status');
      return true;
      
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      
      // Check what kind of error we got
      if (message.includes('Stripe') || message.includes('account') || message.includes('transfer_data')) {
        console.log('✅ STATUS VALIDATION PASSED');
        console.log('   (Stopped at Stripe validation, not status validation)');
        console.log(`   Error: ${message}`);
        return true;
      } else if (message.includes('payment_pending') || message.includes('confirmed')) {
        console.log('❌ STATUS VALIDATION FAILED');
        console.log(`   Error: ${message}`);
        return false;
      } else {
        console.log('⚠️  UNEXPECTED ERROR');
        console.log(`   ${message}`);
        return null;
      }
    }
    
  } finally {
    await mongoClient.close();
  }
}

const result = await test();

if (result === true) {
  console.log('\n✨ FIX VERIFIED: Payment initialization can proceed with payment_pending bookings');
  console.log('   Next step: Test through real Stripe Connect or mock the connection');
  process.exit(0);
} else if (result === false) {
  console.log('\n❌ FIX NOT WORKING: Payment service still rejects payment_pending');
  process.exit(1);
} else {
  console.log('\n❓ UNCLEAR: Unexpected error');
  process.exit(1);
}
