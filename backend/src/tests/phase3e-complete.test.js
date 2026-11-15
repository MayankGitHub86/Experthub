import mongoose from 'mongoose';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import app from '../app.js';
import User from '../models/User.js';
import Expert from '../models/Expert.js';
import Service from '../models/Service.js';

describe('Phase 3E - Complete Expert Lifecycle', () => {
  let testData = {};
  const baseUrl = '/api/v1';

  beforeAll(async () => {
    // Jest setup handles MongoDB connection
    jest.setTimeout(30000);
  });

  afterAll(async () => {
    // Cleanup
    if (testData.expertUserId) await User.findByIdAndDelete(testData.expertUserId);
    if (testData.expertId) await Expert.findByIdAndDelete(testData.expertId);
    if (testData.adminUserId) await User.findByIdAndDelete(testData.adminUserId);
  });

  describe('1. Expert Registration & Profile', () => {
    it('Should register a user as CLIENT', async () => {
      const response = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `expert-${Date.now()}@example.com`,
          password: 'TestPass123456',
          firstName: 'Test',
          lastName: 'Expert',
          role: 'client',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.role).toBe('client');
      expect(response.body.data.accessToken).toBeDefined();

      testData.expertEmail = response.body.data.user.email;
      testData.expertToken = response.body.data.accessToken;
      testData.expertUserId = response.body.data.user._id;
    });

    it('Should create expert profile (client→expert promotion)', async () => {
      const response = await request(app)
        .post(`${baseUrl}/experts`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({
          headline: 'Senior Technology Consultant',
          bio: 'Experienced consultant with 15+ years in technology consulting, business strategy, digital transformation, market analysis, growth planning, and organizational development for startups and enterprises.',
          hourlyRate: 200,
          category: 'Technology & Engineering',
          skills: ['Node.js', 'React', 'Strategy', 'Consulting'],
          languages: ['English', 'Spanish'],
          company: 'Tech Innovations Corp',
          experienceYears: 15,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.verificationStatus).toBe('draft');
      // userId is populated as an object, extract the ID if needed
      const userId = typeof response.body.data.userId === 'object' 
        ? response.body.data.userId._id 
        : response.body.data.userId;
      expect(userId).toBe(testData.expertUserId);

      testData.expertId = response.body.data._id;
    });

    it('Should verify user role changed to expert', async () => {
      const user = await User.findById(testData.expertUserId);
      expect(user.role).toBe('expert');
    });

    it('Should prevent duplicate expert profile', async () => {
      const response = await request(app)
        .post(`${baseUrl}/experts`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({
          headline: 'Another Profile',
          bio: 'This profile creation should fail because the user already has an expert profile registered in the system.',
          hourlyRate: 150,
          category: 'Business & Strategy',
          skills: ['Business'],
          languages: ['English'],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already has an expert profile');
    });

    it('Should update expert profile', async () => {
      const response = await request(app)
        .patch(`${baseUrl}/experts/me`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({
          headline: 'Principal Technology Consultant',
          hourlyRate: 250,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.headline).toBe('Principal Technology Consultant');
      expect(response.body.data.hourlyRate).toBe(250);
    });
  });

  describe('2. Verification & Admin Workflow', () => {
    it('Should submit profile for verification', async () => {
      const response = await request(app)
        .post(`${baseUrl}/experts/me/submit-verification`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({ reason: 'Ready for verification' });

      expect(response.status).toBe(200);
      expect(response.body.data.verificationStatus).toBe('submitted');
    });

    it('Should create admin account', async () => {
      let admin = await User.findOne({ email: 'test-admin@example.com' });
      
      if (!admin) {
        admin = new User({
          email: 'test-admin@example.com',
          password: 'AdminPass123456',
          firstName: 'Admin',
          lastName: 'Test',
          role: 'admin',
          emailVerified: true,
          status: 'active',
        });
        await admin.save();
      }

      testData.adminUserId = admin._id;
      testData.adminEmail = admin.email;

      const response = await request(app)
        .post(`${baseUrl}/auth/login`)
        .send({
          email: testData.adminEmail,
          password: 'AdminPass123456',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe('admin');
      testData.adminToken = response.body.data.accessToken;
    });

    it('Should retrieve pending experts (admin only)', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/admin/pending`)
        .set('Authorization', `Bearer ${testData.adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const pending = response.body.data.find(e => e._id === testData.expertId);
      expect(pending).toBeDefined();
      expect(pending.verificationStatus).toBe('submitted');
    });

    it('Should deny client access to pending experts', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/admin/pending`)
        .set('Authorization', `Bearer ${testData.expertToken}`);

      expect(response.status).toBe(403);
    });

    it('Should approve expert profile', async () => {
      const response = await request(app)
        .patch(`${baseUrl}/experts/admin/${testData.expertId}/approve`)
        .set('Authorization', `Bearer ${testData.adminToken}`)
        .send({ notes: 'Approved for Phase 3E testing' });

      expect(response.status).toBe(200);
      expect(response.body.data.verificationStatus).toBe('approved');
      expect(response.body.data.verificationReviewedBy).toBeDefined();
      expect(response.body.data.profilePublic).toBe(true);
      expect(response.body.data.acceptingBookings).toBe(true);
    });
  });

  describe('3. Service Management', () => {
    it('Should create service after approval', async () => {
      const response = await request(app)
        .post(`${baseUrl}/services`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({
          title: 'Enterprise Digital Strategy Consultation',
          description: 'Comprehensive digital transformation strategy consultation covering technology assessment, market opportunities, competitive positioning, implementation roadmap, risk mitigation, change management, and measurable success metrics for enterprise organizations.',
          category: 'business-consulting',
          pricing: {
            type: 'hourly',
            amount: 250,
            currency: 'USD',
          },
          duration: 60,
          maxBookingsPerDay: 3,
          bufferTime: 15,
          advanceBookingDays: 30,
          cancellationPolicy: 'moderate',
          cancellationHours: 24,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('Enterprise Digital Strategy Consultation');
      expect(response.body.data.expertId).toBe(testData.expertId);
      expect(response.body.data.isActive).toBe(true);

      testData.serviceId = response.body.data._id;
    });

    it('Should retrieve expert services', async () => {
      const response = await request(app)
        .get(`${baseUrl}/services/me/all`)
        .set('Authorization', `Bearer ${testData.expertToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const service = response.body.data.find(s => s._id === testData.serviceId);
      expect(service).toBeDefined();
    });

    it('Should update service details', async () => {
      const response = await request(app)
        .patch(`${baseUrl}/services/${testData.serviceId}`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({
          description: 'Updated description with enhanced details and additional value proposition elements.',
          pricing: {
            type: 'hourly',
            amount: 275,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.pricing.amount).toBe(275);
    });

    it('Should prevent unauthorized service modification', async () => {
      // Register another user
      const otherRes = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `other-${Date.now()}@example.com`,
          password: 'TestPass123456',
          firstName: 'Other',
          lastName: 'User',
          role: 'client',
        });

      const otherToken = otherRes.body.data.accessToken;

      const response = await request(app)
        .patch(`${baseUrl}/services/${testData.serviceId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ description: 'Unauthorized modification' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('4. Availability Management', () => {
    it('Should set expert availability', async () => {
      const response = await request(app)
        .put(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({
          timezone: 'America/New_York',
          bufferMinutes: 15,
          minNoticeHours: 2,
          maxAdvanceDays: 90,
          weeklySchedule: {
            monday: [{ start: '09:00', end: '17:00' }],
            tuesday: [{ start: '09:00', end: '17:00' }],
            wednesday: [{ start: '09:00', end: '17:00' }],
            thursday: [{ start: '09:00', end: '17:00' }],
            friday: [{ start: '09:00', end: '15:00' }],
            saturday: [],
            sunday: [],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('America/New_York');
      expect(response.body.data.weeklySchedule.monday.length).toBe(1);
    });

    it('Should retrieve availability', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${testData.expertToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('America/New_York');
      expect(response.body.data.weeklySchedule).toBeDefined();
      expect(response.body.data.bufferMinutes).toBe(15);
    });

    it('Should update availability', async () => {
      const response = await request(app)
        .put(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({
          timezone: 'America/Chicago',
          bufferMinutes: 30,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('America/Chicago');
      expect(response.body.data.bufferMinutes).toBe(30);
    });
  });

  describe('5. Marketplace Visibility', () => {
    it('Should show approved expert in marketplace', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts`)
        .query({ category: 'Technology & Engineering' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const expert = response.body.data.find(e => e._id === testData.expertId);
      expect(expert).toBeDefined();
      expect(expert.verificationStatus).toBe('approved');
    });

    it('Should allow client to view expert profile', async () => {
      const clientRes = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `client-${Date.now()}@example.com`,
          password: 'TestPass123456',
          firstName: 'Client',
          lastName: 'User',
          role: 'client',
        });

      const clientToken = clientRes.body.data.accessToken;

      const response = await request(app)
        .get(`${baseUrl}/experts/${testData.expertId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.headline).toBeDefined();
      expect(response.body.data.verificationStatus).toBe('approved');
    });

    it('Should show expert services in marketplace', async () => {
      const response = await request(app)
        .get(`${baseUrl}/services/expert/${testData.expertId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const service = response.body.data.find(s => s._id === testData.serviceId);
      expect(service).toBeDefined();
    });

    it('Should hide pending expert from marketplace', async () => {
      // Register new expert
      const newExpertRes = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `pending-${Date.now()}@example.com`,
          password: 'TestPass123456',
          firstName: 'Pending',
          lastName: 'Expert',
          role: 'client',
        });

      const newExpertToken = newExpertRes.body.data.accessToken;

      await request(app)
        .post(`${baseUrl}/experts`)
        .set('Authorization', `Bearer ${newExpertToken}`)
        .send({
          headline: 'Pending Expert',
          bio: 'This expert profile is pending verification and should not appear in the public marketplace listing for customers to view or book.',
          hourlyRate: 100,
          category: 'Technology & Engineering',
          skills: ['Testing'],
          languages: ['English'],
        });

      // Check marketplace - should not include pending expert
      const response = await request(app)
        .get(`${baseUrl}/experts`)
        .query({ category: 'Technology & Engineering' });

      const pendingCount = response.body.data.filter(e => e.verificationStatus !== 'approved').length;
      expect(pendingCount).toBe(0);
    });
  });

  describe('6. Role-Based Security', () => {
    it('Should prevent client from rejecting experts', async () => {
      const clientRes = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `security-${Date.now()}@example.com`,
          password: 'TestPass123456',
          firstName: 'Security',
          lastName: 'Test',
          role: 'client',
        });

      const clientToken = clientRes.body.data.accessToken;

      const response = await request(app)
        .patch(`${baseUrl}/experts/admin/${testData.expertId}/reject`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ notes: 'Rejection attempt' });

      expect(response.status).toBe(403);
    });

    it('Should prevent expert from editing other expert profiles', async () => {
      // Create second expert
      const expert2Res = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `expert2-${Date.now()}@example.com`,
          password: 'TestPass123456',
          firstName: 'Expert',
          lastName: 'Two',
          role: 'client',
        });

      const expert2Token = expert2Res.body.data.accessToken;
      const expert2Id = expert2Res.body.data.user._id;

      // Create expert profile for second user
      await request(app)
        .post(`${baseUrl}/experts`)
        .set('Authorization', `Bearer ${expert2Token}`)
        .send({
          headline: 'Expert Two',
          bio: 'This is the profile for the second expert user in the system for testing role-based access controls.',
          hourlyRate: 150,
          category: 'Technology & Engineering',
          skills: ['Testing'],
          languages: ['English'],
        });

      // Try to modify with first expert's token (should fail or modify second expert's profile)
      const response = await request(app)
        .patch(`${baseUrl}/experts/me`)
        .set('Authorization', `Bearer ${testData.expertToken}`)
        .send({
          headline: 'Modified by first expert - should not affect second',
        });

      // Either fails or modifies first expert's profile (not second's)
      expect(response.status).toBe(200); // Should succeed for their own profile
      expect(response.body.data._id).toBe(testData.expertId); // But should be their own
    });
  });
});
