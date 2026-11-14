import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Video, FileText, CheckCircle2, Star, AlertCircle, Loader } from 'lucide-react';
import ReviewModal from '../marketplace/ReviewModal';
import bookingsAPI from '../../api/bookings.js';

export default function OrdersView({ onJoinSession }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [activeReviewOrder, setActiveReviewOrder] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load bookings from API on mount
  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await bookingsAPI.getMyBookings({ limit: 100 });
        setBookings(Array.isArray(result.bookings) ? result.bookings : []);
      } catch (err) {
        console.error('Error loading bookings:', err);
        setError(err.response?.data?.message || 'Failed to load bookings');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const filtered = bookings.filter((b) => {
    const status = b.status || 'payment_pending';
    const matchFilter = filter === 'All' || status.toLowerCase().includes(filter.toLowerCase());
    const matchSearch = 
      (b.expertId?.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.expertId?.lastName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.serviceId?.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (b._id || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="view-header">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
            My Bookings & Orders
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Your consultation bookings and session history
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {['All', 'payment_pending', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`filter-btn ${filter === tab ? 'active' : ''}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card-container">
        {loading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '60px 20px',
            gap: '12px'
          }}>
            <Loader className="spinner" size={32} />
            <span style={{ color: 'var(--text-secondary)' }}>Loading bookings...</span>
          </div>
        )}

        {error && !loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5'
          }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No bookings found</p>
            <p style={{ fontSize: '12px' }}>Book a consultation to get started</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((booking) => (
              <div
                key={booking._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                {/* Booking ID & Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                  <Calendar size={20} color="var(--accent-purple)" />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-purple-light)' }}>
                        {booking._id?.substring(0, 8).toUpperCase()}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {new Date(booking.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Service & Expert */}
                <div style={{ minWidth: '220px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {booking.serviceId?.title || 'Consultation'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Expert: <strong style={{ color: 'var(--text-secondary)' }}>
                      {booking.expertId?.firstName} {booking.expertId?.lastName}
                    </strong>
                  </div>
                </div>

                {/* Duration & Price */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    ${booking.pricing?.totalAmount || booking.pricing?.baseAmount || '0.00'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {booking.duration} minutes
                  </div>
                </div>

                {/* Status & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: booking.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                     booking.status === 'payment_pending' ? 'rgba(59, 130, 246, 0.1)' : 
                                     'rgba(139, 92, 246, 0.1)',
                    color: booking.status === 'completed' ? '#86efac' :
                           booking.status === 'payment_pending' ? '#93c5fd' : '#c4b5fd'
                  }}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeReviewOrder && (
        <ReviewModal
          expertName={activeReviewOrder.expertId?.firstName}
          consultationDate={new Date(activeReviewOrder.scheduledAt).toLocaleDateString()}
          onClose={() => setActiveReviewOrder(null)}
        />
      )}
    </div>
  );
}
