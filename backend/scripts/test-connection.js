#!/usr/bin/env node

import mongoose from 'mongoose';

async function test() {
  const uri = 'mongodb://localhost:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority';
  
  console.log('Testing MongoDB connection to:', uri);
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected successfully!');
    
    // Test transaction support
    const session = await conn.startSession();
    await session.withTransaction(async () => {
      console.log('✅ Transactions supported!');
    });
    await session.endSession();
    
    await mongoose.disconnect();
    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

test();
