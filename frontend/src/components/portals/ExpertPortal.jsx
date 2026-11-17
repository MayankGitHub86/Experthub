import React, { useState, useEffect } from 'react';
import {
  Star, DollarSign, Calendar, Users, Clock, TrendingUp,
  Video, CheckCircle, ToggleLeft, ToggleRight, Award,
  ArrowUpRight, MessageSquare, Zap, Edit3, AlertCircle, Loader,
  Plus, Check, Power
} from 'lucide-react';
import expertsAPI from '../../api/experts.js';
import bookingsAPI from '../../api/bookings.js';
import servicesAPI from '../../api/services.js';
import ExpertProfileForm from './ExpertProfileForm.jsx';
import ExpertStripeOnboarding from './ExpertStripeOnboarding.jsx';
import ReviewModal from '../marketplace/ReviewModal.jsx';

export default function ExpertPortal({ onJoinSession, theme }) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expertProfile, setExpertProfile] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [showCreateService, setShowCreateService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    category: 'technology-consulting',
    duration: 60,
    amount: 150,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);

  const isLight = theme === 'light';
  const accentColor = isLight ? '#2563eb' : '#8b5cf6';

  // Load expert profile and bookings on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch expert profile
      const profile = await expertsAPI.getMyProfile().catch(() => null);
      if (profile) {
        setExpertProfile(profile);
        setIsAvailable(profile.acceptingBookings ?? true);
      }

      // Try to fetch bookings
      const bookingsData = await bookingsAPI.getMyBookings({ limit: 50 }).catch(() => null);
      if (bookingsData?.bookings) {
        setMyBookings(bookingsData.bookings);
      }

      // Try to fetch expert services
      const servicesData = await servicesAPI.getMyServices().catch(() => null);
      if (Array.isArray(servicesData)) {
        setMyServices(servicesData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      // Fallback: don't show error, use empty state
    } finally {
      setLoading(false);
    }
  };

  const handleToggleService = async (service) => {
    try {
      if (service.isActive) {
        await servicesAPI.deactivate(service._id);
      } else {
        await servicesAPI.activate(service._id);
      }
      const updated = await servicesAPI.getMyServices().catch(() => []);
      if (Array.isArray(updated)) setMyServices(updated);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update service status');
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      const newService = await servicesAPI.create({
        title: serviceForm.title,
        description: serviceForm.description,
        category: serviceForm.category,
        duration: Number(serviceForm.duration),
        pricing: {
          type: 'fixed',
          amount: Number(serviceForm.amount),
          currency: 'USD'
        }
      });
      // Activate service immediately so it's bookable
      if (newService?._id) {
        await servicesAPI.activate(newService._id).catch(() => {});
      }
      setShowCreateService(false);
      setServiceForm({
        title: '',
        description: '',
        category: 'technology-consulting',
        duration: 60,
        amount: 150,
      });
      const updated = await servicesAPI.getMyServices().catch(() => []);
      if (Array.isArray(updated)) setMyServices(updated);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create service');
    }
  };

  // Show profile form if no profile exists
  if (expertProfile && showProfileForm) {
    return (
      <ExpertProfileForm
        theme={theme}
        onComplete={() => {
          setShowProfileForm(false);
          loadData();
        }}
      />
    );
  }

  // If loading and no profile yet, show spinner
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', color: accentColor }} />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // If no profile, show profile creation prompt
  if (!expertProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{
          padding: '32px',
          borderRadius: '16px',
          backgroundColor: accentColor + '12',
          border: `2px solid ${accentColor}`,
          textAlign: 'center',
        }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px', color: accentColor }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            Complete Your Expert Profile
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: '1.6' }}>
            You need to create a complete expert profile before you can start accepting bookings and appearing in the marketplace.
          </p>
          <button
            onClick={() => setShowProfileForm(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: accentColor,
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <Edit3 size={16} />
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  // Calculate stats from bookings
  const completedSessions = myBookings.filter(b => b.status === 'Completed').length;
  const upcomingSessions = myBookings.filter(b => b.status === 'Confirmed' || b.status === 'In Session');
  const totalEarned = myBookings.reduce((sum, b) => {
    const expertFee = b.totalPrice ? Math.floor(b.totalPrice * 0.85) : 0; // 85% to expert
    return sum + expertFee;
  }, 0);
  const pendingPayout = upcomingSessions.reduce((sum, b) => {
    const expertFee = b.totalPrice ? Math.floor(b.totalPrice * 0.85) : 0;
    return sum + expertFee;
  }, 0);

  const statCards = [
    { label: 'Total Earned', value: `$${totalEarned.toLocaleString()}`, icon: DollarSign, trend: '+12%', color: '#10b981' },
    { label: 'This Month', value: `$${(totalEarned * 0.3).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: TrendingUp, trend: '+8%', color: '#3b82f6' },
    { label: 'Pending Payout', value: `$${pendingPayout}`, icon: Clock, trend: null, color: '#f59e0b' },
    { label: 'Total Sessions', value: myBookings.length, icon: Users, trend: `${completedSessions} done`, color: '#8b5cf6' },
  ];

  const reviews = expertProfile.reviews || [];

  // Determine verification status display
  const getVerificationBadge = () => {
    const status = expertProfile.verificationStatus;
    if (status === 'approved') {
      return { label: 'Verified', color: '#10b981', bgColor: '#dcfce7' };
    } else if (status === 'submitted' || status === 'under_review') {
      return { label: 'Under Review', color: '#f59e0b', bgColor: '#fef3c7' };
    } else if (status === 'rejected') {
      return { label: 'Rejected', color: '#ef4444', bgColor: '#fee2e2' };
    } else if (status === 'draft' || !status) {
      return { label: 'Not Submitted', color: '#6b7280', bgColor: '#f3f4f6' };
    }
    return null;
  };

  const verificationBadge = getVerificationBadge();

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
            <div style={{
              width: '72px', height: '72px', borderRadius: '16px',
              backgroundColor: accentColor + '66',
              objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '700',
              color: '#fff'
            }}>
              {expertProfile.user?.firstName?.charAt(0)}{expertProfile.user?.lastName?.charAt(0)}
            </div>
            <div style={{
              position: 'absolute', bottom: '-4px', right: '-4px',
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: isAvailable ? '#10b981' : '#6b7280',
              border: '2px solid white'
            }} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
              Welcome back, {expertProfile.user?.firstName}!
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
              {expertProfile.headline}
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {expertProfile.stats?.rating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={13} fill="#fbbf24" color="#fbbf24" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>
                    {expertProfile.stats.rating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    ({expertProfile.stats.reviewCount || 0} reviews)
                  </span>
                </div>
              )}
              <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                ${expertProfile.hourlyRate}/hr
              </span>
              {verificationBadge && (
                <>
                  <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    backgroundColor: verificationBadge.bgColor,
                    color: verificationBadge.color,
                    borderRadius: '6px'
                  }}>
                    {verificationBadge.label}
                  </span>
                </>
              )}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0', flexWrap: 'wrap' }}>
        {['overview', 'sessions', 'services', 'payments', 'profile', 'reviews'].map(tab => (
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
            {tab === 'profile' && '⚙ '}
            {tab === 'overview' ? 'Overview' : tab === 'sessions' ? `Sessions (${myBookings.length})` : tab === 'services' ? `Services (${myServices.length})` : tab === 'payments' ? 'Payments' : tab === 'profile' ? 'Settings' : `Reviews (${reviews.length})`}
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
            {upcomingSessions.length > 0 ? upcomingSessions.slice(0, 3).map(s => (
              <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {s.clientId?.firstName} {s.clientId?.lastName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(s.startTime).toLocaleDateString()} • {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {s.serviceId?.title || 'Consultation'}
                  </div>
                </div>
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
            {reviews.length > 0 ? reviews.slice(0, 2).map((r, idx) => (
              <div key={idx} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {r.clientName || 'Anonymous'}
                  </span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={11} fill={r.rating >= s ? '#f59e0b' : 'transparent'} color={r.rating >= s ? '#f59e0b' : 'var(--border-subtle)'} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  "{(r.text || r.comment || '').slice(0, 100)}..."
                </p>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No reviews yet. Complete sessions to receive feedback.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {myBookings.length > 0 ? myBookings.map(s => (
            <div key={s._id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: '12px', flexWrap: 'wrap', gap: '12px',
              backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {s.clientId?.firstName} {s.clientId?.lastName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {s.serviceId?.title || 'Consultation'}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  {new Date(s.startTime).toLocaleDateString()} • {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>
                    +${Math.floor((s.totalPrice || 0) * 0.85)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>your earnings</div>
                </div>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: s.status === 'Completed' ? '#dcfce7' : s.status === 'In Session' ? accentColor + '18' : '#f3f4f6',
                  color: s.status === 'Completed' ? '#16a34a' : s.status === 'In Session' ? accentColor : '#6b7280',
                }}>
                  {s.status}
                </span>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Calendar size={36} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <p style={{ fontSize: '14px', margin: 0 }}>No bookings yet. Complete your profile and start accepting clients!</p>
            </div>
          )}
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                Consultation Services & Packages
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Manage your services, set pricing, and control which services are active in the marketplace.
              </p>
            </div>
            <button
              onClick={() => setShowCreateService(!showCreateService)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: accentColor,
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>{showCreateService ? 'Cancel' : 'Create New Service'}</span>
            </button>
          </div>

          {/* Create Service Form */}
          {showCreateService && (
            <form onSubmit={handleCreateService} style={{
              padding: '24px',
              borderRadius: '14px',
              backgroundColor: 'var(--surface-card)',
              border: `2px solid ${accentColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                New Service Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Service Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                    placeholder="e.g., 60-Minute Architecture Consultation"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  >
                    <option value="business-consulting">Business Consulting</option>
                    <option value="career-coaching">Career Coaching</option>
                    <option value="financial-advice">Financial Advice</option>
                    <option value="technology-consulting">Technology Consulting</option>
                    <option value="marketing-strategy">Marketing Strategy</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    required
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={serviceForm.amount}
                    onChange={(e) => setServiceForm({ ...serviceForm, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Description *
                </label>
                <textarea
                  rows="3"
                  required
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Describe what client will get from this consultation..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateService(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: accentColor,
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Create & Activate Service
                </button>
              </div>
            </form>
          )}

          {/* Services List */}
          {myServices.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {myServices.map((service) => (
                <div
                  key={service._id}
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: service.isActive ? '#dcfce7' : '#fee2e2',
                        color: service.isActive ? '#16a34a' : '#dc2626'
                      }}>
                        {service.isActive ? 'Active in Marketplace' : 'Inactive'}
                      </span>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: 'var(--surface-input)',
                        color: 'var(--text-muted)'
                      }}>
                        {service.status || 'draft'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                      {service.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                      {service.description}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        ${service.pricing?.amount || service.price}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {service.duration} minutes
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleService(service)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: service.isActive ? '#fee2e2' : '#dcfce7',
                        color: service.isActive ? '#dc2626' : '#16a34a',
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <Power size={13} />
                      <span>{service.isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
              <Zap size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                No Services Created Yet
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                Create consultation tiers so clients can book specific packages directly from your profile.
              </p>
              <button
                onClick={() => setShowCreateService(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: accentColor,
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Create Your First Service
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <ExpertStripeOnboarding />
      )}

      {/* Profile Settings Tab */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            onClick={() => setShowProfileForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              borderRadius: '12px',
              border: `1px solid ${accentColor}`,
              backgroundColor: accentColor + '08',
              color: accentColor,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = accentColor;
              e.target.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = accentColor + '08';
              e.target.style.color = accentColor;
            }}
          >
            <Edit3 size={16} />
            Edit Profile & Availability
          </button>

          {/* Verification Status Info */}
          <div style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              Verification Status
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
              Your profile is currently <strong>{expertProfile.verificationStatus || 'draft'}</strong>.
              {expertProfile.verificationStatus === 'draft' && (
                <>
                  {' '}Once you complete your profile, you can submit it for admin review.
                </>
              )}
              {expertProfile.verificationStatus === 'submitted' && (
                <>
                  {' '}Our team is reviewing your profile. This typically takes 1-2 business days.
                </>
              )}
              {expertProfile.verificationStatus === 'approved' && (
                <>
                  {' '} ✓ Your profile has been approved! You're now visible to clients.
                </>
              )}
              {expertProfile.verificationStatus === 'rejected' && (
                <>
                  {' '}Please update your profile and resubmit for review.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {reviews.length > 0 ? reviews.map((r, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '16px', padding: '20px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: accentColor + '18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700',
                color: accentColor,
                flexShrink: 0
              }}>
                {(r.clientName || 'A').charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {r.clientName || 'Anonymous'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={14} fill={r.rating >= s ? '#f59e0b' : 'transparent'} color={r.rating >= s ? '#f59e0b' : 'var(--border-subtle)'} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '12px', margin: 0 }}>
                  {r.text || r.comment}
                </p>
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
