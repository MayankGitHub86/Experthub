import React, { useState, useEffect, useCallback } from 'react';
import { X, CreditCard, Calendar, Sparkles, Video, Bell } from 'lucide-react';

const TYPE_CONFIG = {
  payment: {
    icon: CreditCard,
    accent: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.25)',
    label: 'Payment'
  },
  booking: {
    icon: Calendar,
    accent: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.25)',
    label: 'Booking'
  },
  ai: {
    icon: Sparkles,
    accent: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.25)',
    label: 'AI Match'
  },
  session: {
    icon: Video,
    accent: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)',
    label: 'Session'
  },
  system: {
    icon: Bell,
    accent: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.2)',
    label: 'System'
  }
};

function Toast({ toast, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.system;
  const Icon = config.icon;

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });

    // Auto-dismiss after 5s unless paused
    let timer;
    if (!isPaused) {
      timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove(toast.id), 350);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [toast.id, isPaused]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 350);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '14px',
        backgroundColor: '#0f1629',
        border: `1px solid ${config.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${config.border}`,
        width: '340px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0) scale(1)' : 'translateX(80px) scale(0.96)',
        backdropFilter: 'blur(16px)'
      }}
    >
      {/* Progress bar at the bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '2px',
        backgroundColor: 'rgba(255,255,255,0.05)'
      }}>
        <div style={{
          height: '100%',
          backgroundColor: config.accent,
          width: '100%',
          transformOrigin: 'left',
          animation: isPaused ? 'none' : 'toastProgress 5s linear forwards',
          opacity: 0.7
        }} />
      </div>

      {/* Icon */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        backgroundColor: config.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: `1px solid ${config.border}`
      }}>
        <Icon size={17} color={config.accent} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: config.accent,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {config.label}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>•</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>just now</span>
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#f8fafc',
          marginBottom: '3px',
          lineHeight: '1.3'
        }}>
          {toast.title}
        </div>
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: '1.4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {toast.message}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
          padding: '2px',
          flexShrink: 0,
          transition: 'color 0.2s',
          display: 'flex'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-end',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'all' }}>
            <Toast toast={toast} onRemove={onRemove} />
          </div>
        ))}
      </div>
    </>
  );
}
