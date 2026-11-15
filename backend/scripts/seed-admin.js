/**
 * Seed Admin Account for Testing
 * 
 * Usage: NODE_ENV=test node scripts/seed-admin.js
 * 
 * Creates a test admin account for Phase 3E verification.
 * Only run in test environment.
 */

import mongoose from 'mongoose';
import User from '../src/models/User.js';
import config from '../src/config/environment.js';
import { logger } from '../src/utils/logger.js';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB for seeding');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const adminEmail = 'admin@example.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      logger.info('✅ Admin account already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      return;
    }
    
    // Create admin user
    const admin = new User({
      email: adminEmail,
      password: 'AdminPass123', // Requirements: uppercase + lowercase + digit
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      emailVerified: true, // Pre-verify for testing
      status: 'active',
    });
    
    await admin.save();
    
    logger.info('✅ Admin account created');
    console.log(`\nAdmin Credentials:\n  Email: ${admin.email}\n  Password: AdminPass123\n  Role: ${admin.role}`);
  } catch (error) {
    logger.error('Failed to seed admin', error);
    throw error;
  }
};

const main = async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('⚠️  This script should only run in test environment (NODE_ENV=test)');
    process.exit(1);
  }
  
  await connectDB();
  await seedAdmin();
  await mongoose.connection.close();
  logger.info('Seed complete');
  process.exit(0);
};

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
