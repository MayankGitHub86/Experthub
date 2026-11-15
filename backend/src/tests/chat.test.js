import request from 'supertest';
import app from '../app.js';
import mongoose from 'mongoose';
import { User, Conversation, Message } from '../models/index.js';

/**
 * Chat Integration Tests - Real MongoDB persistence
 */

describe('Chat Integration Tests', () => {
  let server;
  let client1Token;
  let client2Token;
  let expert1Token;
  let expert2Token;
  let client1Id;
  let client2Id;
  let expert1Id;
  let expert2Id;
  let conversationId;

  beforeAll(async () => {
    // Connect to database
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/experthub_test?directConnection=true';
      await mongoose.connect(mongoUri);
    }

    // Clean database
    await Promise.all([
      User.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
    ]);

    // Create test users
    const createUser = async (userData) => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
      return { user: res.body.data.user, token: res.body.data.accessToken };
    };

    // Client 1
    const client1Result = await createUser({
      email: 'client1@test.com',
      password: 'Test123456',
      firstName: 'Alice',
      lastName: 'Client',
      role: 'client',
    });
    client1Id = client1Result.user._id;
    client1Token = client1Result.token;

    // Client 2
    const client2Result = await createUser({
      email: 'client2@test.com',
      password: 'Test123456',
      firstName: 'Bob',
      lastName: 'Client',
      role: 'client',
    });
    client2Id = client2Result.user._id;
    client2Token = client2Result.token;

    // Expert 1
    const expert1Result = await createUser({
      email: 'expert1@test.com',
      password: 'Test123456',
      firstName: 'Dr. Expert',
      lastName: 'One',
      role: 'expert',
    });
    expert1Id = expert1Result.user._id;
    expert1Token = expert1Result.token;

    // Expert 2
    const expert2Result = await createUser({
      email: 'expert2@test.com',
      password: 'Test123456',
      firstName: 'Dr. Expert',
      lastName: 'Two',
      role: 'expert',
    });
    expert2Id = expert2Result.user._id;
    expert2Token = expert2Result.token;
  });

  afterAll(async () => {
    // Cleanup
    await Promise.all([
      User.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
    ]);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('Conversation Management', () => {
    test('Should create direct conversation between two users', async () => {
      const res = await request(app)
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${client1Token}`)
        .send({
          userId: expert1Id,
          type: 'direct',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.type).toBe('direct');
      expect(res.body.data.participants).toHaveLength(2);

      conversationId = res.body.data._id;
    });

    test('Should find existing conversation on second creation', async () => {
      const res = await request(app)
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${client1Token}`)
        .send({
          userId: expert1Id,
          type: 'direct',
        });

      expect(res.status).toBe(201);
      expect(res.body.data._id).toBe(conversationId);
    });

    test('Should get user conversations', async () => {
      const res = await request(app)
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${client1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('Should get conversation details', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${client1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(conversationId);
    });

    test('Should reject unauthorized conversation access', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${client2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Message Persistence', () => {
    test('Should send message and persist to MongoDB', async () => {
      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${client1Token}`)
        .send({
          content: 'Hello Dr. Expert, I have a question about system architecture.',
          type: 'text',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.content).toBe('Hello Dr. Expert, I have a question about system architecture.');
      expect(res.body.data.senderId).toBe(client1Id);
      expect(res.body.data.deliveryStatus).toBe('sent');

      // Verify message persisted in DB
      const dbMessage = await Message.findById(res.body.data._id);
      expect(dbMessage).toBeTruthy();
      expect(dbMessage.content).toBe('Hello Dr. Expert, I have a question about system architecture.');
    });

    test('Expert should receive and reply to message', async () => {
      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${expert1Token}`)
        .send({
          content: 'Sure! I\'d be happy to help. What specific aspects are you concerned about?',
          type: 'text',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.senderId).toBe(expert1Id);

      // Verify persisted
      const dbMessage = await Message.findById(res.body.data._id);
      expect(dbMessage).toBeTruthy();
    });

    test('Should fetch message history with pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/conversations/${conversationId}/messages?limit=10`)
        .set('Authorization', `Bearer ${client1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    test('Should reject unauthorized message sending', async () => {
      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${client2Token}`)
        .send({
          content: 'This should fail',
          type: 'text',
        });

      expect(res.status).toBe(403);
    });

    test('Should validate message content', async () => {
      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${client1Token}`)
        .send({
          content: '', // Empty content
          type: 'text',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Message State Management', () => {
    test('Should mark message as read', async () => {
      // Get latest message
      const messages = await Message.find({ conversationId });
      const lastMessage = messages[messages.length - 1];

      const res = await request(app)
        .patch(`/api/v1/chat/messages/${lastMessage._id}/read`)
        .set('Authorization', `Bearer ${expert1Token}`);

      expect(res.status).toBe(200);

      // Verify in DB
      const dbMessage = await Message.findById(lastMessage._id);
      const readReceipt = dbMessage.readBy.find(r => r.userId.toString() === expert1Id);
      expect(readReceipt).toBeTruthy();
    });

    test('Should mark entire conversation as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${client1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Should edit message', async () => {
      const messages = await Message.find({ conversationId, senderId: client1Id });
      const messageToEdit = messages[0];

      const res = await request(app)
        .patch(`/api/v1/chat/messages/${messageToEdit._id}/edit`)
        .set('Authorization', `Bearer ${client1Token}`)
        .send({
          content: 'Updated: I have a question about distributed system architecture.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.edited).toBe(true);

      // Verify edit history
      const dbMessage = await Message.findById(messageToEdit._id);
      expect(dbMessage.editHistory.length).toBeGreaterThan(0);
    });

    test('Should delete message', async () => {
      const messages = await Message.find({ conversationId, senderId: client1Id });
      const messageToDelete = messages[0];

      const res = await request(app)
        .delete(`/api/v1/chat/messages/${messageToDelete._id}`)
        .set('Authorization', `Bearer ${client1Token}`)
        .send({
          deleteFor: 'everyone',
        });

      expect(res.status).toBe(200);

      // Verify soft delete
      const dbMessage = await Message.findById(messageToDelete._id);
      expect(dbMessage.deleted).toBe(true);
    });
  });

  describe('Data Persistence Verification', () => {
    test('Messages should persist across database connections', async () => {
      // Get message count before
      const countBefore = await Message.countDocuments({ conversationId });

      // Disconnect and reconnect
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/experthub_test?directConnection=true';
      await mongoose.disconnect();
      await mongoose.connect(mongoUri);

      // Get message count after
      const countAfter = await Message.countDocuments({ conversationId });

      expect(countAfter).toBe(countBefore);
    });

    test('Conversation metadata should update with last message', async () => {
      const conv = await Conversation.findById(conversationId);
      expect(conv.lastMessage).toBeTruthy();
      expect(conv.lastMessage.timestamp).toBeTruthy();
      expect(conv.metadata.messageCount).toBeGreaterThan(0);
    });

    test('Should enforce participant-only access to messages', async () => {
      const messages = await Message.find({ conversationId });
      expect(messages.length).toBeGreaterThan(0);

      // Only participants should be able to retrieve
      const res = await request(app)
        .get(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${client2Token}`); // Non-participant

      expect(res.status).toBe(403);
    });
  });

  describe('Real-time Requirements', () => {
    test('Messages should be available immediately after sending', async () => {
      const sendRes = await request(app)
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${expert1Token}`)
        .send({
          content: 'Real-time test message',
          type: 'text',
        });

      expect(sendRes.status).toBe(201);
      const messageId = sendRes.body.data._id;

      // Immediately fetch
      const fetchRes = await request(app)
        .get(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${client1Token}`);

      expect(fetchRes.status).toBe(200);
      const foundMessage = fetchRes.body.data.find(m => m._id === messageId);
      expect(foundMessage).toBeTruthy();
      expect(foundMessage.content).toBe('Real-time test message');
    });
  });
});
