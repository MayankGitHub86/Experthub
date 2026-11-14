import React, { useState } from 'react';
import { X, Star, CheckCircle, Calendar, ShieldCheck, Clock, Award } from 'lucide-react';
import ReviewsSection from './ReviewsSection';

export default function ExpertProfileModal({ expert, onClose, onSelectPackage }) {
  const [activeTab, setActiveTab] = useState('about');
  if (!expert) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box"
        style={{ maxWidth: '680px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Header Profile Section */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={expert.avatar} 
              alt={expert.name} 
              style={{ width: '84px', height: '84px', borderRadius: '18px', objectFit: 'cover' }}
            />
            {expert.verified && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  background: 'var(--accent-purple)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid var(--surface-card)'
                }}
              >
                <CheckCircle size={14} />
              </div>
            )}
          </div>

          <div style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>{expert.name}</h2>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                {expert.badge}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--accent-purple-light)', fontWeight: '500', marginBottom: '4px' }}>
              {expert.role}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {expert.company}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>
                <Star size={15} fill="#fbbf24" stroke="#fbbf24" />
                <span>{expert.rating}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({expert.reviewsCount} verified reviews)</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>
                ${expert.hourlyRate}/hr
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('about')}
            style={{
              padding: '0 0 12px 0',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              color: activeTab === 'about' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'about' ? '2px solid var(--accent-purple)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            About & Packages
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            style={{
              padding: '0 0 12px 0',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              color: activeTab === 'reviews' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'reviews' ? '2px solid var(--accent-purple)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            Reviews ({expert.reviewsCount})
          </button>
        </div>

        {activeTab === 'about' && (
          <div>
            {/* Bio */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                About Advisor
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {expert.bio}
              </p>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '28px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Core Competencies
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {expert.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Service Packages */}
            <div>
              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Available Consultation Packages
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {expert.packages.map((pkg) => (
                  <div 
                    key={pkg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-input)',
                      border: '1px solid var(--border-subtle)',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {pkg.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} />
                        <span>{pkg.duration}</span>
                        <span>•</span>
                        <span>{pkg.desc}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        ${pkg.price}
                      </div>
                      <button 
                        className="btn-pro" 
                        style={{ padding: '8px 14px', width: 'auto' }}
                        onClick={() => onSelectPackage(expert, pkg)}
                      >
                        <Calendar size={13} />
                        <span>Book Now</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewsSection 
            reviews={expert.reviews} 
            averageRating={expert.rating} 
            totalCount={expert.reviewsCount} 
          />
        )}
      </div>
    </div>
  );
}
