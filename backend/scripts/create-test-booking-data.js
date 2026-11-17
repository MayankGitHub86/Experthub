#!/usr/bin/env node

import mongoose from 'mongoose';
import { User, Expert, Service } from '../src/models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/experthub_test?directConnection=true&retryWrites=true&w=majority';

async function setupTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create a test user (expert)
    console.log('📝 Creating test expert user...');
    
    const expertUser = await User.create({
      email: `expert-booking-test-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'BookingTest',
      lastName: 'Expert',
      role: 'expert',
      emailVerified: true,
    });
    console.log('✅ Created expert user:', expertUser._id);

    // Create expert profile
    console.log('📝 Creating expert profile...');
    const expert = await Expert.create({
      userId: expertUser._id,
      headline: 'Expert for Booking Tests',
      bio: 'This expert is set up for testing the complete booking flow. Comprehensive expertise in consultation and business strategy with proven track record.',
      hourlyRate: 150,
      company: 'Test Company',
      experienceYears: 8,
      skills: ['Testing', 'Consultation', 'Strategy'],
      languages: ['English'],
      category: 'Technology & Engineering',
      verificationStatus: 'approved',
      verifiedBadge: true,
      profilePublic: true,
      acceptingBookings: true,
    });
    console.log('✅ Created expert profile:', expert._id);

    // Create services for the expert
    console.log('📝 Creating services...');
    
    const services = await Service.create([
      {
        expertId: expert._id,
        title: '30-Minute Strategy Consultation',
        description: 'A focused 30-minute session to discuss your business strategy, market challenges, and growth opportunities. Perfect for quick advice and tactical guidance.',
        duration: 30,
        category: 'business-consulting',
        pricing: {
          amount: 75,
          currency: 'USD',
          type: 'fixed',
        },
        isActive: true,
        status: 'approved',
        tags: ['strategy', 'business', 'consultation'],
      },
      {
        expertId: expert._id,
        title: '60-Minute Deep Dive Session',
        description: 'An in-depth 60-minute consultation ideal for comprehensive business analysis, strategy development, and detailed planning. Great for ongoing mentorship relationships.',
        duration: 60,
        category: 'business-consulting',
        pricing: {
          amount: 150,
          currency: 'USD',
          type: 'fixed',
        },
        isActive: true,
        status: 'approved',
        tags: ['strategy', 'business', 'mentoring'],
      },
      {
        expertId: expert._id,
        title: '90-Minute Executive Coaching',
        description: 'Premium 90-minute executive coaching session covering leadership development, organizational strategy, team building, and executive presence.',
        duration: 90,
        category: 'career-coaching',
        pricing: {
          amount: 225,
          currency: 'USD',
          type: 'fixed',
        },
        isActive: true,
        status: 'approved',
        tags: ['coaching', 'leadership', 'executive'],
      },
    ]);
    
    console.log('✅ Created ' + services.length + ' services');
    
    // FORCE ACTIVATE ALL SERVICES BY DIRECT DB UPDATE
    console.log('📝 Force-activating all services...');
    await Service.updateMany(
      { expertId: expert._id },
      { $set: { isActive: true, status: 'approved' } }
    );
    console.log('✅ All services force-activated');

    console.log('\n🎉 Test booking data setup complete!');
    console.log('\n📋 Expert Details:');
    console.log('   Expert ID:', expert._id);
    console.log('   Name:', expertUser.firstName, expertUser.lastName);
    console.log('   Email:', expertUser.email);
    console.log('   Services: ' + services.length + ' (30min, 60min, 90min) - ALL ACTIVATED');
    console.log('\n📍 To test booking:');
    console.log('   1. Go to http://localhost:5173');
    console.log('   2. Find "' + expertUser.firstName + ' ' + expertUser.lastName + '" expert in the list');
    console.log('   3. Click "Book Consultation"');
    console.log('   4. You should NOW see the 3 services available');
    console.log('   5. Select a service, date, and time to proceed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTestData();
