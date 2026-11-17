#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = 'mongodb://127.0.0.1:27018/experthub?replicaSet=rs0&retryWrites=true&w=majority';

async function run() {
  const mongoClient = new MongoClient(MONGO_URI);
  
  try {
    await mongoClient.connect();
    const db = mongoClient.db('experthub');
    
    // Get the booking's expert
    const booking = await db.collection('bookings').findOne({ status: 'payment_pending' });
    
    if (booking) {
      const expertId = booking.expertId;
      
      // Create a test Stripe connected account ID
      // For testing, use a valid Stripe test account format or platform account
      // Using the platform account itself for connected account fees testing
      const testStripeAccountId = 'acct_1UDWBJ1cHRiKMg2b';
      
      // Update expert with Stripe credentials
      const result = await db.collection('experts').updateOne(
        { _id: expertId },
        {
          $set: {
            stripeAccountId: testStripeAccountId,
            stripeChargesEnabled: true,
            stripeAccountCapabilities: {
              card_payments: 'active',
              payouts: 'active',
              transfers: 'active'
            },
            stripeOnboardingComplete: true,
            stripeOnboardingUrl: null
          }
        }
      );
      
      console.log('✅ Expert Stripe setup updated');
      console.log(`   Expert ID: ${expertId}`);
      console.log(`   Stripe Account: ${testStripeAccountId}`);
      console.log(`   Charges Enabled: true`);
      console.log(`   Modified: ${result.modifiedCount} document(s)`);
    } else {
      console.log('❌ No payment_pending booking found');
    }
    
  } finally {
    await mongoClient.close();
  }
}

run();
