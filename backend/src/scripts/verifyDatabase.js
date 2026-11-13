import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Expert, Service } from '../models/index.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/experthub';

async function verifyDatabase() {
  console.log('\n🔍 Database Verification Test\n');
  console.log('='.repeat(50));
  
  try {
    // Connect to MongoDB
    console.log('\n1. Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to:', mongoose.connection.db.databaseName);
    
    // Test 1: Count Documents
    console.log('\n2. Testing document counts...');
    const userCount = await User.countDocuments();
    const expertCount = await Expert.countDocuments();
    const serviceCount = await Service.countDocuments();
    console.log(`✅ Users: ${userCount}`);
    console.log(`✅ Experts: ${expertCount}`);
    console.log(`✅ Services: ${serviceCount}`);
    
    // Test 2: Create Test User
    console.log('\n3. Testing CREATE operation...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testUser = await User.create({
      email: testEmail,
      password: 'Test1234!',
      firstName: 'Test',
      lastName: 'User',
      role: 'client',
    });
    console.log(`✅ Created user: ${testUser._id}`);
    
    // Test 3: Read Test User
    console.log('\n4. Testing READ operation...');
    const foundUser = await User.findById(testUser._id);
    console.log(`✅ Found user: ${foundUser.email}`);
    
    // Test 4: Update Test User
    console.log('\n5. Testing UPDATE operation...');
    foundUser.bio = 'Test biography';
    await foundUser.save();
    const updatedUser = await User.findById(testUser._id);
    console.log(`✅ Updated user bio: "${updatedUser.bio}"`);
    
    // Test 5: Delete Test User
    console.log('\n6. Testing DELETE operation...');
    await User.findByIdAndDelete(testUser._id);
    const deletedUser = await User.findById(testUser._id);
    console.log(`✅ Deleted user: ${deletedUser === null}`);
    
    // Test 6: Model Relationships
    console.log('\n7. Testing model relationships...');
    if (expertCount > 0) {
      const expert = await Expert.findOne().populate('userId');
      if (expert) {
        console.log(`✅ Expert population works: ${expert.userId?.email || 'N/A'}`);
      } else {
        console.log('⚠️  No experts to test population');
      }
    } else {
      console.log('⚠️  No experts in database');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL DATABASE TESTS PASSED!\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Database verification failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyDatabase();
