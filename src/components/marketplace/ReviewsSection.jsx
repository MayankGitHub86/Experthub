import React from 'react';
import { Star, MessageSquare } from 'lucide-react';

export default function ReviewsSection({ reviews = [], averageRating = 5, totalCount = 0 }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <MessageSquare size={32} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>No reviews yet</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>This expert hasn't received any reviews on their sessions yet.</p>
      </div>
    );
  }

  // Calculate rating distribution
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating]++;
  });

  return (
    <div style={{ marginTop: '20px' }}>
      
      {/* Review Summary Header */}
      <div style={{ 
        display: 'flex', 
        gap: '32px', 
        paddingBottom: '32px', 
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Big Number */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
            {averageRating.toFixed(1)}
          </div>
          <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', margin: '8px 0 4px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} size={14} fill={averageRating >= star ? "#f59e0b" : "transparent"} color={averageRating >= star ? "#f59e0b" : "var(--border-subtle)"} />
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Based on {totalCount} reviews
          </div>
        </div>

        {/* Rating Bars */}
        <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[5, 4, 3, 2, 1].map(stars => {
            const count = distribution[stars];
            const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
            return (
              <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                <div style={{ width: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{stars}</div>
                <Star size={12} fill="var(--text-muted)" color="var(--text-muted)" />
                <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--surface-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: '3px' }} />
                </div>
                <div style={{ width: '24px', textAlign: 'right', color: 'var(--text-muted)' }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {reviews.map(review => (
          <div key={review.id} style={{ display: 'flex', gap: '16px' }}>
            {/* Avatar */}
            {review.authorAvatar ? (
              <img 
                src={review.authorAvatar} 
                alt={review.authorName} 
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                backgroundColor: 'var(--surface-input)', color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '700'
              }}>
                {review.authorName.charAt(0)}
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{review.authorName}</div>
                  {review.authorRole && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{review.authorRole}</div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* Stars */}
              <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} size={12} fill={review.rating >= star ? "#f59e0b" : "transparent"} color={review.rating >= star ? "#f59e0b" : "var(--border-subtle)"} />
                ))}
              </div>

              {/* Comment */}
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '12px' }}>
                {review.comment}
              </p>

              {/* Tags */}
              {review.tags && review.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {review.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '4px 10px',
                      backgroundColor: 'var(--surface-input)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
