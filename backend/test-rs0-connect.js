#!/usr/bin/env node
/**
 * Test connection to temporary MongoDB on port 27018
 */

import mongoose from 'mongoose';

async function testConnection() {
  const uri = 'mongodb://127.0.0.1:27018/test';
  
  console.log(`Attempting to connect to: ${uri}`);
  
  const options = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    retryWrites: false,
    retryReads: false,
    directConnection: true,  // Force direct connection, don't use discovery
  };

  try {
    console.log('Connecting...');
    const conn = await mongoose.connect(uri, options);
    
    console.log('✓ Connected!');
    console.log(`  Database: ${mongoose.connection.name}`);
    console.log(`  Host: ${mongoose.connection.host}`);
    console.log(`  State: ${mongoose.connection.readyState}`);

    // Get the underlying client
    const client = mongoose.connection.getClient();
    const adminDb = client.db('admin');

    // Ping
    console.log('\nTesting ping...');
    const pingResult = await adminDb.admin().ping();
    console.log('✓ Ping result:', pingResult);

    // Try hello
    console.log('\nTesting hello command...');
    try {
      const hello = await adminDb.admin().command({ hello: 1 });
      console.log('✓ Hello command result:');
      console.log('  setName:', hello.setName);
      console.log('  isWritablePrimary:', hello.isWritablePrimary);
      console.log('  version:', hello.version);
    } catch (e) {
      console.log('✗ Hello command failed:', e.message);
    }

    await mongoose.connection.close();
    
  } catch (error) {
    console.error('✗ Connection error:', error.message);
    process.exit(1);
  }
}

testConnection();
