import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import paymentsAPI from '../../api/payments.js';

/**
 * Admin Payment Management Component
 * 
 * Admin-only view for managing payments, refunds, and financial reconciliation:
 * - View all payments with commission breakdown (15% platform / 85% expert)
 * - Filter by status, booking, client, or expert
 * - Process refunds with reason tracking
 * - View payout settlement history
 */
export default function AdminPaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, succeeded, failed, refunded, pending
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('customer_requested');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(null);

  /**
   * Load payments on mount
   */
  useEffect(() => {
    loadPayments();
  }, []);

  /**
   * Filter payments when search or filter changes
   */
  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // This would call a backend endpoint to get all payments
      // For now, we'll show the UI ready to integrate with backend
      // Backend endpoint: GET /api/v1/payments (admin only)
      // const response = await client.get('/payments');
      // setPayments(response.data.data);

      // Mock data for demonstration
      setPayments([
        {
          id: 'pi_1234567890',
          bookingId: 'booking_001',
          clientName: 'Sarah Johnson',
          expertName: 'Dr. Alex Chen',
          serviceTitle: 'Business Strategy Consultation',
          amount: 15000, // cents
          currency: 'USD',
          status: 'succeeded',
          platformFee: 2250, // 15%
          expertPayout: 12750, // 85%
          createdAt: '2026-11-14T10:30:00Z',
          settledAt: '2026-11-16T02:00:00Z',
          refundStatus: null,
        },
        {
          id: 'pi_0987654321',
          bookingId: 'booking_002',
          clientName: 'Michael Rodriguez',
          expertName: 'Sarah Williams',
          serviceTitle: 'Career Coaching Session',
          amount: 8000, // cents
          currency: 'USD',
          status: 'succeeded',
          platformFee: 1200,
          expertPayout: 6800,
          createdAt: '2026-11-13T14:15:00Z',
          settledAt: '2026-11-15T02:00:00Z',
          refundStatus: 'partial',
          refundAmount: 4000,
        },
        {
          id: 'pi_5555555555',
          bookingId: 'booking_003',
          clientName: 'Emma Thompson',
          expertName: 'James Wilson',
          serviceTitle: 'Technical Interview Prep',
          amount: 12000,
          currency: 'USD',
          status: 'pending',
          platformFee: 1800,
          expertPayout: 10200,
          createdAt: '2026-11-14T16:45:00Z',
          settledAt: null,
          refundStatus: null,
        },
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load payments');
      console.error('Error loading payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Filter by search term (search in client, expert, service, or payment ID)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.clientName.toLowerCase().includes(term) ||
          p.expertName.toLowerCase().includes(term) ||
          p.serviceTitle.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term) ||
          p.bookingId.toLowerCase().includes(term)
      );
    }

    setFilteredPayments(filtered);
  };

  const handleRefund = async () => {
    if (!selectedPayment || !refundAmount || isNaN(refundAmount)) {
      setError('Please enter a valid refund amount');
      return;
    }

    try {
      setIsProcessingRefund(true);
      setError(null);

      // Call refund API
      const result = await paymentsAPI.refundPayment(
        selectedPayment.bookingId,
        parseFloat(refundAmount),
        refundReason
      );

      setRefundSuccess({
        refundId: result.refundId,
        amount: result.amount,
        status: result.status,
      });

      // Refresh payment list
      loadPayments();

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowRefundModal(false);
        setRefundSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const StatusBadge = ({ status, refundStatus }) => {
    let bg, color, text;

    if (refundStatus === 'full') {
      bg = 'rgba(239, 68, 68, 0.1)';
      color = '#ef4444';
      text = 'Refunded';
    } else if (refundStatus === 'partial') {
      bg = 'rgba(245, 158, 11, 0.1)';
      color = '#f59e0b';
      text = 'Partially Refunded';
    } else {
      switch (status) {
        case 'succeeded':
          bg = 'rgba(16, 185, 129, 0.1)';
          color = '#10b981';
          text = 'Completed';
          break;
        case 'pending':
          bg = 'rgba(99, 102, 241, 0.1)';
          color = '#818cf8';
          text = 'Pending';
          break;
        case 'failed':
          bg = 'rgba(239, 68, 68, 0.1)';
          color = '#ef4444';
          text = 'Failed';
          break;
        default:
          bg = 'rgba(107, 114, 128, 0.1)';
          color = '#6b7280';
          text = status;
      }
    }

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          backgroundColor: bg,
          color,
          fontSize: '11px',
          fontWeight: '600',
        }}
      >
        {status === 'succeeded' || refundStatus ? (
          <CheckCircle2 size={12} />
        ) : (
          <Clock size={12} />
        )}
        {text}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
            }}
          >
            <DollarSign size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              Payment Management
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              View and manage all platform payments
            </p>
          </div>
        </div>
        <button
          onClick={loadPayments}
          disabled={isLoading}
          className="btn-secondary"
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            placeholder="Search by client, expert, booking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--surface-input)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={14} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--surface-input)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              appearance: 'none',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="succeeded">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <ChevronDown
            size={14}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'var(--text-muted)',
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgb(239, 68, 68)',
            color: 'rgb(239, 68, 68)',
            fontSize: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Payments Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#818cf8' }} />
          <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Loading payments...
          </p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}>
          <DollarSign size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p>No payments found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
            }}
          >
            <thead>
              <tr style={{
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--surface-input)',
              }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Client / Expert / Service
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Amount
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Platform Fee / Payout
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Status
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Date
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    '&:hover': { backgroundColor: 'var(--surface-input)' },
                  }}
                >
                  <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>
                    <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                      {payment.clientName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {payment.expertName} • {payment.serviceTitle}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                      {payment.id.substring(0, 15)}...
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>
                    ${(payment.amount / 100).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '11px' }}>
                    <div>Fee: ${(payment.platformFee / 100).toFixed(2)}</div>
                    <div style={{ color: '#10b981', fontWeight: '600' }}>
                      Payout: ${(payment.expertPayout / 100).toFixed(2)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <StatusBadge status={payment.status} refundStatus={payment.refundStatus} />
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    {formatDate(payment.createdAt)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {payment.status === 'succeeded' && !payment.refundStatus && (
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setRefundAmount('');
                          setShowRefundModal(true);
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                        }}
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => setShowRefundModal(false)}
        >
          <div
            className="modal-box"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setShowRefundModal(false)}
            >
              <X size={20} />
            </button>

            {refundSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '2px solid var(--accent-green)',
                    color: 'var(--accent-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <CheckCircle2 size={28} />
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                  Refund Processed
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Refund of ${refundSuccess.amount.toFixed(2)} has been successfully processed.
                </p>

                <div
                  style={{
                    backgroundColor: 'var(--surface-input)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    marginBottom: '16px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Refund ID:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {refundSuccess.refundId?.substring(0, 15)}...
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>
                      {refundSuccess.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowRefundModal(false)}
                  className="btn-pro"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                  Process Refund
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {selectedPayment.clientName} • {selectedPayment.serviceTitle}
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: 'var(--text-primary)',
                  }}>
                    Amount to Refund
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}>
                      $
                    </span>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder={`Max: ${(selectedPayment.amount / 100).toFixed(2)}`}
                      step="0.01"
                      min="0"
                      max={selectedPayment.amount / 100}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 28px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--surface-input)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: 'var(--text-primary)',
                  }}>
                    Reason
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="customer_requested">Customer Requested</option>
                    <option value="duplicate_charge">Duplicate Charge</option>
                    <option value="service_cancelled">Service Cancelled</option>
                    <option value="service_not_provided">Service Not Provided</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '16px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Original Amount:</span>
                    <span style={{ fontWeight: '600' }}>
                      ${(selectedPayment.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Refund Amount:</span>
                    <span style={{ fontWeight: '600', color: '#ef4444' }}>
                      -${(parseFloat(refundAmount) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowRefundModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '10px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefund}
                    disabled={isProcessingRefund || !refundAmount}
                    className="btn-pro"
                    style={{
                      flex: 1,
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {isProcessingRefund ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Process Refund</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
