import React, { useState } from 'react';
import { X, Star, ThumbsUp, MessageSquare, CheckCircle } from 'lucide-react';

export default function ReviewModal({ onClose, expertName = "Dr. Aris Thorne", consultationDate = "Today" }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const availableTags = [
    "Highly Actionable",
    "Deep Expertise",
    "Clear Communicator",
    "Problem Solver",
    "Great Listener",
    "Detailed Notes",
    "Punctual",
    "Empathetic"
  ];

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) return;
    
    // Simulate submission
    setTimeout(() => {
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: 'var(--surface-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-modal)',
        overflow: 'hidden',
        position: 'relative',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Rate your consultation</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              with {expertName} • {consultationDate}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {isSubmitted ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <CheckCircle size={32} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Review Submitted!
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Thank you for sharing your feedback. It helps our community find the best experts.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            
            {/* Star Rating Section */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                How would you rate your session?
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'transform 0.1s ease'
                    }}
                  >
                    <Star
                      size={40}
                      fill={(hoverRating || rating) >= star ? "#f59e0b" : "transparent"}
                      color={(hoverRating || rating) >= star ? "#f59e0b" : "var(--border-subtle)"}
                      style={{ 
                        transition: 'all 0.2s ease',
                        transform: hoverRating === star ? 'scale(1.15)' : 'scale(1)'
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ThumbsUp size={14} /> What did they do well? <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(Optional)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: isSelected ? 'var(--accent-purple)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        border: `1px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-subtle)'}`
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Feedback Section */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={14} /> Written Feedback <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(Optional)</span>
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience... Was the advice actionable? Did they solve your problem?"
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--surface-input)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={rating === 0}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: rating > 0 ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  color: rating > 0 ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: rating > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  boxShadow: rating > 0 ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                Submit Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
