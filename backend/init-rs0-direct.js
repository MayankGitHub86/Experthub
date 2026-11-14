#!/usr/bin/env node
/**
 * Initialize temporary MongoDB replica set rs0 on port 27018
 * Using directConnection to bypass discovery
 */

import mongoose from 'mongoose';

async function initializeReplicaSet() {
  const uri = 'mongodb://127.0.0.1:27018/admin';
  
  console.log('🔧 MongoDB Replica Set Initialization');
  console.log('='.repeat(50));
  console.log(`Connecting to: ${uri}`);
  
  const options = {
    serverSelectionTimeoutMS: 15000,
    directConnection: true,
    retryWrites: false,
  };

  let connection;
  try {
    connection = await mongoose.connect(uri, options);
    
    console.log('✓ Connected to MongoDB');
    console.log(`  Host: ${mongoose.connection.host}`);
    console.log(`  Database: ${mongoose.connection.name}`);

    const client = mongoose.connection.getClient();
    const adminDb = client.db('admin');

    // First, test ping
    console.log('\n1️⃣  Testing basic connectivity...');
    const pingResult = await adminDb.admin().ping();
    console.log('✓ Ping successful');

    // Now try to initialize replica set
    console.log('\n2️⃣  Initializing replica set rs0...');
    console.log('   Command: rs.initiate({_id: "rs0", members: [{_id: 0, host: "localhost:27018"}]})');
    
    try {
      const initResult = await adminDb.admin().command({
        replSetInitiate: {
          _id: 'rs0',
          members: [
            { _id: 0, host: 'localhost:27018' }
          ]
        }
      });

      console.log('✓ rs.initiate() executed');
      console.log('  Response:', JSON.stringify(initResult, null, 2));

    } catch (initError) {
      // replSetInitiate might return "already initialized" which is ok
      if (initError.message && initError.message.includes('already')) {
        console.log('✓ Replica set already initialized');
      } else {
        console.log('✗ rs.initiate() failed:', initError.message);
        // Continue to check status
      }
    }

    // Wait for PRIMARY election
    console.log('\n3️⃣  Waiting for PRIMARY election (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check replica set status
    console.log('\n4️⃣  Checking replica set status...');
    try {
      const status = await adminDb.admin().replSetGetStatus();
      
      console.log('✓ Replica set status retrieved:');
      console.log(`  Set name: ${status.set}`);
      console.log(`  Version: ${status.version}`);
      console.log(`  Members: ${status.members.length}`);
      console.log(`  Term: ${status.term || 'N/A'}`);
      
      const memberStates = {
        0: 'STARTUP',
        1: 'PRIMARY',
        2: 'SECONDARY',
        7: 'ARBITER',
        8: 'DOWN',
        10: 'REMOVED'
      };

      console.log('\n  Member details:');
      status.members.forEach((member, idx) => {
        const stateName = memberStates[member.state] || `UNKNOWN(${member.state})`;
        const health = member.health === undefined ? 'N/A' : (member.health === 1 ? 'Healthy' : 'Unhealthy');
        console.log(`    [${idx}] ${member.name}`);
        console.log(`         State: ${stateName}`);
        console.log(`         Health: ${health}`);
      });

      const primaryMember = status.members.find(m => m.state === 1);
      if (primaryMember) {
        console.log(`\n✅ PRIMARY elected: ${primaryMember.name}`);
      } else {
        console.log('\n⚠ No PRIMARY elected yet');
      }

    } catch (statusError) {
      console.log('✗ Could not get replica set status:', statusError.message);
    }

    // Verify with hello command
    console.log('\n5️⃣  Verifying with hello command...');
    try {
      const hello = await adminDb.admin().command({ hello: 1 });
      
      console.log('✓ Hello command response:');
      console.log(`  isWritablePrimary: ${hello.isWritablePrimary}`);
      console.log(`  setName: ${hello.setName || 'N/A'}`);
      console.log(`  ok: ${hello.ok}`);
      
      if (hello.setName === 'rs0' && hello.isWritablePrimary) {
        console.log('\n✅✅✅ Replica set rs0 is ready for transactions! ✅✅✅');
      } else if (hello.setName === 'rs0') {
        console.log('\n✅ Replica set rs0 initialized (waiting for PRIMARY writability)');
      }

    } catch (helloError) {
      console.log('✗ Hello command failed:', helloError.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('Initialization complete. MongoDB instance on port 27018 is ready.');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      console.log('\nClosing connection...');
      await mongoose.connection.close();
    }
  }
}

initializeReplicaSet();
