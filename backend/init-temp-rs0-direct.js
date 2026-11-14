#!/usr/bin/env node
/**
 * Initialize temporary MongoDB replica set rs0 on port 27018 - Direct connection
 */

import mongoose from 'mongoose';

// Try multiple connection URIs
const uris = [
  'mongodb://127.0.0.1:27018/admin',
  'mongodb://localhost:27018/admin',
  'mongodb://0.0.0.0:27018/admin',
];

async function tryConnection(uri) {
  console.log(`Attempting connection to: ${uri}`);
  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✓ Connected successfully');
    return connection;
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
    return null;
  }
}

async function main() {
  let connection = null;
  
  for (const uri of uris) {
    connection = await tryConnection(uri);
    if (connection) break;
  }

  if (!connection) {
    console.error('❌ Could not connect to MongoDB on port 27018');
    process.exit(1);
  }

  try {
    const adminDb = mongoose.connection.getClient().db('admin');
    
    // Test basic connection
    console.log('\nTesting connection...');
    const ping = await adminDb.admin().ping();
    console.log('✓ Ping succeeded:', ping);

    // Try to initialize replica set
    console.log('\nInitializing replica set rs0...');
    const result = await adminDb.admin().command({
      replSetInitiate: {
        _id: 'rs0',
        members: [
          { _id: 0, host: 'localhost:27018' }
        ]
      }
    });

    console.log('✓ replSetInitiate executed');
    console.log('  Result:', JSON.stringify(result, null, 2));

    // Wait for election
    console.log('Waiting for PRIMARY election (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check status
    console.log('\nChecking replica set status...');
    const status = await adminDb.admin().replSetGetStatus();
    
    console.log('✓ Replica set status:');
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

    const hasPrimary = status.members.some(m => m.state === 1);
    if (hasPrimary) {
      console.log('\n✅ PRIMARY elected!');
    } else {
      console.log('\n⚠ Still waiting for PRIMARY...');
    }

    // Test hello
    console.log('\nVerifying with hello command...');
    const hello = await adminDb.admin().command({ hello: 1 });
    
    console.log(`  setName: ${hello.setName}`);
    console.log(`  isWritablePrimary: ${hello.isWritablePrimary}`);
    
    if (hello.setName === 'rs0' && hello.isWritablePrimary) {
      console.log('\n✅ Replica set rs0 ready for transactions!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
