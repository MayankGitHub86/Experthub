import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import app from '../app.js';
import User from '../models/User.js';
import Expert from '../models/Expert.js';

/**
 * Availability Security Blocker Test
 * Verifies that separate getMyAvailability and getExpertAvailability handlers
 * correctly distinguish between authenticated self-service and public endpoints.
 * 
 * CRITICAL: This test ensures Expert A cannot retrieve Expert B's data when
 * requesting their own availability, and Expert A CAN retrieve Expert B's
 * public availability.
 */

describe('Availability Security - Separate Handlers', () => {
  jest.setTimeout(30000);

  const baseUrl = '/api/v1';
  let expertA = { userId: null, token: null, expertId: null };
  let expertB = { userId: null, token: null, expertId: null };
  let adminToken = null;

  beforeAll(async () => {
    console.log('Setting up availability security blocker test...');

    // Create Expert A
    const resA = await request(app)
      .post(`${baseUrl}/auth/register`)
      .send({
        email: `expert-a-security-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        firstName: 'SecurityTest',
        lastName: 'ExpertA',
        role: 'client',
      });

    expertA.userId = resA.body.data.user._id;
    expertA.token = resA.body.data.accessToken;

    // Create Expert B
    const resB = await request(app)
      .post(`${baseUrl}/auth/register`)
      .send({
        email: `expert-b-security-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        firstName: 'SecurityTest',
        lastName: 'ExpertB',
        role: 'client',
      });

    expertB.userId = resB.body.data.user._id;
    expertB.token = resB.body.data.accessToken;

    // Create expert profiles
    const expertAProfile = await request(app)
      .post(`${baseUrl}/experts`)
      .set('Authorization', `Bearer ${expertA.token}`)
      .send({
        headline: 'Expert A for Security Testing',
        bio: 'Expert A has extensive experience in testing and security verification for platform functionality and access controls.',
        hourlyRate: 100,
        category: 'Technology & Engineering',
        skills: ['Security', 'Testing'],
        languages: ['English'],
      });

    expertA.expertId = expertAProfile.body.data._id;

    const expertBProfile = await request(app)
      .post(`${baseUrl}/experts`)
      .set('Authorization', `Bearer ${expertB.token}`)
      .send({
        headline: 'Expert B for Security Testing',
        bio: 'Expert B has extensive experience in testing and security verification for platform functionality and access controls.',
        hourlyRate: 150,
        category: 'Business & Strategy',
        skills: ['Strategy', 'Security'],
        languages: ['English'],
      });

    expertB.expertId = expertBProfile.body.data._id;

    // Get or create admin
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = new User({
        email: `admin-security-test-${Date.now()}@test.com`,
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'Test',
        role: 'admin',
        emailVerified: true,
        status: 'active',
      });
      await admin.save();
    }

    const loginRes = await request(app)
      .post(`${baseUrl}/auth/login`)
      .send({
        email: admin.email,
        password: admin.role === 'admin' ? 'AdminPass123!' : 'TestPass123!',
      });

    if (loginRes.status === 200) {
      adminToken = loginRes.body.data.accessToken;

      // Approve both experts
      await request(app)
        .patch(`${baseUrl}/experts/admin/${expertA.expertId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approved for security test' });

      await request(app)
        .patch(`${baseUrl}/experts/admin/${expertB.expertId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approved for security test' });
    }

    // Set different availability for each expert
    await request(app)
      .put(`${baseUrl}/experts/me/availability`)
      .set('Authorization', `Bearer ${expertA.token}`)
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

    await request(app)
      .put(`${baseUrl}/experts/me/availability`)
      .set('Authorization', `Bearer ${expertB.token}`)
      .send({
        timezone: 'Europe/London',
        weeklySchedule: {
          monday: [{ start: '08:00', end: '16:00' }],
          tuesday: [{ start: '08:00', end: '16:00' }],
          wednesday: [{ start: '08:00', end: '16:00' }],
          thursday: [{ start: '08:00', end: '16:00' }],
          friday: [{ start: '08:00', end: '16:00' }],
          saturday: [],
          sunday: [],
        },
      });

    console.log('✅ Setup complete: Expert A (NY) and Expert B (London) with different timezones');
  });

  afterAll(async () => {
    console.log('✅ Availability security blocker tests complete');
  });

  describe('SELF-SERVICE /me/availability ENDPOINT', () => {
    it('Expert A can GET their own availability via /me', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${expertA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('America/New_York');
      console.log('✅ Expert A retrieved own availability (NYC timezone)');
    });

    it('Expert B can GET their own availability via /me', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${expertB.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('Europe/London');
      console.log('✅ Expert B retrieved own availability (London timezone)');
    });

    it('Unauthenticated request to /me/availability is rejected', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/me/availability`);

      expect(response.status).toBe(401);
      console.log('✅ Unauthenticated user blocked from /me/availability');
    });
  });

  describe('PUBLIC /:expertId/availability ENDPOINT', () => {
    it('Expert A can GET Expert B public availability', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/${expertB.expertId}/availability`)
        .set('Authorization', `Bearer ${expertA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('Europe/London');
      console.log('✅ Expert A retrieved Expert B public availability (London timezone)');
    });

    it('Expert A unauthenticated can GET Expert B public availability', async () => {
      const response = await request(app)
        .get(`${baseUrl}/experts/${expertB.expertId}/availability`);

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('Europe/London');
      console.log('✅ Unauthenticated user retrieved Expert B public availability');
    });

    it('CRITICAL: /me/availability returns OWN data, not :expertId parameter', async () => {
      // Expert A requests their own availability via /me
      const ownRes = await request(app)
        .get(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${expertA.token}`);

      // Expert A requests Expert B's availability via public endpoint
      const otherRes = await request(app)
        .get(`${baseUrl}/experts/${expertB.expertId}/availability`)
        .set('Authorization', `Bearer ${expertA.token}`);

      // CRITICAL: These must be different!
      expect(ownRes.body.data.timezone).toBe('America/New_York');
      expect(otherRes.body.data.timezone).toBe('Europe/London');
      expect(ownRes.body.data.timezone).not.toBe(otherRes.body.data.timezone);

      console.log('✅ CRITICAL: /me returns Expert A (NY), /:id returns Expert B (London)');
    });
  });

  describe('UPDATE PROTECTION', () => {
    it('Expert A cannot modify Expert B availability', async () => {
      // Attempt to PUT Expert B's availability using Expert A's token
      const response = await request(app)
        .put(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${expertA.token}`)
        .send({
          timezone: 'Asia/Tokyo', // Try to change it
          weeklySchedule: {
            monday: [{ start: '18:00', end: '22:00' }],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
        });

      expect(response.status).toBe(200);

      // Verify Expert A's availability changed (not B's)
      const checkA = await request(app)
        .get(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${expertA.token}`);

      expect(checkA.body.data.timezone).toBe('Asia/Tokyo');

      // Verify Expert B's availability UNCHANGED
      const checkB = await request(app)
        .get(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${expertB.token}`);

      expect(checkB.body.data.timezone).toBe('Europe/London');

      console.log('✅ Expert A modified only their own availability');
      console.log('✅ Expert B availability remained unchanged');
    });
  });

  describe('AUTHORIZATION', () => {
    it('Client cannot access expert /me/availability endpoint', async () => {
      // Create a client user
      const clientRes = await request(app)
        .post(`${baseUrl}/auth/register`)
        .send({
          email: `client-security-${Date.now()}@test.com`,
          password: 'ClientPass123!',
          firstName: 'Client',
          lastName: 'Test',
          role: 'client',
        });

      const clientToken = clientRes.body.data.accessToken;

      const response = await request(app)
        .get(`${baseUrl}/experts/me/availability`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Should be rejected because client is not an expert
      expect(response.status).toBe(403);
      console.log('✅ Client blocked from expert /me/availability endpoint');
    });
  });
});
