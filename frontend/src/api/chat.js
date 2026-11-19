import client from './client.js';

const chatAPI = {
  async getConversations() {
    const response = await client.get('/chat/conversations', { params: { status: 'active', limit: 100, page: 1 } });
    return Array.isArray(response.data.data) ? response.data.data : [];
  },
  async createDirectConversation(userId) {
    const response = await client.post('/chat/conversations', { userId, type: 'direct' });
    return response.data.data;
  },
  async getMessages(conversationId) {
    const response = await client.get(`/chat/conversations/${conversationId}/messages`, { params: { limit: 100 } });
    return Array.isArray(response.data.data) ? response.data.data : [];
  },
  async markRead(conversationId) {
    const response = await client.patch(`/chat/conversations/${conversationId}/read`);
    return response.data.data;
  },
};

export default chatAPI;
