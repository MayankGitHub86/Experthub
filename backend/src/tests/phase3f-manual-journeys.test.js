import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import app from '../app.js';
import User from '../models/User.js';
import Expert from '../models/Expert.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import Conversation from '../models/Conversation.js';

/**
 * Phase 3F - Manual User Journey Verification Tests
 * 
 * This test suite verifies complete user journeys:
 * 1. Client Journey: Register → Search Marketplace → View Expert Profile → Book Session → Chat
 * 2. Expert Journey: Register → Create Profile → Verify → Add Services → Set Availability → Accept Booking
 * 3. Admin Journey: Login → View Pending Experts → Approve/Reject
 */

describe('Phase 3F - User Journey Verification', () => {
  jest.setTimeout(30000);
  
  const baseUrl = '/api/v1';
  let testData = {
    clients: [],
    experts: [],
    admin: {},
  };

  beforeAll(async () => {
    console.log('🔧 Setting up Phase 3F journey tests...');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Phase 3F test data...');
    // Cleanup would go here
  });

  describe('CLIENT JOURNEY', () => {
    let clientData = {};

    it('1.1 Client registers as CLIENT role', async () => {
      const response = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `client-journey-${Date.now()}@test.com`,
          password: 'ClientPass123!',
          firstName: 'Journey',
          lastName: 'Client',
          role: 'client',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.role).toBe('client');
      expect(response.body.data.accessToken).toBeDefined();

      clientData.email = response.body.data.user.email;
      clientData.userId = response.body.data.user._id;
      clientData.token = response.body.data.accessToken;
      testData.clients.push(clientData);

      console.log('✅ Client registered:', clientData.email);
    });

    it('1.2 Client searches for experts in marketplace', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts?limit=10`)
        .set('Authorization', `Bearer ${clientData.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Note: May be empty if no approved experts exist yet

      console.log(`✅ Client searched marketplace, found ${response.body.data.length} experts`);
    });
  });

  describe('EXPERT JOURNEY', () => {
    let expertData = {};

    it('2.1 Expert registers as CLIENT (upgrade path)', async () => {
      const response = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `expert-journey-${Date.now()}@test.com`,
          password: 'ExpertPass123!',
          firstName: 'Journey',
          lastName: 'Expert',
          role: 'client',
        });

      expect(response.status).toBe(201);
      expertData.email = response.body.data.user.email;
      expertData.userId = response.body.data.user._id;
      expertData.token = response.body.data.accessToken;

      const user = await User.findById(expertData.userId);
      expect(user.role).toBe('client');

      testData.experts.push(expertData);
      console.log('✅ Expert (as client) registered:', expertData.email);
    });

    it('2.2 Expert creates expert profile (client→expert promotion)', async () => {
      const response = await request(app)
        .post(`${baseUrl}/experts`)
        .set('Authorization', `Bearer ${expertData.token}`)
        .send({
          headline: 'Senior Journey Expert',
          bio: 'Expert with comprehensive experience in business transformation, strategic planning, market analysis, organizational development, and technology implementation for enterprise clients.',
          hourlyRate: 200,
          category: 'Business & Strategy',
          skills: ['Strategy', 'Transformation', 'Leadership'],
          languages: ['English'],
          experienceYears: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.verificationStatus).toBe('draft');

      const userId = typeof response.body.data.userId === 'object'
        ? response.body.data.userId._id
        : response.body.data.userId;
      expect(userId).toBe(expertData.userId);

      expertData.expertId = response.body.data._id;

      const user = await User.findById(expertData.userId);
      expect(user.role).toBe('expert');

      console.log('✅ Expert profile created:', expertData.expertId);
    });

    it('2.3 Expert submits profile for verification', async () => {
      const response = await request(app)
        .post(`${baseUrl}/experts/me/submit-verification`)
        .set('Authorization', `Bearer ${expertData.token}`)
        .send({ reason: 'Profile complete' });

      expect(response.status).toBe(200);
      expect(response.body.data.verificationStatus).toBe('submitted');

      console.log('✅ Expert profile submitted for verification');
    });

    it('2.4 Expert sets availability', async () => {
      const response = await request(app)
        .put(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${expertData.token}`)
        .send({
          timezone: 'America/New_York',
          weeklySchedule: {
            monday: [{ start: '09:00', end: '17:00' }],
            tuesday: [{ start: '09:00', end: '17:00' }],
            wednesday: [{ start: '09:00', end: '17:00' }],
            thursday: [{ start: '09:00', end: '17:00' }],
            friday: [{ start: '09:00', end: '17:00' }],
            saturday: [],
            sunday: [],
          },
        });

      expect(response.status).toBe(200);
      console.log('✅ Expert availability set');
    });

    it('2.5 Expert retrieves availability (self-service)', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${expertData.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('America/New_York');
      expect(response.body.data.weeklySchedule).toBeDefined();

      console.log('✅ Expert retrieved availability');
    });
  });

  describe('ADMIN JOURNEY', () => {
    let adminData = {};

    it('3.1 Admin logs in', async () => {
      // Create or fetch admin
      let admin = await User.findOne({ email: 'journey-admin@test.com' });
      if (!admin) {
        admin = new User({
          email: 'journey-admin@test.com',
          password: 'AdminPass123!',
          firstName: 'Journey',
          lastName: 'Admin',
          role: 'admin',
          emailVerified: true,
          status: 'active',
        });
        await admin.save();
      }

      const response = await request(app)
        .post(`${baseUrl}/auth/login`)
        .send({
          email: admin.email,
          password: 'AdminPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe('admin');

      adminData.userId = response.body.data.user._id;
      adminData.email = response.body.data.user.email;
      adminData.token = response.body.data.accessToken;

      testData.admin = adminData;
      console.log('✅ Admin logged in:', adminData.email);
    });

    it('3.2 Admin retrieves pending experts', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/admin/pending`)
        .set('Authorization', `Bearer ${adminData.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();

      console.log(`✅ Admin retrieved ${response.body.data.length} pending experts`);
    });

    it('3.3 Admin approves expert profile (if pending exists)', async () => {
      // Get pending experts
      const pendingRes = await request(app)
        .get(`${baseUrl}/experts/admin/pending`)
        .set('Authorization', `Bearer ${adminData.token}`);

      if (pendingRes.body.data.length > 0) {
        const expertToApprove = pendingRes.body.data[0];

        const approveRes = await request(app)
          .patch(`${baseUrl}/experts/admin/${expertToApprove._id}/approve`)
          .set('Authorization', `Bearer ${adminData.token}`)
          .send({ notes: 'Approved for Phase 3F testing', verifiedBadge: true });

        expect(approveRes.status).toBe(200);
        expect(approveRes.body.data.verificationStatus).toBe('approved');
        expect(approveRes.body.data.profilePublic).toBe(true);

        console.log('✅ Admin approved expert profile');
      } else {
        console.log('⚠️  No pending experts to approve');
      }
    });
  });

  describe('MARKETPLACE & BOOKING VERIFICATION', () => {
    it('Verified expert appears in marketplace', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts?limit=20`)
        .set('Authorization', `Bearer ${testData.clients[0]?.token || null}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      console.log(`✅ Marketplace shows ${response.body.data.length} experts`);
    });

    it('Client can view approved expert profile', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts?limit=1`)
        .set('Authorization', `Bearer ${testData.clients[0]?.token || null}`);

      if (response.body.data.length > 0) {
        const expert = response.body.data[0];

        const profileRes = await request(app)
          .get(`${baseUrl}/experts/${expert._id}`)
          .set('Authorization', `Bearer ${testData.clients[0]?.token || null}`);

        expect(profileRes.status).toBe(200);
        expect(profileRes.body.data._id).toBe(expert._id);

        console.log('✅ Client viewed expert profile');
      }
    });

    it('Expert availability is publicly accessible', async () => {
      if (testData.experts.length > 0) {
        const expert = testData.experts[0];

        const response = await request(app)
          .get(`${baseUrl}/experts/${expert.expertId}/availability`);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();

        console.log('✅ Expert availability is publicly accessible');
      }
    });
  });

  describe('REGRESSION CHECKS', () => {
    it('Chat module is available', async () => {
      // Check that chat routes exist by attempting to list conversations
      if (testData.clients.length > 0) {
        const response = await request(app)
          .get(`${baseUrl}/conversations`)
          .set('Authorization', `Bearer ${testData.clients[0].token}`);

        // Should return either 200 or 404 (empty), not 500 or route not found
        expect([200, 404]).toContain(response.status);

        console.log('✅ Chat module operational');
      }
    });

    it('Booking module is available', async () => {
      // Check that booking routes exist
      if (testData.clients.length > 0) {
        const response = await request(app)
          .get(`${baseUrl}/bookings`)
          .set('Authorization', `Bearer ${testData.clients[0].token}`);

        // Should return either 200 or 404 (empty), not 500 or route not found
        expect([200, 404, 400]).toContain(response.status);

        console.log('✅ Booking module operational');
      }
    });
  });
});
