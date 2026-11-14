import React from 'react';
import { X, Crown, Check, Zap, Shield, Sparkles } from 'lucide-react';

export default function UpgradeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 12px auto',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
          }}>
            <Crown size={24} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Upgrade to ExpertHub Pro
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Empower your consulting business or enterprise with automated matching, priority payouts, and white-label tools.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Pro Consultant */}
          <div style={{
            backgroundColor: 'var(--surface-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '20px'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Pro Consultant
            </h4>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              For high-volume advisors
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
              $49<span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '400' }}>/mo</span>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="#34d399" /> 5% platform fee (vs 15% standard)</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="#34d399" /> Instant Stripe daily payouts</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="#34d399" /> Verified Gold badge on profile</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="#34d399" /> Custom booking domain</li>
            </ul>

            <button className="btn-view-profile" style={{ width: '100%', textAlign: 'center' }}>
              Choose Pro
            </button>
          </div>

          {/* Enterprise Platform */}
          <div style={{
            backgroundColor: 'var(--surface-input)',
            border: '1.5px solid var(--accent-purple)',
            borderRadius: '14px',
            padding: '20px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '16px',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              RECOMMENDED
            </div>

            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Enterprise Platform
            </h4>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              For marketplaces & agencies
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
              $199<span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '400' }}>/mo</span>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="#34d399" /> Dedicated AI Matching Agent API</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="#34d399" /> Unlimited concurrent video rooms</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="#34d399" /> Full WooCommerce & WP sync</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} color="#34d399" /> 24/7 Priority SLA support</li>
            </ul>

            <button className="btn-pro" style={{ width: '100%' }}>
              Upgrade to Enterprise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
