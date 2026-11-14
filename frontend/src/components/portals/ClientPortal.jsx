import React, { useState } from 'react';
import {
  Star, DollarSign, Calendar, BookOpen, Heart, Zap,
  Video, ArrowRight, TrendingUp, Clock, RefreshCw, ArrowUpRight, User
} from 'lucide-react';
import { initialBookings } from '../../data/mockBookings';
import { mockExperts } from '../../data/mockExperts';
import ReviewModal from '../marketplace/ReviewModal';

// Simulate the client that is "logged in"
const CLIENT_NAME = 'Alex Rivera';
const myBookings = initialBookings.filter(b => b.clientName === CLIENT_NAME);

// Saved experts - we'll hardcode for the demo using the first 3
const savedExperts = mockExperts.slice(0, 3);

export default function ClientPortal({ theme, onBook, onViewProfile, onJoinSession }) {
  const [activeReview, setActiveReview] = useState(null);
  const isLight = theme === 'light';
  const accentColor = isLight ? '#2563eb' : '#8b5cf6';

  const totalSpent = myBookings.reduce((s, b) => s + b.amount, 0);
  const completedSessions = myBookings.filter(b => b.status === 'Completed');
  const upcomingSessions = myBookings.filter(b => b.status === 'Confirmed' || b.status === 'In Session');

  const statCards = [
    { label: 'Total Spent', value: `$${totalSpent}`, icon: DollarSign, color: '#3b82f6', sub: 'across all sessions' },
    { label: 'Sessions Booked', value: myBookings.length, icon: BookOpen, color: '#8b5cf6', sub: `${completedSessions.length} completed` },
    { label: 'Upcoming', value: upcomingSessions.length, icon: Calendar, color: '#10b981', sub: 'consultations scheduled' },
    { label: 'Saved Experts', value: savedExperts.length, icon: Heart, color: '#f59e0b', sub: 'in your favourites' },
  ];

  // AI-suggested experts based on past activity (simple mock)
  const recommendedExperts = mockExperts.slice(3, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Client Welcome Hero */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '28px 32px',
        borderRadius: '16px',
        background: isLight
          ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
          : 'linear-gradient(135deg, #0a0f1e 0%, #0f2040 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Client Portal</p>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
            Good morning, {CLIENT_NAME.split(' ')[0]}! 👋
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            You have <span style={{ color: '#34d399', fontWeight: '700' }}>{upcomingSessions.length} upcoming</span> consultation{upcomingSessions.length !== 1 ? 's' : ''}. Ready to learn?
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onBook && onBook(mockExperts[0])}
            style={{
              padding: '12px 20px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
            }}
          >
            <Zap size={15} /> Book a Session
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{
              padding: '20px',
              borderRadius: '14px',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {card.label}
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{card.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* My Consultations */}
        <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color={accentColor} /> My Consultations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {myBookings.map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)', marginBottom: '8px', flexWrap: 'wrap', gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} color={accentColor} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1px' }}>{b.expertName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.date} • ${b.amount}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge-status ${b.status === 'Completed' ? 'success' : b.status === 'In Session' ? 'purple' : 'info'}`} style={{ fontSize: '10px' }}>
                    {b.status}
                  </span>
                  {b.roomReady && (
                    <button
                      onClick={() => onJoinSession && onJoinSession(b)}
                      style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: accentColor, color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Join
                    </button>
                  )}
                  {b.status === 'Completed' && (
                    <button
                      onClick={() => setActiveReview(b)}
                      style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-primary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Star size={10} /> Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Experts */}
        <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={16} color="#f59e0b" /> Saved Experts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {savedExperts.map(expert => (
              <div key={expert.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={expert.avatar} alt={expert.name} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{expert.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={10} fill="#f59e0b" color="#f59e0b" /> {expert.rating} • ${expert.hourlyRate}/hr
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onViewProfile && onViewProfile(expert)}
                    style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-primary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => onBook && onBook(expert)}
                    style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: accentColor, color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={10} /> Rebook
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI-Recommended Experts */}
      <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color={accentColor} /> Recommended For You
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'var(--surface-input)', border: '1px solid var(--border-subtle)' }}>
            AI-powered
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {recommendedExperts.map(expert => (
            <div key={expert.id} style={{
              padding: '16px', borderRadius: '12px', backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)', textAlign: 'center'
            }}>
              <img src={expert.avatar} alt={expert.name} style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{expert.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{expert.role}</div>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                <Star size={10} fill="#f59e0b" color="#f59e0b" /> {expert.rating} ({expert.reviewsCount})
              </div>
              <button
                onClick={() => onBook && onBook(expert)}
                style={{
                  width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
                  background: accentColor, color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Book — ${expert.hourlyRate}/hr
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Review Modal */}
      {activeReview && (
        <ReviewModal
          expertName={activeReview.expertName}
          consultationDate={activeReview.date}
          onClose={() => setActiveReview(null)}
        />
      )}
    </div>
  );
}
