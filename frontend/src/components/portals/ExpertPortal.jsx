import React, { useState } from 'react';
import { 
  Star, DollarSign, Calendar, Users, Clock, TrendingUp, 
  Video, CheckCircle, ToggleLeft, ToggleRight, Award,
  ArrowUpRight, MessageSquare, Zap
} from 'lucide-react';
import { initialBookings } from '../../data/mockBookings';
import { mockExperts } from '../../data/mockExperts';
import ReviewModal from '../marketplace/ReviewModal';

// The expert that is logged in
const EXPERT_ID = 'exp-1';
const loggedExpert = mockExperts.find(e => e.id === EXPERT_ID) || mockExperts[0];

export default function ExpertPortal({ onJoinSession, theme }) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const isLight = theme === 'light';

  const mySessions = initialBookings.filter(b => b.expertId === EXPERT_ID || b.expertName === loggedExpert.name);
  
  // Compute earnings
  const totalEarned = mySessions.reduce((s, b) => s + (b.expertEarnings || 0), 0);
  const completedSessions = mySessions.filter(b => b.status === 'Completed');
  const upcomingSessions = mySessions.filter(b => b.status === 'Confirmed' || b.status === 'In Session');
  const pendingPayout = upcomingSessions.reduce((s, b) => s + (b.expertEarnings || 0), 0);

  const statCards = [
    { label: 'Total Earned', value: `$${totalEarned.toLocaleString()}`, icon: DollarSign, trend: '+12%', color: '#10b981' },
    { label: 'This Month', value: `$${totalEarned.toLocaleString()}`, icon: TrendingUp, trend: '+8%', color: '#3b82f6' },
    { label: 'Pending Payout', value: `$${pendingPayout}`, icon: Clock, trend: null, color: '#f59e0b' },
    { label: 'Total Sessions', value: mySessions.length, icon: Users, trend: `${completedSessions.length} done`, color: '#8b5cf6' },
  ];

  const reviews = loggedExpert.reviews || [];

  const accentColor = isLight ? '#2563eb' : '#8b5cf6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Expert Hero Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 28px',
        borderRadius: '16px',
        background: isLight 
          ? 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)'
          : 'linear-gradient(135deg, #1e0a3c 0%, #2d1b69 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={loggedExpert.avatar}
              alt={loggedExpert.name}
              style={{ width: '72px', height: '72px', borderRadius: '16px', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)' }}
            />
            <div style={{
              position: 'absolute', bottom: '-4px', right: '-4px',
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: isAvailable ? '#10b981' : '#6b7280',
              border: '2px solid white'
            }} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
              Welcome back, {loggedExpert.name.split(' ').slice(-1)[0]}!
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>{loggedExpert.role}</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={13} fill="#fbbf24" color="#fbbf24" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>{loggedExpert.rating}</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>({loggedExpert.reviewsCount} reviews)</span>
              </div>
              <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>${loggedExpert.hourlyRate}/hr</span>
            </div>
          </div>
        </div>

        {/* Availability Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 22px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: '2px' }}>
              Taking New Clients
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: isAvailable ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </div>
          </div>
          <button 
            onClick={() => setIsAvailable(!isAvailable)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isAvailable ? '#10b981' : 'rgba(255,255,255,0.4)', display: 'flex' }}
          >
            {isAvailable ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{
              padding: '20px',
              borderRadius: '14px',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {card.label}
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${card.color}18` }}>
                  <Icon size={16} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
                {card.value}
              </div>
              {card.trend && (
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowUpRight size={12} />
                  {card.trend} vs last month
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0' }}>
        {['overview', 'sessions', 'reviews'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              textTransform: 'capitalize',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? `2px solid ${accentColor}` : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            {tab === 'overview' ? 'Overview' : tab === 'sessions' ? `Sessions (${mySessions.length})` : `Reviews (${reviews.length})`}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Upcoming Sessions Preview */}
          <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color={accentColor} />
              Upcoming Sessions
            </h3>
            {upcomingSessions.length > 0 ? upcomingSessions.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{s.clientName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.date} • {s.time}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.serviceTitle}</div>
                </div>
                {s.roomReady && (
                  <button
                    onClick={() => onJoinSession && onJoinSession(s)}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', border: 'none',
                      background: accentColor, color: '#fff', fontSize: '12px',
                      fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Video size={12} /> Join
                  </button>
                )}
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No upcoming sessions yet.
              </div>
            )}
          </div>

          {/* Review Snapshot */}
          <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={16} color="#f59e0b" />
              Latest Reviews
            </h3>
            {reviews.length > 0 ? reviews.slice(0, 2).map(r => (
              <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{r.authorName}</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={11} fill={r.rating >= s ? '#f59e0b' : 'transparent'} color={r.rating >= s ? '#f59e0b' : 'var(--border-subtle)'} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  "{r.comment.slice(0, 100)}..."
                </p>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No reviews yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mySessions.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: '12px', flexWrap: 'wrap', gap: '12px',
              backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img src={s.clientAvatar} alt={s.clientName} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{s.clientName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.serviceTitle}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>{s.date} • {s.time}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>+${s.expertEarnings}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>your earnings</div>
                </div>
                <span className={`badge-status ${s.status === 'Completed' ? 'success' : s.status === 'In Session' ? 'purple' : 'info'}`}>
                  {s.status}
                </span>
                {s.roomReady && (
                  <button
                    onClick={() => onJoinSession && onJoinSession(s)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: accentColor, color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Video size={13} /> Join Room
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {reviews.length > 0 ? reviews.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: '16px', padding: '20px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
              {r.authorAvatar ? (
                <img src={r.authorAvatar} alt={r.authorName} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--surface-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', flexShrink: 0 }}>
                  {r.authorName.charAt(0)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{r.authorName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.authorRole}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} fill={r.rating >= s ? '#f59e0b' : 'transparent'} color={r.rating >= s ? '#f59e0b' : 'var(--border-subtle)'} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '12px' }}>{r.comment}</p>
                {r.tags && r.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {r.tags.map(tag => (
                      <span key={tag} style={{ padding: '4px 10px', backgroundColor: 'var(--surface-input)', borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <MessageSquare size={36} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <p>No reviews yet. Complete sessions to receive client feedback.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
