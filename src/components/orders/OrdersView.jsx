import React, { useState } from 'react';
import { initialBookings } from '../../data/mockBookings';
import { Calendar, Search, Filter, Video, FileText, CheckCircle2, Star } from 'lucide-react';
import ReviewModal from '../marketplace/ReviewModal';

export default function OrdersView({ onJoinSession }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [activeReviewOrder, setActiveReviewOrder] = useState(null);

  const filtered = initialBookings.filter((b) => {
    const matchFilter = filter === 'All' || b.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = 
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.expertName.toLowerCase().includes(search.toLowerCase()) ||
      b.serviceTitle.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="view-header">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
            WooCommerce Bookings & Orders
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Live transactions synced with WooCommerce Bookings REST API
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {['All', 'Confirmed', 'In Session', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`filter-btn ${filter === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="card-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((booking) => (
            <div
              key={booking.id}
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
              {/* Client & Booking ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                <img 
                  src={booking.clientAvatar} 
                  alt={booking.clientName} 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-purple-light)' }}>
                      {booking.id}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {booking.clientName}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {booking.clientEmail}
                  </div>
                </div>
              </div>

              {/* Service & Expert */}
              <div style={{ minWidth: '220px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {booking.serviceTitle}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Advisor: <strong style={{ color: 'var(--text-secondary)' }}>{booking.expertName}</strong>
                </div>
              </div>

              {/* Time & Fee */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  ${booking.amount}.00
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {booking.date} • {booking.time}
                </div>
              </div>

              {/* Status & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge-status ${booking.status === 'Completed' ? 'success' : booking.status === 'In Session' ? 'purple' : 'info'}`}>
                  {booking.status}
                </span>

                {booking.roomReady && (
                  <button
                    onClick={() => onJoinSession(booking)}
                    className="btn-pro"
                    style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}
                  >
                    <Video size={13} />
                    <span>Enter Room</span>
                  </button>
                )}

                {booking.status === 'Completed' && (
                  <button
                    onClick={() => setActiveReviewOrder(booking)}
                    style={{
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Star size={13} />
                    Leave Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeReviewOrder && (
        <ReviewModal
          expertName={activeReviewOrder.expertName}
          consultationDate={activeReviewOrder.date}
          onClose={() => setActiveReviewOrder(null)}
        />
      )}
    </div>
  );
}
