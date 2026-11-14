import React from 'react';
import { X, Bell, CheckCircle, Calendar, CreditCard, Sparkles } from 'lucide-react';

export default function NotificationsModal({ isOpen, onClose, notifications, onClear }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box"
        style={{ maxWidth: '440px', padding: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="var(--accent-purple-light)" />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Notifications ({notifications.length})
            </h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '10px'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: n.type === 'payment' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                color: n.type === 'payment' ? '#34d399' : '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {n.type === 'payment' ? <CreditCard size={16} /> : <Calendar size={16} />}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {n.message}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {n.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
