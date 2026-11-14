import React from 'react';
import { Star, CheckCircle2, ArrowUpRight, Calendar } from 'lucide-react';

export default function ExpertCard({ expert, onBook, onViewProfile }) {
  return (
    <div className="expert-card">
      {/* Top Header */}
      <div className="expert-top">
        <div className="expert-avatar-box">
          <img src={expert.avatar} alt={expert.name} className="expert-avatar-img" />
          {expert.verified && (
            <div className="verified-badge" title="Verified Expert">
              ✓
            </div>
          )}
        </div>
        <div className="expert-meta">
          <h3>{expert.name}</h3>
          <div className="expert-role">{expert.role}</div>
          <div className="expert-company">{expert.company}</div>
        </div>
      </div>

      {/* Ratings & Hourly Rate Bar */}
      <div className="expert-ratings-bar">
        <div className="rating-stars">
          <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
          <span>{expert.rating}</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '11px' }}>
            ({expert.reviewsCount} reviews)
          </span>
        </div>
        <div className="hourly-rate-pill">
          ${expert.hourlyRate}<span>/hr</span>
        </div>
      </div>

      {/* Bio Snippet */}
      <p className="expert-bio-snippet">{expert.bio}</p>

      {/* Skills Tags */}
      <div className="expert-tags-list">
        {expert.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="expert-tag">
            {tag}
          </span>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="expert-card-actions">
        <button className="btn-book-session" onClick={() => onBook(expert)}>
          <Calendar size={14} />
          <span>Book Session</span>
        </button>
        <button className="btn-view-profile" onClick={() => onViewProfile(expert)}>
          <span>Profile</span>
          <ArrowUpRight size={13} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
        </button>
      </div>
    </div>
  );
}
