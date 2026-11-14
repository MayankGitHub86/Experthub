/**
 * Jest Global Setup
 * 
 * Initializes test environment including database connection
 */

import mongoose from 'mongoose';
import config from './src/config/environment.js';
import connectDB from './src/config/database.js';

// Ensure NODE_ENV is set to test
if (process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
  console.log('⚠️  NODE_ENV was not set to test. Forcing NODE_ENV=test');
}

// Connect to database before tests
beforeAll(async () => {
  console.log(`\n📦 Jest Setup: Connecting to ${config.mongodb.uri}`);
  await connectDB();
  console.log(`✅ Connected to database: ${mongoose.connection.name}\n`);
}, 60000);

// Disconnect after all tests
afterAll(async () => {
  console.log('\n🧹 Jest Teardown: Disconnecting from database');
  await mongoose.connection.close();
  console.log('✅ Database disconnected\n');
}, 30000);
