import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../app.js';
import { User, Expert, Service } from '../models/index.js';
import authService from '../modules/auth/auth.service.js';

dotenv.config();

describe('Service Management - Integration Tests', () => {
  let expertUser;
  let expertToken;
  let testExpert;
  let testService;

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
    await User.deleteMany({ email: /service-test/ });
    await Expert.deleteMany({ headline: /Service Test Expert/ });
    await Service.deleteMany({ title: /Service Test/ });
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: /service-test/ });
    await Expert.deleteMany({ headline: /Service Test Expert/ });
    await Service.deleteMany({ title: /Service Test/ });
    
    await mongoose.connection.close();
  }, 30000);

  beforeEach(async () => {
    // Create expert user
    expertUser = await User.create({
      email: `service-test-expert-${Date.now()}@test.com`,
      password: 'Test123!@#',
      firstName: 'Service',
      lastName: 'Expert',
      role: 'client',  // Start as client
      status: 'active',
    });

    // Create expert profile
    testExpert = await Expert.create({
      userId: expertUser._id,
      headline: 'Service Test Expert',
      bio: 'Expert for service management testing. This is a detailed bio with enough content to pass validation requirements and demonstrate expertise.',
      category: 'Business & Strategy',
      hourlyRate: 150,
      skills: ['testing', 'services'],
      languages: ['English'],
      verificationStatus: 'approved',
      acceptingBookings: true,
    });

    // Upgrade user to expert role
    await User.findByIdAndUpdate(expertUser._id, { role: 'expert' });
    expertUser = await User.findById(expertUser._id);
    expertToken = authService.generateAccessToken(expertUser);
  });

  afterEach(async () => {
    // Clean up per-test data
    if (testService) {
      await Service.deleteMany({ _id: testService._id });
      testService = null;
    }
    if (expertUser) {
      await User.deleteMany({ _id: expertUser._id });
      expertUser = null;
    }
  });

  test('should create a new service', async () => {
    const serviceData = {
      title: 'Service Test - Software Consultation',
      description: 'Expert software development and architecture consultation. I will help you design, develop, and deploy scalable systems with comprehensive guidance.',
      category: 'technology-consulting',
      duration: 60,
      pricing: {
        type: 'hourly',
        amount: 150,
        currency: 'USD',
      },
      isActive: true,
    };

    const response = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${expertToken}`)
      .send(serviceData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBeDefined();
    expect(response.body.data.title).toBe(serviceData.title);

    testService = response.body.data;
  });

  test('should retrieve expert services', async () => {
    // Create a service first
    testService = await Service.create({
      expertId: testExpert._id,
      title: 'Service Test - Retrieve Test',
      description: 'A service for testing retrieval. This description has enough content to meet validation requirements.',
      category: 'technology-consulting',
      duration: 60,
      pricing: {
        type: 'hourly',
        amount: 150,
        currency: 'USD',
      },
      isActive: true,
    });

    // Query endpoint - may not require auth or may be public
    const response = await request(app)
      .get(`/api/v1/services/expert/${testExpert._id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    // Should have at least the service we just created
    const foundService = response.body.data.find(s => s._id === testService._id.toString());
    expect(foundService).toBeDefined();
  });

  test('should update a service', async () => {
    // Create a service first
    testService = await Service.create({
      expertId: testExpert._id,
      title: 'Service Test - Original',
      description: 'Original description for update testing. This has sufficient content for validation.',
      category: 'technology-consulting',
      duration: 60,
      pricing: {
        type: 'hourly',
        amount: 150,
        currency: 'USD',
      },
      isActive: true,
    });

    const updates = {
      title: 'Service Test - Updated Title',
      description: 'Updated description. Still with enough content to meet validation requirements for service descriptions.',
      pricing: {
        type: 'hourly',
        amount: 175,
        currency: 'USD',
      },
    };

    const response = await request(app)
      .patch(`/api/v1/services/${testService._id}`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send(updates);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe(updates.title);
    expect(response.body.data.pricing.amount).toBe(updates.pricing.amount);
  });

  test('should activate a service', async () => {
    // Create inactive service
    testService = await Service.create({
      expertId: testExpert._id,
      title: 'Service Test - Activate',
      description: 'Service for testing activation workflow. Contains sufficient content for validation purposes.',
      category: 'technology-consulting',
      duration: 60,
      pricing: {
        type: 'hourly',
        amount: 150,
        currency: 'USD',
      },
      isActive: false,
    });

    const response = await request(app)
      .patch(`/api/v1/services/${testService._id}/activate`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isActive).toBe(true);
  });

  test('should deactivate a service', async () => {
    // Create active service
    testService = await Service.create({
      expertId: testExpert._id,
      title: 'Service Test - Deactivate',
      description: 'Service for testing deactivation workflow. Has sufficient content for validation.',
      category: 'technology-consulting',
      duration: 60,
      pricing: {
        type: 'hourly',
        amount: 150,
        currency: 'USD',
      },
      isActive: true,
    });

    const response = await request(app)
      .patch(`/api/v1/services/${testService._id}/deactivate`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isActive).toBe(false);
  });

  test('should delete a service', async () => {
    // Create a service
    testService = await Service.create({
      expertId: testExpert._id,
      title: 'Service Test - Delete',
      description: 'Service to be deleted in this test. Sufficient content provided for validation.',
      category: 'technology-consulting',
      duration: 60,
      pricing: {
        type: 'hourly',
        amount: 150,
        currency: 'USD',
      },
      isActive: true,
    });

    const serviceId = testService._id;

    const response = await request(app)
      .delete(`/api/v1/services/${serviceId}`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Service may be soft-deleted (still exists but marked inactive/deleted)
    const deletedService = await Service.findById(serviceId);
    expect(deletedService).not.toBeNull();
    // Verify it's deactivated
    expect(deletedService.isActive).toBe(false);
  });
});
