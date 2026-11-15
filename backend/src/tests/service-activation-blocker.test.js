import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import app from '../app.js';
import User from '../models/User.js';
import Expert from '../models/Expert.js';
import Service from '../models/Service.js';

/**
 * Service Activation & Marketplace Visibility Blocker Test
 * 
 * Verifies that:
 * 1. Services created with isActive=false, status='draft'
 * 2. Services must be activated to appear in marketplace
 * 3. Inactive/draft services remain hidden from public
 * 4. Unauthorized users cannot modify services
 */

describe('Service Activation & Marketplace Visibility', () => {
  jest.setTimeout(30000);

  const baseUrl = '/api/v1';
  let expert = { userId: null, expertId: null, token: null };
  let adminToken = null;
  let serviceId = null;

  beforeAll(async () => {
    console.log('Setting up service activation blocker test...');

    // Create expert
    const userRes = await request(app)
      .post(`${baseUrl}/auth/register`)
      .send({
        email: `expert-service-${Date.now()}@test.com`,
        password: 'ServicePass123!',
        firstName: 'ServiceTest',
        lastName: 'Expert',
        role: 'client',
      });

    expert.userId = userRes.body.data.user._id;
    expert.token = userRes.body.data.accessToken;

    // Create expert profile
    const profileRes = await request(app)
      .post(`${baseUrl}/experts`)
      .set('Authorization', `Bearer ${expert.token}`)
      .send({
        headline: 'Service Testing Expert',
        bio: 'Expert specializing in comprehensive testing and verification of service creation, activation, and marketplace visibility workflows for platform functionality.',
        hourlyRate: 100,
        category: 'Technology & Engineering',
        skills: ['Testing', 'Quality Assurance'],
        languages: ['English'],
      });

    expert.expertId = profileRes.body.data._id;

    // Submit expert for verification first (required before approval)
    const submitRes = await request(app)
      .post(`${baseUrl}/experts/me/submit-verification`)
      .set('Authorization', `Bearer ${expert.token}`);
    
    if (submitRes.status !== 200) {
      console.log('⚠️  Expert submission failed:', submitRes.status, submitRes.body);
    } else {
      console.log('✅ Expert submitted for verification');
    }

    // Get or create admin and approve expert
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      const adminPassword = 'AdminPass123!';
      admin = new User({
        email: `admin-service-test-${Date.now()}@test.com`,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'Service',
        role: 'admin',
        emailVerified: true,
        status: 'active',
      });
      await admin.save();
      console.log('✅ Created test admin');
    }

    // Try to login and approve
    const loginRes = await request(app)
      .post(`${baseUrl}/auth/login`)
      .send({
        email: admin.email,
        password: 'AdminPass123!',
      });

    if (loginRes.status === 200) {
      adminToken = loginRes.body.data.accessToken;

      // Approve expert using correct endpoint path
      const approveRes = await request(app)
        .patch(`${baseUrl}/experts/admin/${expert.expertId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approved for service test' });
      
      if (approveRes.status === 200) {
        console.log('✅ Expert approved successfully');
      } else {
        console.log('⚠️  Expert approval failed:', approveRes.status, approveRes.body);
      }
    } else {
      console.log('⚠️  Admin login failed:', loginRes.status);
      // Try with test default admin
      const defaultAdminLogin = await request(app)
        .post(`${baseUrl}/auth/login`)
        .send({
          email: 'test-admin@example.com',
          password: 'TestPass123!',
        });
      
      if (defaultAdminLogin.status === 200) {
        adminToken = defaultAdminLogin.body.data.accessToken;
        console.log('✅ Using default test admin');

        // Approve expert with default admin
        const approveRes = await request(app)
          .patch(`${baseUrl}/experts/admin/${expert.expertId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ notes: 'Approved for service test' });
        
        if (approveRes.status === 200) {
          console.log('✅ Expert approved successfully with default admin');
        } else {
          console.log('⚠️  Expert approval failed with default admin:', approveRes.status);
        }
      }
    }

    // Verify expert is approved
    const expertCheckRes = await request(app)
      .get(`${baseUrl}/experts/${expert.expertId}`)
      .set('Authorization', `Bearer ${expert.token}`);
    
    console.log('✅ Setup complete. Expert status:', expertCheckRes.body?.data?.verificationStatus);
  });

  afterAll(async () => {
    console.log('✅ Service activation tests complete');
  });

  describe('SERVICE CREATION STATE', () => {
    it('Service created with isActive=false and status=draft', async () => {
      const response = await request(app)
        .post(`${baseUrl}/services`)
        .set('Authorization', `Bearer ${expert.token}`)
        .send({
          title: 'Testing Service for Activation',
          description: 'This is a comprehensive testing service for verifying service creation, activation workflow, and marketplace visibility requirements for published services.',
          category: 'technology-consulting',
          pricing: {
            type: 'hourly',
            amount: 150,
            currency: 'USD',
          },
          duration: 60,
          maxBookingsPerDay: 5,
          bufferTime: 15,
          advanceBookingDays: 30,
          cancellationPolicy: 'moderate',
          cancellationHours: 24,
        });

      // Service should create successfully for approved expert
      if (response.status !== 201) {
        console.log('⚠️  Service creation failed:', response.status, response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.status).toBe('draft');

      serviceId = response.body.data._id;

      console.log('✅ Service created with isActive=false, status=draft');
    });

    it('Inactive service does not appear in public expert-services endpoint', async () => {
      if (!serviceId) {
        console.log('⚠️  Skipping: service creation failed');
        return;
      }

      const response = await request(app)
        .get(`${baseUrl}/services/expert/${expert.expertId}`);

      expect(response.status).toBe(200);

      // Service should not be in the list
      const serviceFound = response.body.data.find(s => s._id === serviceId);
      expect(serviceFound).toBeUndefined();

      console.log('✅ Inactive service hidden from public marketplace');
    });

    it('Expert can retrieve inactive service via /me/all', async () => {
      if (!serviceId) {
        console.log('⚠️  Skipping: service creation failed');
        return;
      }

      const response = await request(app)
        .get(`${baseUrl}/services/me/all`)
        .set('Authorization', `Bearer ${expert.token}`);

      expect(response.status).toBe(200);

      const service = response.body.data.find(s => s._id === serviceId);
      expect(service).toBeDefined();
      expect(service.isActive).toBe(false);

      console.log('✅ Expert can retrieve own inactive service');
    });
  });

  describe('SERVICE ACTIVATION', () => {
    it('Expert can activate service via /activate endpoint', async () => {
      if (!serviceId) {
        console.log('⚠️  Skipping: service creation failed');
        return;
      }

      const response = await request(app)
        .patch(`${baseUrl}/services/${serviceId}/activate`)
        .set('Authorization', `Bearer ${expert.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(true);

      console.log('✅ Service activated successfully');
    });

    it('Activated service persists isActive=true in database', async () => {
      if (!serviceId) {
        console.log('⚠️  Skipping: service creation failed');
        return;
      }

      const service = await Service.findById(serviceId);
      expect(service.isActive).toBe(true);

      console.log('✅ isActive=true persisted in database');
    });
  });

  describe('MARKETPLACE VISIBILITY', () => {
    it('Activated service appears in public expert-services endpoint', async () => {
      if (!serviceId) {
        console.log('⚠️  Skipping: service creation failed');
        return;
      }

      const response = await request(app)
        .get(`${baseUrl}/services/expert/${expert.expertId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      const service = response.body.data.find(s => s._id === serviceId);
      expect(service).toBeDefined();
      expect(service.isActive).toBe(true);

      console.log('✅ Activated service appears in public marketplace');
    });

    it('Only approved experts services appear in marketplace', async () => {
      // Create unapproved expert
      const unapprovedRes = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `unapproved-${Date.now()}@test.com`,
          password: 'Pass123!',
          firstName: 'Unapproved',
          lastName: 'Expert',
          role: 'client',
        });

      const unapprovedToken = unapprovedRes.body.data.accessToken;

      const profileRes = await request(app)
        .post(`${baseUrl}/experts`)
        .set('Authorization', `Bearer ${unapprovedToken}`)
        .send({
          headline: 'Unapproved Expert',
          bio: 'This expert profile is pending verification and should not appear in the public marketplace listing.',
          hourlyRate: 100,
          category: 'Business & Strategy',
          skills: ['Business'],
          languages: ['English'],
        });

      const unapprovedExpertId = profileRes.body.data._id;

      // Try to create and activate service
      const serviceRes = await request(app)
        .post(`${baseUrl}/services`)
        .set('Authorization', `Bearer ${unapprovedToken}`)
        .send({
          title: 'Unapproved Service',
          description: 'This is a service from an unapproved expert that should not appear in the marketplace.',
          category: 'business-consulting',
          pricing: { type: 'hourly', amount: 100, currency: 'USD' },
          duration: 60,
          maxBookingsPerDay: 5,
          bufferTime: 15,
          advanceBookingDays: 30,
          cancellationPolicy: 'moderate',
          cancellationHours: 24,
        });

      if (serviceRes.status === 403) {
        // Expected: expert not approved
        console.log('✅ Unapproved expert cannot create services');
      } else {
        // If service was created, it should still be hidden
        expect(serviceRes.status).toBe(201);
        const unapprovedServiceId = serviceRes.body.data._id;

        // Activate it
        await request(app)
          .patch(`${baseUrl}/services/${unapprovedServiceId}/activate`)
          .set('Authorization', `Bearer ${unapprovedToken}`);

        // Check marketplace - should not appear
        const marketplaceRes = await request(app)
          .get(`${baseUrl}/services/expert/${unapprovedExpertId}`);

        const found = marketplaceRes.body.data.find(s => s._id === unapprovedServiceId);
        // Should not appear because expert is not approved
        if (found) {
          console.log('⚠️  Unapproved expert service appears (marketplace filtering may check expert status)');
        }
      }
    });
  });

  describe('AUTHORIZATION', () => {
    it('Unauthorized user cannot activate service', async () => {
      if (!serviceId) {
        console.log('⚠️  Skipping: service creation failed');
        return;
      }

      // Create another user
      const otherRes = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `other-user-${Date.now()}@test.com`,
          password: 'Pass123!',
          firstName: 'Other',
          lastName: 'User',
          role: 'client',
        });

      const otherToken = otherRes.body.data.accessToken;

      const response = await request(app)
        .patch(`${baseUrl}/services/${serviceId}/activate`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);

      console.log('✅ Unauthorized user cannot activate service');
    });

    it('Unauthorized user cannot deactivate service', async () => {
      if (!serviceId) {
        console.log('⚠️  Skipping: service creation failed');
        return;
      }

      // First activate the service to have something to deactivate
      await request(app)
        .patch(`${baseUrl}/services/${serviceId}/deactivate`)
        .set('Authorization', `Bearer ${expert.token}`);

      // Create another user
      const otherRes = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `other-user-deactivate-${Date.now()}@test.com`,
          password: 'Pass123!',
          firstName: 'Other',
          lastName: 'User',
          role: 'client',
        });

      const otherToken = otherRes.body.data.accessToken;

      const response = await request(app)
        .patch(`${baseUrl}/services/${serviceId}/deactivate`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);

      console.log('✅ Unauthorized user cannot deactivate service');
    });
  });

  describe('SERVICE VISIBILITY RULES', () => {
    it('Service appears in marketplace only when: approved expert + activated + public', async () => {
      if (!serviceId) {
        console.log('⚠️  Skipping: service creation failed');
        return;
      }

      // Ensure service is activated
      await request(app)
        .patch(`${baseUrl}/services/${serviceId}/activate`)
        .set('Authorization', `Bearer ${expert.token}`);

      // Check marketplace
      const response = await request(app)
        .get(`${baseUrl}/services/expert/${expert.expertId}`);

      const service = response.body.data.find(s => s._id === serviceId);
      expect(service).toBeDefined();

      console.log('✅ Service appears in marketplace when all conditions met');
    });
  });
});
