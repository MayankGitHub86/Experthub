#!/usr/bin/env node
import mongoose from 'mongoose';

const uri = 'mongodb://localhost:27017/experthub';
console.log('Attempting to connect without replica set requirement...');
console.log(`URI: ${uri}`);

mongoose.connect(uri, {
  maxPoolSize: 2,
  serverSelectionTimeoutMS: 10000,
})
.then(async () => {
  console.log('✓ Connected to MongoDB');
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Host: ${mongoose.connection.host}`);
  
  // Check replica set status
  try {
    const admin = mongoose.connection.getClient().db('admin');
    const status = await admin.admin().replSetGetStatus().catch(() => null);
    
    if (status) {
      console.log('✓ Replica set initialized');
      console.log(`  Set name: ${status.set}`);
      console.log(`  Members: ${status.members.length}`);
      status.members.forEach((m, i) => {
        const states = { 0: 'STARTUP', 1: 'PRIMARY', 2: 'SECONDARY', 7: 'ARBITER' };
        console.log(`    ${i}: ${m.name} (${states[m.state] || m.state})`);
      });
    } else {
      console.log('✗ MongoDB running as STANDALONE (no replica set)');
    }
  } catch (e) {
    console.log('✗ MongoDB running as STANDALONE:', e.message.split('\n')[0]);
  }
  
  // Try to start a transaction
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await session.abortTransaction();
    await session.endSession();
    console.log('✓ Transactions supported');
  } catch (e) {
    console.log('✗ Transactions NOT supported:', e.message.split('\n')[0]);
  }
  
  await mongoose.connection.close();
  process.exit(0);
})
.catch(err => {
  console.log('✗ Connection failed:', err.message);
  process.exit(1);
});
