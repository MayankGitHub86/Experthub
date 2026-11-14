#!/usr/bin/env node
/**
 * Seed test data for Phase 3C frontend booking workflow testing
 * Creates:
 * - Test client users
 * - Test expert users with approved profiles
 * - Test services
 * - Test availability
 */

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { User, Expert, Service } from './src/models/index.js';
import connectDB from './src/config/database.js';
import { logger } from './src/utils/logger.js';

const TEST_PASSWORD = 'Test123!@#';
const PASSWORD_HASH = await bcryptjs.hash(TEST_PASSWORD, 10);

async function main() {
  try {
    // Connect to test database
    const testUri = 'mongodb://localhost:27018/experthub_test?directConnection=true&retryWrites=true&w=majority';
    await mongoose.connect(testUri);
    logger.info('✅ Connected to test database');

    // Create test client
    const clientEmail = `test-client-${Date.now()}@experthub.com`;
    const client = await User.create({
      email: clientEmail,
      password: PASSWORD_HASH,
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',
      status: 'active',
    });
    logger.info(`✅ Created test client: ${client.email}`);

    // Create test expert user
    const expertEmail = `test-expert-${Date.now()}@experthub.com`;
    const expertUser = await User.create({
      email: expertEmail,
      password: PASSWORD_HASH,
      firstName: 'Test',
      lastName: 'Expert',
      role: 'expert',
      status: 'active',
    });
    logger.info(`✅ Created test expert user: ${expertUser.email}`);

    // Create expert profile with availability
    const expert = await Expert.create({
      userId: expertUser._id,
      headline: 'Phase 3C Test Expert - Web Development',
      bio: 'Experienced web developer specialized in React, Node.js, and full-stack development. Available for consultations on modern web development practices, architectural decisions, and best practices. Over 10 years of professional experience.',
      skills: ['React', 'Node.js', 'MongoDB', 'Web Development'],
      category: 'Technology & Engineering',
      hourlyRate: 100,
      languages: ['English'],
      verificationStatus: 'approved',
      acceptingBookings: true,
      availability: {
        timezone: 'UTC',
        weeklySchedule: {
          monday: [
            { start: '09:00', end: '17:00' },
            { start: '18:00', end: '20:00' },
          ],
          tuesday: [
            { start: '09:00', end: '17:00' },
            { start: '18:00', end: '20:00' },
          ],
          wednesday: [
            { start: '09:00', end: '17:00' },
            { start: '18:00', end: '20:00' },
          ],
          thursday: [
            { start: '09:00', end: '17:00' },
            { start: '18:00', end: '20:00' },
          ],
          friday: [
            { start: '09:00', end: '17:00' },
            { start: '18:00', end: '20:00' },
          ],
          saturday: [
            { start: '10:00', end: '14:00' },
          ],
          sunday: [],
        },
        bufferMinutes: 15,
        exceptions: [],
      },
    });
    logger.info(`✅ Created expert profile: ${expert._id}`);

    // Create test service
    const service = await Service.create({
      expertId: expert._id,
      title: 'Web Development Consultation',
      description: 'One-on-one consultation on web development best practices, architecture, and technical guidance for your projects.',
      category: 'technology-consulting',
      deliveryMethod: 'video_call',
      duration: 60, // 60 minutes
      pricing: {
        amount: 100,
        currency: 'USD',
      },
      isActive: true,
      status: 'approved',
    });
    logger.info(`✅ Created service: ${service._id}`);

    logger.info('\n====== TEST DATA CREATED ======');
    logger.info(`Client Email:   ${client.email}`);
    logger.info(`Client Password: ${TEST_PASSWORD}`);
    logger.info(`Expert Email:   ${expertUser.email}`);
    logger.info(`Expert Password: ${TEST_PASSWORD}`);
    logger.info(`Expert ID:      ${expert._id}`);
    logger.info(`Service ID:     ${service._id}`);
    logger.info('================================\n');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
