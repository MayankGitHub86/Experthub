import React, { useState, useEffect } from 'react';
import {
  CheckCircle, AlertCircle, Clock, FileText, Send, Loader,
  AlertTriangle, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';
import expertsAPI from '../../api/experts.js';

const PROFILE_CHECKLIST = [
  { id: 'headline', label: 'Professional Headline', field: 'headline' },
  { id: 'bio', label: 'Biography', field: 'bio' },
  { id: 'category', label: 'Category', field: 'category' },
  { id: 'skills', label: 'Skills (at least 3)', field: 'skills', check: (v) => Array.isArray(v) && v.length >= 3 },
  { id: 'hourlyRate', label: 'Hourly Rate', field: 'hourlyRate', check: (v) => v && parseFloat(v) > 0 },
  { id: 'availability', label: 'Weekly Schedule', field: 'availability' },
  { id: 'profilePublic', label: 'Profile Public', field: 'profilePublic' },
];

export default function ExpertVerificationSubmission({ theme, onComplete }) {
  const isLight = theme === 'light';
  const accentColor = isLight ? '#2563eb' : '#8b5cf6';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    checklist: true,
    details: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const prof = await expertsAPI.getMyProfile();
      setProfile(prof);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getChecklistProgress = () => {
    if (!profile) return 0;

    const completed = PROFILE_CHECKLIST.filter(item => {
      const value = profile[item.field];
      if (item.check) return item.check(value);
      return value && (typeof value === 'string' ? value.trim() : value);
    }).length;

    return {
      completed,
      total: PROFILE_CHECKLIST.length,
      percentage: Math.round((completed / PROFILE_CHECKLIST.length) * 100),
    };
  };

  const isProfileComplete = () => {
    const progress = getChecklistProgress();
    return progress.completed === progress.total;
  };

  const handleSubmit = async () => {
    try {
      if (!isProfileComplete()) {
        setError('Please complete all profile requirements before submitting');
        return;
      }

      setSubmitting(true);
      setError(null);

      await expertsAPI.submitForVerification();

      setSuccess(true);
      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit profile for verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', color: accentColor }} />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        padding: '32px',
        borderRadius: '14px',
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
        textAlign: 'center',
      }}>
        <AlertCircle size={40} style={{ margin: '0 auto 16px', color: '#dc2626' }} />
        <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>
          No profile found. Please create a profile first.
        </p>
      </div>
    );
  }

  // If already verified or rejected, show status
  if (profile.verificationStatus === 'approved') {
    return (
      <div style={{
        padding: '32px',
        borderRadius: '14px',
        backgroundColor: '#dcfce7',
        border: '1px solid #bbf7d0',
        textAlign: 'center',
      }}>
        <CheckCircle size={40} style={{ margin: '0 auto 16px', color: '#16a34a' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#15803d', margin: '0 0 8px 0' }}>
          Profile Approved! ✓
        </h2>
        <p style={{ fontSize: '14px', color: '#166534', margin: 0 }}>
          Your profile has been verified and is now visible to clients.
        </p>
      </div>
    );
  }

  if (profile.verificationStatus === 'submitted' || profile.verificationStatus === 'under_review') {
    return (
      <div style={{
        padding: '32px',
        borderRadius: '14px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fcd34d',
        textAlign: 'center',
      }}>
        <Clock size={40} style={{ margin: '0 auto 16px', color: '#b45309' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#92400e', margin: '0 0 8px 0' }}>
          Under Review
        </h2>
        <p style={{ fontSize: '14px', color: '#78350f', margin: 0, lineHeight: '1.6' }}>
          Your profile has been submitted for verification. Our admin team will review it within 1-2 business days.
          You'll receive an email notification once the review is complete.
        </p>
      </div>
    );
  }

  if (profile.verificationStatus === 'rejected') {
    return (
      <div style={{
        padding: '32px',
        borderRadius: '14px',
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
      }}>
        <AlertTriangle size={40} style={{ margin: '0 auto 16px', color: '#dc2626' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#7f1d1d', margin: '0 0 12px 0' }}>
          Profile Rejected
        </h2>
        {profile.verificationNotes && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#7f1d1d',
            textAlign: 'left',
            lineHeight: '1.6',
          }}>
            <strong>Reason:</strong>
            <p style={{ margin: '8px 0 0 0' }}>{profile.verificationNotes}</p>
          </div>
        )}
        <p style={{ fontSize: '13px', color: '#991b1b', margin: 0, lineHeight: '1.6' }}>
          Please update your profile to address the feedback and submit again for review.
        </p>
      </div>
    );
  }

  // Draft status - show submission form
  const progress = getChecklistProgress();
  const isComplete = isProfileComplete();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      {/* Status Header */}
      <div style={{
        padding: '20px 24px',
        borderRadius: '14px',
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
          Submit Profile for Verification
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
          Once you submit your profile, our admin team will review it and verify your credentials. This typically takes 1-2 business days.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={16} color="#dc2626" />
          <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor: '#dcfce7',
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle size={16} color="#16a34a" />
          <span style={{ fontSize: '13px', color: '#16a34a' }}>Profile submitted successfully! Redirecting...</span>
        </div>
      )}

      {/* Profile Completeness Checklist */}
      <div style={{
        borderRadius: '14px',
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setExpandedSections(prev => ({
            ...prev,
            checklist: !prev.checklist
          }))}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: expandedSections.checklist ? '1px solid var(--border-subtle)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isComplete ? '#dcfce7' : accentColor + '18',
            }}>
              {isComplete ? (
                <CheckCircle size={20} color="#16a34a" />
              ) : (
                <FileText size={20} color={accentColor} />
              )}
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Profile Completeness
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {progress.completed} of {progress.total} items complete
              </p>
            </div>
          </div>
          {expandedSections.checklist ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSections.checklist && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-subtle)' }}>
            {/* Progress Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Progress</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {progress.percentage}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'var(--surface-input)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress.percentage}%`,
                  height: '100%',
                  backgroundColor: isComplete ? '#10b981' : accentColor,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            {/* Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PROFILE_CHECKLIST.map(item => {
                const value = profile[item.field];
                const isChecked = item.check ? item.check(value) : value && (typeof value === 'string' ? value.trim() : value);

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isChecked ? '#dcfce7' : 'var(--surface-input)',
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isChecked ? '#10b981' : 'var(--border-subtle)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}>
                      {isChecked ? '✓' : ' '}
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: isChecked ? '#166534' : 'var(--text-secondary)',
                      flex: 1,
                    }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Profile Details Summary */}
      <div style={{
        borderRadius: '14px',
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setExpandedSections(prev => ({
            ...prev,
            details: !prev.details
          }))}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: expandedSections.details ? '1px solid var(--border-subtle)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: accentColor + '18',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={20} color={accentColor} />
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Profile Details
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Review your profile information
              </p>
            </div>
          </div>
          {expandedSections.details ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSections.details && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                Headline
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>
                {profile.headline || '—'}
              </p>
            </div>

            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                Hourly Rate
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: '700' }}>
                ${profile.hourlyRate || '—'}/hour
              </p>
            </div>

            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                Category
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>
                {profile.category || '—'}
              </p>
            </div>

            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                Languages
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>
                {profile.languages?.join(', ') || '—'}
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                About
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5' }}>
                {profile.bio || '—'}
              </p>
            </div>

            {profile.skills && profile.skills.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                  Skills
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.skills.map(skill => (
                    <span key={skill} style={{
                      padding: '4px 10px',
                      backgroundColor: accentColor + '18',
                      color: accentColor,
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submission Instructions */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '12px',
        backgroundColor: accentColor + '08',
        border: `1px solid ${accentColor}22`,
        display: 'flex',
        gap: '12px',
      }}>
        <AlertCircle size={18} color={accentColor} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            Before submitting:
          </p>
          <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Make sure all required fields are completed</li>
            <li>Review your profile for accuracy and professionalism</li>
            <li>Upload all necessary certifications and credentials</li>
            <li>Verify your availability settings are correct</li>
          </ul>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !isComplete || success}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '14px 24px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: isComplete ? accentColor : '#ccc',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '700',
          cursor: isComplete && !submitting && !success ? 'pointer' : 'not-allowed',
          opacity: isComplete && !submitting && !success ? 1 : 0.6,
          transition: 'all 0.2s ease',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          if (isComplete && !submitting && !success) {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = `0 6px 20px ${accentColor}33`;
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }}
      >
        {submitting ? (
          <>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Submitting...
          </>
        ) : success ? (
          <>
            <CheckCircle size={16} />
            Submitted Successfully!
          </>
        ) : (
          <>
            <Send size={16} />
            Submit Profile for Verification
            {isComplete && <ArrowRight size={16} />}
          </>
        )}
      </button>

      {!isComplete && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          Complete all profile requirements to submit
        </p>
      )}
    </div>
  );
}
