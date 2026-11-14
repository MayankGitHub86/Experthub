#!/usr/bin/env node
/**
 * Test if MongoDB 8.2 supports multi-document transactions on standalone
 * (MongoDB 7.0+ supports this)
 */

import mongoose from 'mongoose';

const uri = 'mongodb://localhost:27017/test_txn_db';

async function test() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    
    console.log('Connected to MongoDB');
    
    // Get version info
    const admin = mongoose.connection.getClient().db('admin');
    const serverInfo = await admin.admin().serverInfo();
    console.log(`MongoDB Version: ${serverInfo.version}`);
    
    // Try a transaction
    const session = await mongoose.startSession();
    console.log('Session created');
    
    try {
      session.startTransaction();
      console.log('✓ startTransaction() succeeded');
      
      // Try to perform operation
      const testDb = mongoose.connection.getClient().db('test_txn_db');
      const collection = testDb.collection('test_collection');
      
      await collection.insertOne({ test: 'data' }, { session });
      console.log('✓ insertOne with session succeeded');
      
      await session.commitTransaction();
      console.log('✓ commitTransaction() succeeded');
      
      console.log('\n✓✓✓ MULTI-DOCUMENT TRANSACTIONS WORK ON THIS MONGODB ✓✓✓');
      
    } catch (e) {
      await session.abortTransaction();
      console.log('✗ Transaction failed:', e.message);
      console.log('\nThis MongoDB does NOT support standalone transactions');
    } finally {
      await session.endSession();
    }
    
    await mongoose.connection.close();
    
  } catch (e) {
    console.log('Error:', e.message);
    process.exit(1);
  }
}

test();
