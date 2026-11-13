#!/usr/bin/env node

/**
 * MongoDB Replica Set Initialization Script
 * 
 * This script:
 * 1. Connects to standalone MongoDB
 * 2. Initializes a single-node replica set (rs0)
 * 3. Verifies replica set is working
 * 4. Tests transaction support
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-rs-init';

async function main() {
  let connection = null;
  
  try {
    console.log('Connecting to MongoDB at', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    // Connect without transaction requirements initially
    connection = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    
    const adminDb = mongoose.connection.db.admin();
    
    console.log('\n✅ Connected to MongoDB');
    
    // Check if replica set is already initialized
    console.log('\n--- Checking replica set status ---');
    let rsStatus;
    try {
      rsStatus = await adminDb.command({ replSetGetStatus: 1 });
      console.log('✅ Replica set already exists:', rsStatus.set);
    } catch (err) {
      if (err.message.includes('no replset config has been received')) {
        console.log('No replica set configured. Initializing...');
        
        // Initiate replica set
        const initConfig = {
          _id: 'rs0',
          members: [
            {
              _id: 0,
              host: 'localhost:27017',
              priority: 1
            }
          ]
        };
        
        console.log('\nInitializing replica set with config:', JSON.stringify(initConfig, null, 2));
        const initResult = await adminDb.command({ replSetInitiate: initConfig });
        console.log('Init result:', initResult);
        
        // Wait for replica set to be ready
        console.log('\nWaiting for replica set to initialize (may take 10-20 seconds)...');
        for (let i = 0; i < 40; i++) {
          try {
            const status = await adminDb.command({ replSetGetStatus: 1 });
            if (status.members[0].state === 1) { // PRIMARY
              console.log('✅ Replica set initialized and PRIMARY is ready');
              rsStatus = status;
              break;
            }
            process.stdout.write('.');
          } catch (err) {
            process.stdout.write('.');
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log('');
      } else {
        throw err;
      }
    }
    
    // Display replica set status
    console.log('\n--- Replica Set Status ---');
    rsStatus = await adminDb.command({ replSetGetStatus: 1 });
    console.log('Set Name:', rsStatus.set);
    console.log('Members:');
    rsStatus.members.forEach(m => {
      console.log(`  [${m._id}] ${m.host} - State: ${m.state} (${getStateName(m.state)})`);
    });
    
    // Get replica set configuration
    console.log('\n--- Replica Set Configuration ---');
    const conf = await adminDb.command({ replSetGetConfig: {} });
    console.log('Configuration:', JSON.stringify(conf.config, null, 2));
    
    // Test hello command
    console.log('\n--- Server Info (hello) ---');
    const hello = await adminDb.command({ hello: 1 });
    console.log('Is WritablePrimary:', hello.isWritablePrimary);
    console.log('Set Name:', hello.setName);
    console.log('Members:', hello.members);
    
    // Test transaction support
    console.log('\n--- Testing Transaction Support ---');
    await testTransactions(connection);
    
    console.log('\n✅ MongoDB replica set is configured and ready for transactions!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
    }
  }
}

function getStateName(state) {
  const names = ['STARTUP', 'PRIMARY', 'SECONDARY', 'RECOVERING', '', 'STARTUP2', 'UNKNOWN', 'ARBITER', 'DOWN', 'ROLLBACK', 'REMOVED'];
  return names[state] || 'UNKNOWN';
}

async function testTransactions(connection) {
  const session = connection.startSession();
  
  try {
    console.log('Starting transaction...');
    session.startTransaction();
    
    // Get test database and collections
    const testDb = connection.db.db('transaction_test');
    const coll1 = testDb.collection('test_coll_1');
    const coll2 = testDb.collection('test_coll_2');
    
    // Insert first document
    const doc1 = { _id: 'txn-test-1', value: 'first', timestamp: new Date() };
    await coll1.insertOne(doc1, { session });
    console.log('✅ Inserted document 1');
    
    // Insert second document
    const doc2 = { _id: 'txn-test-2', value: 'second', timestamp: new Date() };
    await coll2.insertOne(doc2, { session });
    console.log('✅ Inserted document 2');
    
    // Commit transaction
    await session.commitTransaction();
    console.log('✅ Transaction committed');
    
    // Verify both documents exist
    const found1 = await coll1.findOne({ _id: 'txn-test-1' });
    const found2 = await coll2.findOne({ _id: 'txn-test-2' });
    
    if (found1 && found2) {
      console.log('✅ Both documents found after commit');
    } else {
      throw new Error('Documents not found after commit!');
    }
    
    // Test rollback
    console.log('\nTesting transaction rollback...');
    session.startTransaction();
    
    const doc3 = { _id: 'txn-test-rollback', value: 'should_rollback' };
    await coll1.insertOne(doc3, { session });
    console.log('✅ Inserted test document');
    
    await session.abortTransaction();
    console.log('✅ Transaction aborted');
    
    // Verify document does not exist
    const foundRollback = await coll1.findOne({ _id: 'txn-test-rollback' });
    if (!foundRollback) {
      console.log('✅ Document not found after rollback (correct behavior)');
    } else {
      throw new Error('Document exists after rollback (incorrect!)');
    }
    
    console.log('\n✅ All transaction tests passed!');
    
  } finally {
    await session.endSession();
  }
}

main();
