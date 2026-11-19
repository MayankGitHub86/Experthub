import React, { useState, useEffect } from 'react';
import {
  Star, DollarSign, Calendar, BookOpen, Heart, Zap,
  Video, ArrowRight, TrendingUp, Clock, RefreshCw, ArrowUpRight, User, AlertCircle
} from 'lucide-react';
import bookingsAPI from '../../api/bookings.js';
import expertsAPI from '../../api/experts.js';
import ReviewModal from '../marketplace/ReviewModal.jsx';

export default function ClientPortal({ theme, onBook, onBrowseExperts, onViewProfile, onJoinSession, currentUser }) {
  const [activeReview, setActiveReview] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [expertsList, setExpertsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isLight = theme === 'light';
  const accentColor = isLight ? '#2563eb' : '#8b5cf6';

  const clientDisplayName = currentUser?.name || currentUser?.firstName || 'Client';

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [bookingsRes, expertsRes] = await Promise.all([
        bookingsAPI.getMyBookings({ limit: 50 }),
        expertsAPI.getAll(),
      ]);

      const loadedBookings = Array.isArray(bookingsRes?.bookings) ? bookingsRes.bookings : [];
      setMyBookings(loadedBookings);

      const loadedExperts = Array.isArray(expertsRes) ? expertsRes : (expertsRes?.experts || []);
      setExpertsList(loadedExperts);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load client portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, []);

  const paidBookings = myBookings.filter((booking) => Boolean(booking.payment?.paidAt) || booking.status === 'paid' || booking.status === 'completed');
  const totalSpentByCurrency = new Map();
  paidBookings.forEach((booking) => {
    const currency = String(booking.pricing?.currency || 'USD').toUpperCase();
    totalSpentByCurrency.set(currency, (totalSpentByCurrency.get(currency) || 0) + (Number(booking.totalAmount) || 0));
  });
  const totalSpent = totalSpentByCurrency.size
    ? [...totalSpentByCurrency].map(([currency, amount]) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)).join(' · ')
    : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(0);
  const completedSessions = myBookings.filter((booking) => booking.status === 'completed');
  const upcomingSessions = myBookings.filter((booking) => ['confirmed', 'payment_pending', 'paid', 'in_progress'].includes(booking.status));

  const statCards = [
    { label: 'Paid Booking Total', value: totalSpent, icon: DollarSign, color: '#3b82f6', sub: 'from server-confirmed payments' },
    { label: 'Sessions Booked', value: myBookings.length, icon: BookOpen, color: '#8b5cf6', sub: `${completedSessions.length} completed` },
    { label: 'Upcoming', value: upcomingSessions.length, icon: Calendar, color: '#10b981', sub: 'consultations scheduled' },
    { label: 'Available Experts', value: expertsList.length, icon: Heart, color: '#f59e0b', sub: 'verified advisors' },
  ];

  const featuredExperts = expertsList.slice(0, 3);

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
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
            ExpertHub Client Portal
          </p>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
            Welcome back, {clientDisplayName}! 👋
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            You have <span style={{ color: '#34d399', fontWeight: '700' }}>{upcomingSessions.length} upcoming</span> consultation{upcomingSessions.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => expertsList[0] ? onBook?.(expertsList[0]) : onBrowseExperts?.()}
            disabled={expertsList.length === 0 && !onBrowseExperts}
            style={{
              padding: '12px 20px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
            }}
          >
            <Zap size={15} /> Book a Consultation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color={accentColor} /> My Consultations
            </h3>
            <button 
              onClick={loadClientData}
              className="filter-btn" 
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={11} className={loading ? 'spinner' : ''} />
              <span>Sync</span>
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spinner" style={{ margin: '0 auto 8px' }} />
              <div>Loading consultations...</div>
            </div>
          ) : myBookings.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', backgroundColor: 'var(--surface-input)', borderRadius: '10px' }}>
              <Calendar size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>No consultations yet</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 12px' }}>
                Browse verified experts to schedule your first 1-on-1 session.
              </p>
              <button
                onClick={() => onBrowseExperts?.()}
                className="btn-pro"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Browse Experts
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {myBookings.map(b => {
                const expertId = b.expertId?._id || b.expertId;
                const expert = expertsList.find((item) => String(item._id) === String(expertId));
                const expertName = expert ? `${expert.firstName || ''} ${expert.lastName || ''}`.trim() : 'Expert';
                const serviceTitle = b.serviceId?.title || b.serviceTitle || 'Consultation Session';
                const scheduledTime = b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : 'Schedule unavailable';
                const price = Number.isFinite(Number(b.totalAmount)) ? new Intl.NumberFormat(undefined, { style: 'currency', currency: b.pricing?.currency || 'USD' }).format(Number(b.totalAmount)) : 'Amount unavailable';

                return (
                  <div key={b._id || b.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={16} color={accentColor} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1px' }}>
                          {expertName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {serviceTitle} • {scheduledTime} • {price}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge-status ${b.status === 'completed' || b.status === 'Completed' ? 'success' : b.status === 'confirmed' || b.status === 'Confirmed' ? 'purple' : 'info'}`} style={{ fontSize: '10px' }}>
                        {b.status}
                      </span>
                      {onJoinSession && (
                        <button
                          onClick={() => onJoinSession(b)}
                          style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: accentColor, color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Chat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Featured / Verified Experts */}
        <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={16} color="#f59e0b" /> Verified Advisors
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {featuredExperts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Connecting to expert network...
              </div>
            ) : (
              featuredExperts.map(expert => {
                const name = expert.name || (expert.user ? `${expert.user.firstName} ${expert.user.lastName}` : 'Expert Advisor');
                const rate = expert.hourlyRate || 150;
                const rating = expert.stats?.rating || expert.rating || 5.0;

                return (
                  <div key={expert._id || expert.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '700', fontSize: '14px'
                      }}>
                        {name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Star size={10} fill="#f59e0b" color="#f59e0b" /> {rating} • ${rate}/hr
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => onViewProfile && onViewProfile(expert)}
                        style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-primary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => onBook && onBook(expert)}
                        style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: accentColor, color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Zap size={10} /> Book
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
