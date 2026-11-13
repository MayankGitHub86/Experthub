#!/usr/bin/env node

/**
 * Initialize MongoDB Replica Set via Docker
 */

import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  let conn = null;
  
  try {
    console.log('Connecting to MongoDB in Docker...');
    
    // Connect to the Docker MongoDB
    const mongoUri = 'mongodb://localhost:27017/admin';
    
    // Wait for MongoDB to be ready
    for (let i = 0; i < 30; i++) {
      try {
        conn = await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 3000,
        });
        console.log('✅ Connected to MongoDB');
        break;
      } catch (err) {
        process.stdout.write('.');
        await delay(1000);
      }
    }
    
    if (!conn) {
      throw new Error('Could not connect to MongoDB');
    }
    
    const adminDb = mongoose.connection.db.admin();
    
    // Check if replica set is already initialized
    console.log('\n--- Checking replica set status ---');
    let rsStatus;
    try {
      rsStatus = await adminDb.command({ replSetGetStatus: 1 });
      console.log('✅ Replica set already initialized:', rsStatus.set);
    } catch (err) {
      if (err.message.includes('no replset config has been received')) {
        console.log('No replica set configured. Initializing rs0...');
        
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
        
        console.log('Config:', JSON.stringify(initConfig, null, 2));
        
        try {
          const result = await adminDb.command({ replSetInitiate: initConfig });
          console.log('✅ replSetInitiate result:', result);
        } catch (initErr) {
          console.log('initErr:', initErr.message);
          // Might fail if already initializing, that's ok
        }
        
        // Wait for replica set to initialize
        console.log('\nWaiting for replica set to become PRIMARY...');
        for (let i = 0; i < 40; i++) {
          try {
            const status = await adminDb.command({ replSetGetStatus: 1 });
            const primary = status.members.find(m => m.state === 1);
            if (primary) {
              console.log('\n✅ Replica set is PRIMARY');
              rsStatus = status;
              break;
            }
            process.stdout.write('.');
          } catch (err) {
            process.stdout.write('.');
          }
          await delay(500);
        }
        
        if (!rsStatus) {
          throw new Error('Replica set did not initialize within timeout');
        }
      } else {
        throw err;
      }
    }
    
    // Display status
    console.log('\n--- Final Replica Set Status ---');
    rsStatus = await adminDb.command({ replSetGetStatus: 1 });
    console.log('Set Name:', rsStatus.set);
    rsStatus.members.forEach(m => {
      const stateName = ['STARTUP', 'PRIMARY', 'SECONDARY', 'RECOVERING', '', 'STARTUP2', 'UNKNOWN', 'ARBITER', 'DOWN', 'ROLLBACK', 'REMOVED'][m.state];
      console.log(`  [${m._id}] ${m.host} - ${stateName}`);
    });
    
    // Get config
    console.log('\n--- Replica Set Configuration ---');
    const conf = await adminDb.command({ replSetGetConfig: {} });
    console.log(JSON.stringify(conf.config, null, 2));
    
    // Test transaction support
    console.log('\n--- Testing Transaction Support ---');
    const session = mongoose.startSession();
    try {
      session.startTransaction();
      console.log('✅ startTransaction() succeeded - transactions are supported!');
      await session.abortTransaction();
    } catch (err) {
      console.log('❌ Transaction not supported:', err.message);
      throw err;
    } finally {
      await session.endSession();
    }
    
    console.log('\n✅ MongoDB replica set is configured and ready!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.disconnect();
    }
  }
}

main();
