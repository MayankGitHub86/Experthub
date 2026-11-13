import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import aiRoutes from './routes/ai.js';
import paymentRoutes from './routes/payments.js';
import chatRoutes, { saveRoomMessage } from './routes/chat.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middlewares
app.use(cors({
  origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ExpertHub Real-Time Microservice',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);

// WordPress webhook compatibility — PHP mu-plugins POST to /webhooks/*
// These are the same handlers defined inside chatRoutes
app.use('/webhooks', chatRoutes);

// Socket.io Setup
const io = new Server(httpServer, {
  cors: {
    origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Join a consultation room
  socket.on('join_room', ({ roomId, user }) => {
    socket.join(roomId);
    console.log(`[Socket] User ${user?.name || socket.id} joined ${roomId}`);
    socket.to(roomId).emit('user_joined', {
      user: user || { name: 'Participant' },
      time: new Date().toISOString()
    });
  });

  // Handle message sending
  socket.on('send_message', ({ roomId, message }) => {
    const enrichedMessage = {
      id: Date.now() + Math.random(),
      ...message,
      timestamp: new Date().toISOString()
    };

    // Save to persistent room store
    saveRoomMessage(roomId, enrichedMessage);

    // Broadcast to everyone in room including sender or to others
    io.to(roomId).emit('receive_message', enrichedMessage);
  });

  // Typing indicators
  socket.on('typing', ({ roomId, user }) => {
    socket.to(roomId).emit('user_typing', { user });
  });

  socket.on('stop_typing', ({ roomId, user }) => {
    socket.to(roomId).emit('user_stop_typing', { user });
  });

  // WebRTC Signaling Relay
  socket.on('webrtc_signal', ({ roomId, signal, sender }) => {
    socket.to(roomId).emit('webrtc_signal', { signal, sender });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[ExpertHub Microservice] Server running at http://localhost:${PORT}`);
  console.log(`[ExpertHub Microservice] Health check: http://localhost:${PORT}/health`);
});
