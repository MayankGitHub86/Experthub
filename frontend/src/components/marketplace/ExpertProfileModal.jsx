import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle, Calendar, ShieldCheck, Clock, Award, Loader } from 'lucide-react';
import ReviewsSection from './ReviewsSection';
import bookingsAPI from '../../api/bookings.js';

export default function ExpertProfileModal({ expert, onClose, onSelectPackage }) {
  const [activeTab, setActiveTab] = useState('about');
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    if (!expert) return;

    if (expert.packages && expert.packages.length > 0) {
      setServices(expert.packages);
      return;
    }

    if (expert.services && expert.services.length > 0) {
      setServices(expert.services.map(s => ({
        id: s._id || s.id,
        title: s.title || s.name,
        desc: s.description || s.desc || '',
        duration: typeof s.duration === 'number' ? `${s.duration} mins` : s.duration,
        price: s.pricing?.amount ?? s.price,
      })).filter((service) => Number.isFinite(Number(service.price))));
      return;
    }

    const expertId = expert._id || expert.id;
    if (expertId && String(expertId).match(/^[0-9a-fA-F]{24}$/)) {
      setLoadingServices(true);
      bookingsAPI.getExpertServices(expertId)
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setServices(data.map(s => ({
              id: s._id,
              title: s.title,
              desc: s.description || '',
              duration: `${s.duration} mins`,
              price: s.pricing?.amount,
            })).filter((service) => Number.isFinite(Number(service.price))));
          }
        })
        .catch(err => {
          console.error('Error fetching expert services:', err);
        })
        .finally(() => {
          setLoadingServices(false);
        });
    }
  }, [expert]);

  if (!expert) return null;

  const expertName = expert.name || `${expert.firstName || ''} ${expert.lastName || ''}`.trim() || 'Expert';
  const expertAvatar = expert.avatar || expert.profilePicture;
  const expertRole = expert.role || expert.headline || 'Verified Consultant';
  const expertCompany = expert.company || '';
  const expertRatingValue = Number(expert.stats?.rating || expert.rating) || 0;
  const expertRating = expertRatingValue ? expertRatingValue.toFixed(1) : 'New';
  const expertReviewsCount = expert.reviewsCount || expert.stats?.reviewCount || 0;
  const expertTags = expert.tags || expert.skills || [];
  const expertBadge = expert.badge || (expert.verificationStatus === 'approved' ? 'Verified' : 'Profile');
  const isVerified = expert.verified || expert.verificationStatus === 'approved';

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
            {expertAvatar ? <img src={expertAvatar} alt={expertName} style={{ width: '84px', height: '84px', borderRadius: '18px', objectFit: 'cover' }} /> : <div aria-hidden="true" style={{ width: '84px', height: '84px', borderRadius: '18px', display: 'grid', placeItems: 'center', background: 'var(--surface-input)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '24px' }}>{expertName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>}
            {isVerified && (
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
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>{expertName}</h2>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                {expertBadge}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--accent-purple-light)', fontWeight: '500', marginBottom: '4px' }}>
              {expertRole}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {expertCompany}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>
                <Star size={15} fill="#fbbf24" stroke="#fbbf24" />
                <span>{expertRating}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({expertReviewsCount} reviews)</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>
                ${expert.hourlyRate || 100}/hr
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
            Reviews ({expertReviewsCount})
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
                {expert.bio || 'Professional consultant available for advisory sessions.'}
              </p>
            </div>

            {/* Tags / Skills */}
            {expertTags.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Core Competencies
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {expertTags.map((tag) => (
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
            )}

            {/* Service Packages */}
            <div>
              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Available Consultation Packages
              </h4>
              {loadingServices ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px' }}>
                  <Loader size={16} className="animate-spin" />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading consultation packages...</span>
                </div>
              ) : services.length === 0 ? (
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  This expert has no active, approved services available to book right now.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {services.map((pkg) => (
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
                          {pkg.desc && (
                            <>
                              <span>•</span>
                              <span>{pkg.desc.substring(0, 50)}...</span>
                            </>
                          )}
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
              )}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewsSection 
            reviews={expert.reviews || []} 
            averageRating={expertRatingValue}
            totalCount={expertReviewsCount} 
          />
        )}
      </div>
    </div>
  );
}
