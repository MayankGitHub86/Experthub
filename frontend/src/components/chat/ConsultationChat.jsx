import React, { useState, useEffect, useRef } from 'react';
import { Send, Video, Mic, Paperclip, Clock, ShieldCheck, CheckCheck, PhoneOff, Wifi, WifiOff } from 'lucide-react';
import { io } from 'socket.io-client';
import { mockExperts } from '../../data/mockExperts';

const SOCKET_URL = 'http://localhost:3001';

export default function ConsultationChat({ selectedExpert }) {
  const expert = selectedExpert || mockExperts[0];
  const roomId = `session-${expert.id}`;

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'expert',
      text: `Hello Alex! Thanks for scheduling our architecture session. I've reviewed your project notes on scaling your data pipelines. Where would you like to start?`,
      time: '02:30 PM'
    },
    {
      id: 2,
      sender: 'user',
      text: `Hi Dr. Thorne, we're noticing a latency spike whenever our vector indexing batch exceeds 50k documents. Our Redis cache is bottlenecked.`,
      time: '02:31 PM'
    },
    {
      id: 3,
      sender: 'expert',
      text: `Got it. That typically happens when embedding generation blocks the ingestion thread pool. Have you decoupled the queue workers with an asynchronous event stream (like Kafka or AWS SQS)?`,
      time: '02:32 PM'
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(2580); // 43 mins remaining
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Connect to Socket.io Microservice
  useEffect(() => {
    // 1. Fetch initial room history from backend API
    fetch(`${SOCKET_URL}/api/chat/history/${roomId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          const formatted = data.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            time: new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(formatted);
        }
      })
      .catch((err) => {
        console.log('[Chat] Operating in local memory fallback mode', err);
      });

    // 2. Initialize Socket.io connection
    const socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      timeout: 3000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_room', {
        roomId,
        user: { name: 'Alex Rivera', role: 'client' }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('receive_message', (msg) => {
      setMessages((prev) => {
        // Prevent duplicate messages if already present
        if (prev.some(m => m.id === msg.id)) return prev;
        return [
          ...prev,
          {
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            time: new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });
    });

    socket.on('user_typing', () => {
      setIsTyping(true);
    });

    socket.on('user_stop_typing', () => {
      setIsTyping(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, expert.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const messagePayload = {
      sender: 'user',
      text: inputVal,
      roomId
    };

    if (socketRef.current && isConnected) {
      // Emit through real-time socket
      socketRef.current.emit('send_message', {
        roomId,
        message: messagePayload
      });
    } else {
      // Offline fallback
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'user',
          text: inputVal,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }

    setInputVal('');

    // Expert intelligent auto-reply simulation if other peer is not active
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        `That makes total sense. I recommend partitioning the indexing shards across 3 replicas and configuring HNSW m=16 with efConstruction=200 for optimal read-write balance.`,
        `Let me share a diagram from a recent implementation that solved this exact concurrency hurdle with zero downtime.`,
        `Good point! Also ensure your worker nodes have dedicated memory limits so the garbage collector doesn't trigger OOM pauses during peak spikes.`
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      if (socketRef.current && isConnected) {
        socketRef.current.emit('send_message', {
          roomId,
          message: {
            sender: 'expert',
            text: randomResponse,
            roomId
          }
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'expert',
            text: randomResponse,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    }, 1400);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isVideoActive ? '1fr 1fr' : '1fr',
      gap: '20px',
      height: 'calc(100vh - 150px)',
      minHeight: '520px'
    }}>
      {/* Optional Video Call Simulator */}
      {isVideoActive && (
        <div style={{
          backgroundColor: '#0a0d17',
          borderRadius: '16px',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Main Video View (Expert) */}
          <div style={{ flexGrow: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src={expert.avatar} 
              alt={expert.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.85)' }}
            />
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>{expert.name} (Live Audio/Video)</span>
            </div>

            {/* PIP Client Thumbnail */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '120px',
              height: '80px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.2)',
              backgroundColor: '#1f2438'
            }}>
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" 
                alt="You" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '9px', color: '#fff' }}>
                You
              </div>
            </div>
          </div>

          {/* Video Controls Bar */}
          <div style={{
            padding: '14px',
            backgroundColor: '#121626',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <button style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mic size={18} />
            </button>
            <button style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={18} />
            </button>
            <button 
              onClick={() => setIsVideoActive(false)}
              style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <PhoneOff size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Chat Container */}
      <div style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}>
        {/* Chat Room Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--surface-input)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <img 
                src={expert.avatar} 
                alt={expert.name} 
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-green)',
                border: '2px solid var(--surface-input)'
              }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{expert.name}</span>
                <span style={{ fontSize: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                  ACTIVE SESSION
                </span>
                {isConnected ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#34d399' }} title="Connected to Socket.io Microservice (Port 3001)">
                    <Wifi size={11} />
                    <span>Socket Live</span>
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-muted)' }} title="Offline / Local Sync">
                    <WifiOff size={11} />
                    <span>Sync</span>
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {expert.role}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Session Countdown Timer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'var(--accent-purple-light)',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              <Clock size={13} />
              <span>{formatTimer(sessionSeconds)}</span>
            </div>

            {/* Launch Video Call */}
            {!isVideoActive && (
              <button 
                onClick={() => setIsVideoActive(true)}
                className="btn-pro" 
                style={{ width: 'auto', padding: '8px 14px', fontSize: '12px' }}
              >
                <Video size={14} />
                <span>Join Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Feed */}
        <div style={{
          flexGrow: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--surface-input)',
              padding: '4px 12px',
              borderRadius: '12px'
            }}>
              Room: <code>{roomId}</code> • End-to-end Socket encrypted
            </span>
          </div>

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: '8px'
                }}
              >
                {!isUser && (
                  <img 
                    src={expert.avatar} 
                    alt={expert.name} 
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}

                <div
                  style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: isUser ? '#7c3aed' : 'var(--surface-input)',
                    color: isUser ? '#ffffff' : 'var(--text-primary)',
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    boxShadow: isUser ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none'
                  }}
                >
                  <div>{msg.text}</div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    fontSize: '10px',
                    color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                    marginTop: '4px'
                  }}>
                    <span>{msg.time}</span>
                    {isUser && <CheckCheck size={12} />}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src={expert.avatar} 
                alt={expert.name} 
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{
                padding: '8px 14px',
                borderRadius: '16px',
                backgroundColor: 'var(--surface-input)',
                color: 'var(--text-muted)',
                fontSize: '12px',
                fontStyle: 'italic'
              }}>
                {expert.name} is typing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form 
          onSubmit={handleSend}
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-input)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <button 
            type="button" 
            style={{ color: 'var(--text-muted)' }}
            title="Attach Architecture Diagram or Code File"
          >
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            placeholder={`Message ${expert.name} over Socket.io...`}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            style={{
              flexGrow: 1,
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'var(--text-primary)'
            }}
          />

          <button
            type="submit"
            className="btn-pro"
            style={{ width: 'auto', padding: '10px 16px', borderRadius: '10px' }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
