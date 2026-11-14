/**
 * Initialize MongoDB Replica Set (rs0)
 * 
 * Run this script after starting MongoDB with --replSet rs0
 * It will initialize the single-node replica set if not already configured
 */

import mongoose from 'mongoose';

async function initializeReplicaSet() {
  try {
    console.log('Connecting to MongoDB...');
    const client = mongoose.connection.getClient();
    
    // Give MongoDB a moment to start if it just started
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const db = client.db('admin');
    
    // Check if replica set is already initialized
    console.log('\nChecking replica set status...');
    try {
      const status = await db.admin().command({ replSetGetStatus: 1 });
      console.log('✓ Replica set already initialized:');
      console.log(`  Set: ${status.set}`);
      console.log(`  Members: ${status.members.length}`);
      status.members.forEach((m, i) => {
        const stateMap = { 0: 'STARTUP', 1: 'PRIMARY', 2: 'SECONDARY', 7: 'ARBITER', 10: 'REMOVED' };
        console.log(`    [${i}] ${m.host} - ${stateMap[m.state]} (${m.state})`);
      });
      
      // Check if any member is PRIMARY
      const hasPrimary = status.members.some(m => m.state === 1);
      if (hasPrimary) {
        console.log('\n✓ Replica set is ready!');
        process.exit(0);
      } else {
        console.log('\n⚠ No PRIMARY member. Waiting for election...');
        await waitForPrimary(db);
      }
    } catch (error) {
      if (error.message && error.message.includes('not initialized')) {
        console.log('Replica set not initialized. Initializing now...\n');
        
        const initResult = await db.admin().command({
          replSetInitiate: {
            _id: 'rs0',
            members: [
              { _id: 0, host: 'localhost:27017' }
            ]
          }
        });
        
        console.log('✓ Replica set initialized successfully');
        console.log(`  Response: ${initResult.ok ? 'OK' : 'FAILED'}`);
        
        // Wait for the member to become PRIMARY
        console.log('\nWaiting for PRIMARY member election (this may take 10-30 seconds)...');
        await waitForPrimary(db);
      } else if (error.message && error.message.includes('not running with --replSet')) {
        console.error('\n❌ ERROR: MongoDB is not running with --replSet flag');
        console.error('   Start MongoDB with: mongod --replSet rs0');
        process.exit(1);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during initialization:', error.message);
    process.exit(1);
  }
}

async function waitForPrimary(db, maxAttempts = 60) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await db.admin().command({ replSetGetStatus: 1 });
      
      const primary = status.members.find(m => m.state === 1);
      if (primary) {
        console.log(`\n✓ PRIMARY elected: ${primary.host}`);
        console.log('✓ Replica set is ready for transactions!');
        process.exit(0);
      }
      
      const states = status.members.map(m => {
        const stateMap = { 0: 'STARTUP', 1: 'PRIMARY', 2: 'SECONDARY', 5: 'STARTUP2', 7: 'ARBITER', 10: 'REMOVED' };
        return `${m.host}=${stateMap[m.state]}`;
      }).join(', ');
      
      console.log(`  [${attempt + 1}/${maxAttempts}] ${states}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      if (attempt < 5) {
        console.log(`  [${attempt + 1}/${maxAttempts}] Waiting for replica set to start...`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.error('\n❌ Timeout waiting for PRIMARY election');
  process.exit(1);
}

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/experthub?replicaSet=rs0');
    console.log('✓ Connected to MongoDB');
    await initializeReplicaSet();
  } catch (error) {
    console.error('Connection error:', error.message);
    
    if (error.message.includes('not running with --replSet')) {
      console.error('\n❌ MongoDB is not running with replica set support');
      console.error('   Windows (PowerShell as Admin):');
      console.error('     1. net stop MongoDB');
      console.error('     2. Edit: C:\\Program Files\\MongoDB\\Server\\6.0\\mongod.cfg');
      console.error('     3. Add: replication:\\n        replSetName: rs0');
      console.error('     4. net start MongoDB');
      console.error('     5. Run this script again');
      console.error('\n   Linux/Mac:');
      console.error('     mongod --replSet rs0 --dbpath /path/to/data');
    }
    
    process.exit(1);
  }
}

main();
