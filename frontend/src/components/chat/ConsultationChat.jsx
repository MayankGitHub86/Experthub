import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Send, RefreshCw, Wifi, WifiOff, MessageSquare } from 'lucide-react';
import chatAPI from '../../api/chat.js';

const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1').origin;
const idOf = (value) => String(value?._id || value?.id || value || '');
const participantUser = (participant) => participant?.userId?._id ? participant.userId : participant?.userId;
const displayName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Conversation';
const formatMessage = (message, currentUserId) => {
  const senderId = idOf(message.senderId);
  return {
    id: idOf(message._id || message.id),
    text: message.content || '',
    own: senderId === idOf(currentUserId),
    senderName: displayName(message.senderId),
    time: message.createdAt || message.timestamp,
  };
};

export default function ConsultationChat({ selectedExpert, initialBooking, currentUser }) {
  const currentUserId = idOf(currentUser);
  const bookingTargetId = useMemo(() => {
    if (!initialBooking) return '';
    if (currentUser?.role === 'client') return idOf(initialBooking.expertId?.userId || initialBooking.expertUserId);
    if (currentUser?.role === 'expert') return idOf(initialBooking.clientId);
    return '';
  }, [initialBooking, currentUser?.role]);
  const expertTargetId = idOf(selectedExpert?.userId?._id || selectedExpert?.userId);
  const targetId = bookingTargetId || expertTargetId;
  const targetKey = initialBooking?._id || initialBooking?.id || selectedExpert?._id || selectedExpert?.id || '';

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await chatAPI.getConversations();
      setConversations(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Conversations could not be loaded.');
      setConversations([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!targetId || !currentUserId || targetId === currentUserId) return;
    let cancelled = false;
    chatAPI.createDirectConversation(targetId)
      .then((conversation) => {
        if (cancelled) return;
        setSelectedConversation(conversation);
        setConversations((existing) => [conversation, ...existing.filter((item) => idOf(item) !== idOf(conversation))]);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not open this conversation.');
      });
    return () => { cancelled = true; };
  }, [targetId, targetKey, currentUserId]);

  useEffect(() => {
    if (!selectedConversation?._id) {
      setMessages([]);
      return undefined;
    }
    let cancelled = false;
    const conversationId = idOf(selectedConversation);
    setMessagesLoading(true);
    setError('');
    Promise.all([chatAPI.getMessages(conversationId), chatAPI.markRead(conversationId)])
      .then(([items]) => {
        if (!cancelled) setMessages(items.slice().reverse().map((item) => formatMessage(item, currentUserId)));
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Message history could not be loaded.');
      })
      .finally(() => { if (!cancelled) setMessagesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedConversation?._id, currentUserId]);

  useEffect(() => {
    if (!selectedConversation?._id) return undefined;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Sign in again to connect to conversations.');
      return undefined;
    }
    const socket = io(API_ORIGIN, { auth: { token }, reconnectionAttempts: 4, timeout: 5000 });
    socketRef.current = socket;
    const conversationId = idOf(selectedConversation);
    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_conversation', { conversationId });
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => {
      setSocketConnected(false);
      setError('Live messaging is unavailable. Messages are not queued on this device.');
    });
    socket.on('error', (payload) => setError(payload?.message || 'The message could not be sent.'));
    socket.on('receive_message', (message) => {
      const next = formatMessage(message, currentUserId);
      setMessages((existing) => existing.some((item) => item.id === next.id) ? existing : [...existing, next]);
    });
    socket.on('user_typing', () => {});
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [selectedConversation?._id, currentUserId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const otherParticipant = (conversation) => conversation?.participants
    ?.map(participantUser)
    .find((user) => idOf(user) !== currentUserId);

  const handleSend = (event) => {
    event.preventDefault();
    const content = messageText.trim();
    const conversationId = idOf(selectedConversation);
    if (!content || !conversationId || !socketConnected || !socketRef.current) return;
    setSending(true);
    setError('');
    socketRef.current.emit('send_message', { conversationId, content, type: 'text' });
    setMessageText('');
    window.setTimeout(() => setSending(false), 300);
  };

  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(0, 2fr)', gap: '16px', minHeight: 'min(680px, calc(100vh - 170px))' }}>
      <aside className="card-container" style={{ padding: '14px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', color: 'var(--text-primary)' }}>Messages</h2>
          <button type="button" onClick={loadConversations} aria-label="Refresh conversations" disabled={loading}><RefreshCw size={15} className={loading ? 'spinner' : ''} /></button>
        </div>
        {loading ? <p role="status" style={{ color: 'var(--text-muted)' }}>Loading conversations…</p> : conversations.map((conversation) => {
          const partner = otherParticipant(conversation);
          const active = idOf(selectedConversation) === idOf(conversation);
          return <button key={idOf(conversation)} type="button" onClick={() => setSelectedConversation(conversation)} style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '6px', textAlign: 'left', borderRadius: '8px', background: active ? 'var(--surface-input)' : 'transparent', color: 'var(--text-primary)', border: `1px solid ${active ? 'var(--border-subtle)' : 'transparent'}` }}>
            <div style={{ fontWeight: 650 }}>{displayName(partner)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.lastMessage?.content || conversation.subject || 'No messages yet'}</div>
          </button>;
        })}
        {!loading && conversations.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No conversations yet. Open a profile or booking to start one.</p>}
      </aside>

      <div className="card-container" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {selectedConversation ? <>
          <header style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <div><h2 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{displayName(otherParticipant(selectedConversation))}</h2><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedConversation.bookingId ? `Booking ${idOf(selectedConversation.bookingId)}` : 'Direct conversation'}</p></div>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: socketConnected ? '#10b981' : 'var(--text-muted)' }}>{socketConnected ? <Wifi size={13} /> : <WifiOff size={13} />}{socketConnected ? 'Connected' : 'Disconnected'}</span>
          </header>
          {error && <p role="alert" style={{ margin: '10px 16px', color: '#ef4444', fontSize: '12px' }}>{error}</p>}
          <div style={{ flex: 1, minHeight: '260px', overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messagesLoading ? <p role="status">Loading message history…</p> : messages.length === 0 ? <p style={{ margin: 'auto', color: 'var(--text-muted)' }}>No messages in this conversation yet.</p> : messages.map((message) => <div key={message.id} style={{ alignSelf: message.own ? 'flex-end' : 'flex-start', maxWidth: '78%', padding: '10px 13px', borderRadius: '12px', background: message.own ? 'var(--accent-purple)' : 'var(--surface-input)', color: message.own ? '#fff' : 'var(--text-primary)', overflowWrap: 'anywhere' }}><div style={{ fontSize: '13px', lineHeight: 1.5 }}>{message.text}</div><time style={{ display: 'block', marginTop: '4px', fontSize: '10px', opacity: 0.7 }}>{message.time ? new Date(message.time).toLocaleString() : ''}</time></div>)}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
            <input aria-label="Message" value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={5000} placeholder="Write a message…" style={{ flex: 1, minWidth: 0, padding: '10px', borderRadius: '8px', background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
            <button type="submit" disabled={!socketConnected || !messageText.trim() || sending} aria-label="Send message" className="btn-pro" style={{ width: 'auto', padding: '10px 14px' }}><Send size={15} /></button>
          </form>
        </> : <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}><MessageSquare size={28} style={{ margin: '0 auto 10px' }} /><p>Select a conversation to view persisted messages.</p></div>}
      </div>
    </section>
  );
}
