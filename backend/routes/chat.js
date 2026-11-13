import express from 'express';

const router = express.Router();

// In-memory conversation store (mirrors MongoDB collection pattern)
const conversationStore = new Map();
const roomStore         = new Map();

// Seed a demo conversation
conversationStore.set('conv-exp-1-user-1', {
  id:              'conv-exp-1-user-1',
  expertId:        'exp-1',
  customerId:      'user-1',
  bookingId:       'booking-001',
  status:          'active',
  lastMessage:     'Got it. That typically happens when embedding generation blocks the ingestion thread pool.',
  lastMessageTime: new Date(Date.now() - 5 * 60000).toISOString(),
  createdAt:       new Date(Date.now() - 60 * 60000).toISOString(),
});

// Seed initial messages for that conversation
roomStore.set('conv-exp-1-user-1', [
  {
    id:         1,
    sender:     'expert',
    senderName: 'Dr. Aris Thorne',
    text:       `Hello! Thanks for scheduling our architecture session. I've reviewed your project notes. Where would you like to start?`,
    timestamp:  new Date(Date.now() - 15 * 60000).toISOString(),
    isRead:     true,
  },
  {
    id:         2,
    sender:     'user',
    senderName: 'Alex Rivera',
    text:       `Hi Dr. Thorne, we're seeing a latency spike whenever our vector indexing batch exceeds 50k documents. Redis is bottlenecked.`,
    timestamp:  new Date(Date.now() - 10 * 60000).toISOString(),
    isRead:     true,
  },
  {
    id:         3,
    sender:     'expert',
    senderName: 'Dr. Aris Thorne',
    text:       `Got it. That typically happens when embedding generation blocks the ingestion thread pool. Have you decoupled the queue workers with an async event stream (Kafka or AWS SQS)?`,
    timestamp:  new Date(Date.now() - 5 * 60000).toISOString(),
    isRead:     false,
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// REST Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/chat/history/:roomId  — message history for a room/conversation
router.get('/history/:roomId', (req, res) => {
  const { roomId } = req.params;
  const messages   = roomStore.get(roomId) || [];
  return res.json({ roomId, messages });
});

// GET /api/chat/conversations/:userId  — all conversations for a user/expert
router.get('/conversations/:userId', (req, res) => {
  const { userId } = req.params;
  const all        = Array.from( conversationStore.values() );
  const filtered   = all.filter(
    (c) => c.expertId === userId || c.customerId === userId
  ).sort( (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime) );

  return res.json({ userId, conversations: filtered });
});

// POST /api/chat/conversations  — create a new conversation (called by booking webhook)
router.post('/conversations', (req, res) => {
  const { expertId, customerId, bookingId } = req.body;

  if ( !expertId || !customerId ) {
    return res.status(400).json({ error: 'expertId and customerId are required.' });
  }

  const convId   = `conv-${expertId}-${customerId}-${Date.now()}`;
  const newConv  = {
    id:              convId,
    expertId,
    customerId,
    bookingId:       bookingId || null,
    status:          'active',
    lastMessage:     null,
    lastMessageTime: new Date().toISOString(),
    createdAt:       new Date().toISOString(),
  };

  conversationStore.set( convId, newConv );
  roomStore.set( convId, [] );

  return res.status(201).json({ success: true, conversation: newConv });
});

// PATCH /api/chat/conversations/:convId/read  — mark all messages as read
router.patch('/conversations/:convId/read', (req, res) => {
  const { convId }  = req.params;
  const messages    = roomStore.get(convId);

  if ( !messages ) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  messages.forEach( (m) => { m.isRead = true; } );
  return res.json({ success: true, markedRead: messages.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// Webhook handlers (called by WordPress mu-plugins)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/chat/webhooks/booking-confirmed
router.post('/webhooks/booking-confirmed', (req, res) => {
  const { booking_id, expert_id, customer_id, scheduled_time, duration } = req.body;

  const convId  = `conv-${expert_id}-${customer_id}-${booking_id}`;
  const newConv = {
    id:              convId,
    expertId:        String(expert_id),
    customerId:      String(customer_id),
    bookingId:       String(booking_id),
    status:          'active',
    scheduledTime:   scheduled_time,
    duration:        duration,
    lastMessage:     'Booking confirmed! Your session is scheduled.',
    lastMessageTime: new Date().toISOString(),
    createdAt:       new Date().toISOString(),
  };

  conversationStore.set( convId, newConv );
  roomStore.set( convId, [
    {
      id:         Date.now(),
      sender:     'system',
      senderName: 'ExpertHub',
      text:       `✅ Your consultation has been confirmed! Session scheduled for ${scheduled_time || 'the agreed time'}.`,
      timestamp:  new Date().toISOString(),
      isRead:     false,
    },
  ]);

  console.log(`[Webhook] Booking confirmed → conversation ${convId} created`);
  return res.json({ success: true, conversationId: convId });
});

// POST /api/chat/webhooks/booking-cancelled
router.post('/webhooks/booking-cancelled', (req, res) => {
  const { booking_id, customer_id } = req.body;

  // Find and archive related conversation
  for (const [key, conv] of conversationStore.entries()) {
    if ( conv.bookingId === String(booking_id) ) {
      conv.status = 'cancelled';
      conversationStore.set(key, conv);

      const msgs = roomStore.get(key) || [];
      msgs.push({
        id:         Date.now(),
        sender:     'system',
        senderName: 'ExpertHub',
        text:       '❌ This booking has been cancelled. Please rebook if needed.',
        timestamp:  new Date().toISOString(),
        isRead:     false,
      });
      roomStore.set(key, msgs);
      break;
    }
  }

  console.log(`[Webhook] Booking ${booking_id} cancelled`);
  return res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper used by Socket.io in server.js
// ─────────────────────────────────────────────────────────────────────────────
export function saveRoomMessage(roomId, message) {
  if ( !roomStore.has(roomId) ) {
    roomStore.set(roomId, []);
  }
  const history = roomStore.get(roomId);
  history.push(message);
  // Cap at 200 messages in memory
  if ( history.length > 200 ) {
    history.shift();
  }

  // Update conversation's lastMessage
  if ( conversationStore.has(roomId) ) {
    const conv          = conversationStore.get(roomId);
    conv.lastMessage    = message.text || message.message || '';
    conv.lastMessageTime = message.timestamp || new Date().toISOString();
    conversationStore.set(roomId, conv);
  }
}

export default router;
