import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../app.js';
import { User, Expert } from '../models/index.js';
import authService from '../modules/auth/auth.service.js';

dotenv.config();

describe('Expert Management - Integration Tests', () => {
  let clientUser;
  let clientToken;
  let testExpert;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Ensure connected to test database
    const currentDb = mongoose.connection.name;
    const targetDb = 'experthub_test';
    
    if (mongoose.connection.readyState === 0 || currentDb !== targetDb) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      const testDbUri = 'mongodb://localhost:27017/experthub_test?replicaSet=rs0&retryWrites=true&w=majority';
      await mongoose.connect(testDbUri);
    }
    
    // Clean up test data
    await User.deleteMany({ email: /expert-test/ });
    await Expert.deleteMany({ headline: /Expert Test Profile/ });
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: /expert-test/ });
    await Expert.deleteMany({ headline: /Expert Test Profile/ });
    
    // Don't close the connection - it's shared across test suites
    // Each test file should manage its own lifecycle
  }, 30000);

  beforeEach(async () => {
    // Create client user (not expert yet)
    clientUser = await User.create({
      email: `expert-test-client-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',  // User must be client to create expert profile
      status: 'active',
    });
    clientToken = authService.generateAccessToken(clientUser);

    // Create admin user
    adminUser = await User.create({
      email: `expert-test-admin-${Date.now()}@test.com`,
      password: 'Admin123!@#',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
    });
    adminToken = authService.generateAccessToken(adminUser);
  });

  afterEach(async () => {
    // Clean up per-test data
    if (testExpert) {
      await Expert.deleteMany({ _id: testExpert._id });
      testExpert = null;
    }
    if (clientUser) {
      await User.deleteMany({ _id: clientUser._id });
      clientUser = null;
    }
  });

  test('should create an expert profile', async () => {
    const expertData = {
      headline: 'Expert Test Profile - Software Architect',
      bio: 'Experienced software architect with 10+ years in enterprise system design. I specialize in cloud-native architectures, microservices, and scalable system design. I have helped numerous organizations transform their technical infrastructure and improve their development practices.',
      category: 'Technology & Engineering',
      hourlyRate: 150,
      skills: ['software-architecture', 'cloud', 'microservices'],
      languages: ['English', 'Spanish'],
      company: 'TechCorp Inc',
      experienceYears: 10,
    };

    const response = await request(app)
      .post('/api/v1/experts')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(expertData);

    if (response.status !== 201) {
      console.log('Create expert error response:', JSON.stringify(response.body, null, 2));
    }

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBeDefined();
    expect(response.body.data.headline).toBe(expertData.headline);
    // userId in response should match the client user
    const userIdStr = response.body.data.userId;
    expect(userIdStr).toBeDefined();

    testExpert = response.body.data;
    
    // Refresh user and token after role update
    clientUser = await User.findById(clientUser._id);
    clientToken = authService.generateAccessToken(clientUser);
  });

  test('should retrieve expert profile by ID', async () => {
    // Create an expert first
    testExpert = await Expert.create({
      userId: clientUser._id,
      headline: 'Expert Test Profile - Retrieve Test',
      bio: 'Testing expert profile retrieval functionality. This is a comprehensive bio that demonstrates the capabilities and experience of this expert consultant in detail.',
      category: 'Technology & Engineering',
      hourlyRate: 150,
      skills: ['testing'],
      languages: ['English'],
      verificationStatus: 'approved',
      acceptingBookings: true,
    });

    const response = await request(app)
      .get(`/api/v1/experts/${testExpert._id}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(testExpert._id.toString());
    expect(response.body.data.headline).toBe(testExpert.headline);
  });

  test('should update expert profile', async () => {
    // Create an expert first
    testExpert = await Expert.create({
      userId: clientUser._id,
      headline: 'Expert Test Profile - Original',
      bio: 'Original bio for update testing. This provides sufficient detail about the expert professional experience and qualifications',
      category: 'Technology & Engineering',
      hourlyRate: 150,
      skills: ['testing'],
      languages: ['English'],
      verificationStatus: 'draft',
    });
    
    // Upgrade user to expert role and refresh token
    await User.findByIdAndUpdate(clientUser._id, { role: 'expert' });
    clientUser = await User.findById(clientUser._id);
    const updatedToken = authService.generateAccessToken(clientUser);

    const updates = {
      headline: 'Expert Test Profile - Updated Headline',
      bio: 'Updated bio with new information. This comprehensive bio demonstrates updated professional experience and capabilities in great detail.',
      hourlyRate: 175,
      skills: ['testing', 'development'],
    };

    const response = await request(app)
      .patch(`/api/v1/experts/me`)
      .set('Authorization', `Bearer ${updatedToken}`)
      .send(updates);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.headline).toBe(updates.headline);
    expect(response.body.data.hourlyRate).toBe(updates.hourlyRate);
  });

  test('should approve expert by admin', async () => {
    // Create pending expert (not submitted for review)
    testExpert = await Expert.create({
      userId: clientUser._id,
      headline: 'Expert Test Profile - Approval Test',
      bio: 'Expert profile awaiting admin approval for demonstration purposes. This comprehensive biography provides detailed information about the expert qualifications and professional experience.',
      category: 'Technology & Engineering',
      hourlyRate: 150,
      skills: ['testing'],
      languages: ['English'],
      verificationStatus: 'under_review',
    });

    const response = await request(app)
      .patch(`/api/v1/experts/admin/${testExpert._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.verificationStatus).toBe('approved');
  });

  test('should search experts with filters', async () => {
    // Create searchable expert
    testExpert = await Expert.create({
      userId: clientUser._id,
      headline: 'Expert Test Profile - Searchable',
      bio: 'Expert profile designed for search functionality testing. Demonstrates effective search capabilities.',
      category: 'Technology & Engineering',
      hourlyRate: 150,
      skills: ['testing', 'architecture'],
      languages: ['English'],
      verificationStatus: 'approved',
      acceptingBookings: true,
    });

    const response = await request(app)
      .get('/api/v1/experts?category=Technology+%26+Engineering&skills=architecture')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('should toggle expert availability status', async () => {
    // Create active expert
    testExpert = await Expert.create({
      userId: clientUser._id,
      headline: 'Expert Test Profile - Availability Test',
      bio: 'Expert for testing availability status toggles and booking acceptance behavior with comprehensive details. This profile demonstrates how experts manage their availability.',
      category: 'Technology & Engineering',
      hourlyRate: 150,
      skills: ['testing'],
      languages: ['English'],
      verificationStatus: 'approved',
      acceptingBookings: true,
    });
    
    // Upgrade user to expert role and refresh token
    await User.findByIdAndUpdate(clientUser._id, { role: 'expert' });
    clientUser = await User.findById(clientUser._id);
    const updatedToken = authService.generateAccessToken(clientUser);

    const response = await request(app)
      .patch(`/api/v1/experts/me`)
      .set('Authorization', `Bearer ${updatedToken}`)
      .send({ acceptingBookings: false });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.acceptingBookings).toBe(false);
  });

  test('should get current user expert profile', async () => {
    // Create expert for current user
    testExpert = await Expert.create({
      userId: clientUser._id,
      headline: 'Expert Test Profile - Current User',
      bio: 'Expert profile associated with the current authenticated user for self-retrieval testing and verification. This profile demonstrates user authentication and profile management.',
      category: 'Technology & Engineering',
      hourlyRate: 150,
      skills: ['testing'],
      languages: ['English'],
      verificationStatus: 'approved',
    });
    
    // Upgrade user to expert role and refresh token
    await User.findByIdAndUpdate(clientUser._id, { role: 'expert' });
    clientUser = await User.findById(clientUser._id);
    const updatedToken = authService.generateAccessToken(clientUser);

    const response = await request(app)
      .get('/api/v1/experts/me/profile')
      .set('Authorization', `Bearer ${updatedToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(testExpert._id.toString());
  });
});
