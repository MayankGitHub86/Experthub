#!/usr/bin/env node
/**
 * Initialize temporary MongoDB replica set rs0 on port 27018
 */

import mongoose from 'mongoose';

const uri = 'mongodb://localhost:27018/admin';

async function initializeReplicaSet() {
  let connection;
  try {
    console.log('Connecting to MongoDB on port 27018...');
    connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    const adminDb = mongoose.connection.getClient().db('admin');
    
    console.log('Initializing replica set rs0...');
    const result = await adminDb.admin().command({
      replSetInitiate: {
        _id: 'rs0',
        members: [
          { _id: 0, host: 'localhost:27018' }
        ]
      }
    });

    console.log('✓ replSetInitiate command executed');
    console.log('  Result:', JSON.stringify(result, null, 2));

    // Wait a moment for PRIMARY election
    console.log('Waiting for PRIMARY election...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check status
    console.log('Checking replica set status...');
    const status = await adminDb.admin().replSetGetStatus();
    
    console.log('\n✓ Replica set status:');
    console.log(`  Set name: ${status.set}`);
    console.log(`  Members: ${status.members.length}`);
    
    const states = {
      0: 'STARTUP',
      1: 'PRIMARY',
      2: 'SECONDARY',
      7: 'ARBITER',
      8: 'DOWN',
      10: 'REMOVED'
    };

    status.members.forEach((member, idx) => {
      const stateStr = states[member.state] || `UNKNOWN(${member.state})`;
      console.log(`    [${idx}] ${member.name} - ${stateStr}`);
    });

    // Verify PRIMARY exists
    const hasPrimary = status.members.some(m => m.state === 1);
    if (hasPrimary) {
      console.log('\n✓ PRIMARY member elected successfully');
    } else {
      console.log('\n⚠ No PRIMARY elected yet (still initializing)');
    }

    // Check hello command
    console.log('\nVerifying with hello command...');
    const hello = await adminDb.admin().command({ hello: 1 });
    
    console.log(`  setName: ${hello.setName}`);
    console.log(`  isWritablePrimary: ${hello.isWritablePrimary}`);
    
    if (hello.isWritablePrimary) {
      console.log('\n✅ Replica set rs0 is ready for transactions!');
    } else {
      console.log('\n⚠ Instance is not yet writable primary');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.connection.close();
    }
  }
}

initializeReplicaSet();
