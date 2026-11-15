import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, FileText, Mail, Calendar, Filter, Search,
  ChevronDown, Eye, MessageSquare, AlertCircle, Loader
} from 'lucide-react';
import expertsAPI from '../../api/experts.js';

export default function AdminVerificationDashboard({ theme }) {
  const isLight = theme === 'light';
  const accentColor = isLight ? '#2563eb' : '#8b5cf6';

  const [pendingExperts, setPendingExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Filter states
  const [filters, setFilters] = useState({
    category: '',
    search: '',
  });

  useEffect(() => {
    loadPendingExperts();
  }, [filters]);

  const loadPendingExperts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await expertsAPI.getPendingForApproval({
        category: filters.category || undefined,
        skip: 0,
        limit: 50,
      });
      setPendingExperts(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending experts');
      console.error('Failed to load pending experts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (expertId) => {
    try {
      setActionLoading(true);
      setActionMessage('');
      await expertsAPI.approveExpert(expertId, approvalNotes);
      setActionMessage('Expert approved successfully!');
      setSelectedExpert(null);
      setApprovalNotes('');
      setShowDetailModal(false);
      
      // Reload list
      setTimeout(() => {
        loadPendingExperts();
      }, 1000);
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to approve expert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (expertId) => {
    try {
      if (!rejectionReason.trim()) {
        setActionMessage('Please provide a rejection reason');
        return;
      }

      setActionLoading(true);
      setActionMessage('');
      await expertsAPI.rejectExpert(expertId, rejectionReason);
      setActionMessage('Expert rejected successfully!');
      setSelectedExpert(null);
      setRejectionReason('');
      setShowDetailModal(false);

      // Reload list
      setTimeout(() => {
        loadPendingExperts();
      }, 1000);
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to reject expert');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter by search
  const filteredExperts = pendingExperts.filter(expert => {
    const searchTerm = filters.search.toLowerCase();
    return (
      expert.user?.firstName?.toLowerCase().includes(searchTerm) ||
      expert.user?.lastName?.toLowerCase().includes(searchTerm) ||
      expert.user?.email?.toLowerCase().includes(searchTerm) ||
      expert.headline?.toLowerCase().includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', color: accentColor }} />
          <p>Loading pending experts...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, marginBottom: '4px' }}>
            Expert Verification
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Review and approve expert profiles
          </p>
        </div>

        <div style={{
          padding: '10px 16px',
          backgroundColor: accentColor + '18',
          color: accentColor,
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '700',
        }}>
          {filteredExperts.length} Pending Review
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Search
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email, or headline..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: '12px',
                padding: '10px 12px 10px 36px',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          >
            <option value="">All Categories</option>
            <option value="Technology">Technology</option>
            <option value="Business">Business</option>
            <option value="Marketing">Marketing</option>
            <option value="Design">Design</option>
            <option value="Finance">Finance</option>
            <option value="Health">Health & Wellness</option>
            <option value="Education">Education</option>
          </select>
        </div>
      </div>

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

      {/* Expert List */}
      {filteredExperts.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
        }}>
          <CheckCircle size={40} style={{ margin: '0 auto 16px', color: '#10b981', opacity: 0.3 }} />
          <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            No pending experts
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            All experts have been reviewed and processed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredExperts.map(expert => (
            <div
              key={expert._id}
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onClick={() => {
                setSelectedExpert(expert);
                setShowDetailModal(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isLight ? '#f8f9fa' : '#1a1a2e';
                e.currentTarget.style.borderColor = accentColor + '44';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-card)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              {/* Expert Info */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: accentColor + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: accentColor,
                  }}>
                    {expert.user?.firstName?.charAt(0)}{expert.user?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      {expert.user?.firstName} {expert.user?.lastName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      {expert.headline}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={12} />
                    {expert.user?.email}
                  </span>
                  {expert.category && (
                    <span style={{ padding: '2px 8px', backgroundColor: 'var(--surface-input)', borderRadius: '4px' }}>
                      {expert.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Submission Date */}
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  <Calendar size={12} />
                  {expert.verificationSubmittedAt ? new Date(expert.verificationSubmittedAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              {/* View Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedExpert(expert);
                  setShowDetailModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${accentColor}`,
                  backgroundColor: accentColor + '08',
                  color: accentColor,
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = accentColor;
                  e.target.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = accentColor + '08';
                  e.target.style.color = accentColor;
                }}
              >
                <Eye size={14} />
                Review
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedExpert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--surface-card)',
            borderRadius: '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            box: 'border-box',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Review Expert Profile
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedExpert(null);
                  setRejectionReason('');
                  setApprovalNotes('');
                  setActionMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', flex: 1, overflow: 'auto' }}>
              {/* Expert Header */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  backgroundColor: accentColor + '18',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: accentColor,
                  flexShrink: 0,
                }}>
                  {selectedExpert.user?.firstName?.charAt(0)}{selectedExpert.user?.lastName?.charAt(0)}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    {selectedExpert.user?.firstName} {selectedExpert.user?.lastName}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                    {selectedExpert.headline}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{selectedExpert.user?.email}</span>
                    {selectedExpert.category && <span>• {selectedExpert.category}</span>}
                    {selectedExpert.hourlyRate && <span>• ${selectedExpert.hourlyRate}/hr</span>}
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                    About
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6', margin: 0 }}>
                    {selectedExpert.bio}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                    Skills
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedExpert.skills?.map(skill => (
                      <span
                        key={skill}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: accentColor + '18',
                          color: accentColor,
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Documents */}
              {selectedExpert.documents && selectedExpert.documents.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                    Documents ({selectedExpert.documents.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedExpert.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          backgroundColor: 'var(--surface-input)',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        <FileText size={14} color={accentColor} />
                        <span style={{ color: 'var(--text-primary)', flex: 1 }}>{doc.name || `Document ${idx + 1}`}</span>
                        {doc.verified && (
                          <CheckCircle size={14} color="#10b981" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Message */}
              {actionMessage && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: actionMessage.includes('Failed') || actionMessage.includes('reject') ? '#fee2e2' : '#dcfce7',
                  border: actionMessage.includes('Failed') || actionMessage.includes('reject') ? '1px solid #fecaca' : '1px solid #bbf7d0',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: actionMessage.includes('Failed') || actionMessage.includes('reject') ? '#dc2626' : '#16a34a',
                }}>
                  {actionMessage}
                </div>
              )}

              {/* Approval Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about the approval..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Rejection Reason */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this profile is being rejected..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '20px 24px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--surface-input)',
            }}>
              <button
                onClick={() => {
                  handleReject(selectedExpert._id);
                }}
                disabled={actionLoading || !rejectionReason.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: actionLoading || !rejectionReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: actionLoading || !rejectionReason.trim() ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <XCircle size={14} />
                {actionLoading ? 'Processing...' : 'Reject'}
              </button>

              <button
                onClick={() => {
                  handleApprove(selectedExpert._id);
                }}
                disabled={actionLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <CheckCircle size={14} />
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
