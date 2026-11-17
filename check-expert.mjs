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
      console.log('📊 Booking expert:');
      console.log(`   Expert ID: ${booking.expertId}`);
      
      const expert = await db.collection('experts').findOne({ _id: booking.expertId });
      
      if (expert) {
        console.log(`   Name: ${expert.firstName} ${expert.lastName}`);
        console.log(`   Verification: ${expert.verificationStatus}`);
        console.log(`   Stripe Account ID: ${expert.stripeAccountId || 'NOT SET'}`);
        console.log(`   Stripe Charges Enabled: ${expert.stripeChargesEnabled}`);
        console.log(`   Stripe Capabilities: ${JSON.stringify(expert.stripeAccountCapabilities || {})}`);
      } else {
        console.log('   ❌ Expert not found');
      }
    }
    
  } finally {
    await mongoClient.close();
  }
}

run();
