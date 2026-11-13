#!/usr/bin/env node

/**
 * Restart MongoDB with Replica Set Support
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';
import process from 'process';

const execAsync = promisify(exec);

async function main() {
  try {
    console.log('Attempting to shutdown MongoDB gracefully...');
    
    // Connect and shut down MongoDB gracefully
    try {
      const conn = await mongoose.connect('mongodb://localhost:27017/admin', {
        serverSelectionTimeoutMS: 5000,
      });
      
      const adminDb = mongoose.connection.db.admin();
      await adminDb.command({ shutdown: 1 });
      
      await mongoose.disconnect();
    } catch (err) {
      console.log('Could not gracefully shutdown:', err.message);
    }
    
    console.log('Waiting for MongoDB to stop...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Kill any remaining mongod processes
    console.log('Killing any remaining mongod processes...');
    try {
      await execAsync('taskkill /IM mongod.exe /F /T');
      console.log('✅ Killed mongod process');
    } catch (err) {
      console.log('No mongod process to kill or already stopped');
    }
    
    console.log('Waiting before restart...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to find mongod executable
    let mongodPath = 'mongod';
    
    // Try common paths
    const commonPaths = [
      'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
      'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
      'C:\\Program Files (x86)\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
      'C:\\Program Files (x86)\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
    ];
    
    // Check if mongod is in PATH
    try {
      const { stdout } = await execAsync('where mongod');
      if (stdout) {
        mongodPath = stdout.trim().split('\n')[0];
        console.log(`Found mongod at: ${mongodPath}`);
      }
    } catch (err) {
      // Not in PATH, try common installations
      for (const path of commonPaths) {
        try {
          const { stat } = await import('fs').then(m => ({ stat: m.statSync }));
          stat(path);
          mongodPath = path;
          console.log(`Found mongod at: ${mongodPath}`);
          break;
        } catch (e) {
          // Path doesn't exist, try next
        }
      }
    }
    
    console.log(`\nStarting MongoDB with replica set support...`);
    console.log(`Command: ${mongodPath} --replSet rs0 --bind_ip_all\n`);
    
    // Start MongoDB with replica set
    const mongod = spawn(mongodPath, ['--replSet', 'rs0', '--bind_ip_all'], {
      stdio: 'inherit',
      detached: true,
    });
    
    // Detach the process so it continues after script ends
    mongod.unref();
    
    console.log('✅ MongoDB started with replica set support (PID: ' + mongod.pid + ')');
    console.log('\nWaiting for MongoDB to be ready...');
    
    // Wait for MongoDB to start and be connectable
    for (let i = 0; i < 30; i++) {
      try {
        const conn = await mongoose.connect('mongodb://localhost:27017/test', {
          serverSelectionTimeoutMS: 2000,
        });
        await mongoose.disconnect();
        console.log('✅ MongoDB is ready!');
        break;
      } catch (err) {
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n✅ MongoDB has been restarted with replica set support');
    console.log('\nNext step: Run "node scripts/setup-replica-set.js" to initialize the replica set');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
