#!/usr/bin/env node

import { MongoClient } from 'mongodb';

const MONGO_URI = 'mongodb://127.0.0.1:27018/experthub?replicaSet=rs0&retryWrites=true&w=majority';

async function run() {
  const mongoClient = new MongoClient(MONGO_URI);
  
  try {
    await mongoClient.connect();
    const db = mongoClient.db('experthub');
    
    // Get users
    const users = db.collection('users');
    const userList = await users.find({}).project({ email: 1, role: 1, firstName: 1, lastName: 1 }).toArray();
    
    console.log('📋 Users in database:');
    userList.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email} (${u.role}) - ${u.firstName} ${u.lastName}`);
    });
    
    // Get the booking
    const bookings = db.collection('bookings');
    const booking = await bookings.findOne({ status: 'payment_pending' });
    
    if (booking) {
      console.log(`\n📊 Payment-pending booking:`);
      console.log(`   ID: ${booking._id}`);
      console.log(`   Client ID: ${booking.clientId}`);
      console.log(`   Amount: $${booking.totalAmount}`);
      
      // Get the client user
      const client = await users.findOne({ _id: booking.clientId });
      if (client) {
        console.log(`   Client: ${client.email} (${client.firstName} ${client.lastName})`);
      }
    }
    
  } finally {
    await mongoClient.close();
  }
}

run();
