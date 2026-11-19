import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Search, 
  Download, 
  RefreshCw, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Eye, 
  X,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import paymentsAPI from '../../api/payments.js';

export default function SalesView() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const formatCentsByCurrency = (records, amountInCents) => {
    const totals = new Map();
    records.forEach((record) => {
      const currency = String(record.currency || 'USD').toUpperCase();
      totals.set(currency, (totals.get(currency) || 0) + (Number(amountInCents(record)) || 0));
    });
    if (totals.size === 0) return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(0);
    return [...totals].map(([currency, cents]) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)).join(' · ');
  };

  const loadSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real payments from backend admin API
      const params = {
        page,
        limit: 25,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const paymentsData = await paymentsAPI.listPayments(params);

      const fetchedPayments = Array.isArray(paymentsData?.payments) ? paymentsData.payments : [];
      setPayments(fetchedPayments);
      setTotalPages(paymentsData?.pagination?.pages || 1);

    } catch (err) {
      console.error('Error loading sales data:', err);
      setError(err.response?.data?.message || 'Failed to load sales data from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [page, statusFilter]);

  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadSalesData();
  };

  // Derive metrics strictly from real backend records
  const metrics = useMemo(() => {
    // Combine payments and bookings for complete financial clarity
    const completedPayments = payments.filter(p => p.status === 'completed' || p.status === 'paid');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const refundedPayments = payments.filter(p => p.status === 'refunded');

    const grossCents = (payment) => (Number(payment.expertPayout ?? payment.amount) || 0) + (Number(payment.platformFee) || 0);

    return {
      grossVolume: formatCentsByCurrency(completedPayments, grossCents),
      platformRevenue: formatCentsByCurrency(completedPayments, (payment) => payment.platformFee),
      expertPayouts: formatCentsByCurrency(completedPayments, (payment) => payment.expertPayout ?? payment.amount),
      pendingAmount: formatCentsByCurrency(pendingPayments, grossCents),
      refundedAmount: formatCentsByCurrency(refundedPayments, (payment) => payment.refundAmount || grossCents(payment)),
      totalCount: payments.length,
      settledCount: completedPayments.length
    };
  }, [payments]);

  // Export to CSV
  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      const headers = ['Date', 'PaymentIntent/Txn', 'BookingNumber', 'Client', 'ClientEmail', 'Expert', 'ExpertEmail', 'GrossAmount', 'PlatformFee', 'ExpertShare', 'Currency', 'Status'];
      const rows = payments.map(p => [
        p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '',
        `"${p.paymentIntentId || p.id || ''}"`,
        `"${p.bookingNumber || p.bookingId || ''}"`,
        `"${p.clientName || ''}"`,
        `"${p.clientEmail || ''}"`,
        `"${p.expertName || ''}"`,
        `"${p.expertEmail || ''}"`,
        ((Number(p.expertPayout ?? p.amount) + Number(p.platformFee || 0)) / 100).toFixed(2),
        (Number(p.platformFee || 0) / 100).toFixed(2),
        (Number((p.expertPayout ?? p.amount) || 0) / 100).toFixed(2),
        p.currency || '',
        `"${p.status || ''}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `ExpertHub_Sales_Ledger_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            Sales & Financial Ledger
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Recorded Stripe booking payments and their stored fee and expert-share values
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={loadSalesData}
            className="filter-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-pro"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
            disabled={isExporting || payments.length === 0}
          >
            <Download size={14} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{
          padding: '20px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Gross Volume on This Page
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
        {metrics.grossVolume}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} />
            <span>{metrics.settledCount} settled transactions</span>
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Recorded Platform Fee
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#8b5cf6' }}>
            {metrics.platformRevenue}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Fee value recorded on completed transactions
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Recorded Expert Share
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981' }}>
            {metrics.expertPayouts}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Expert share recorded on completed transactions
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending / In Escrow
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b' }}>
            {metrics.pendingAmount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Refunded on this page: {metrics.refundedAmount}
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '12px',
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'completed', label: 'Completed' },
            { id: 'pending', label: 'Pending' },
            { id: 'refunded', label: 'Refunded' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setStatusFilter(f.id); setPage(1); }}
              className={`filter-btn ${statusFilter === f.id ? 'active' : ''}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '380px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by client, expert, or txn ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--surface-input)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
          </div>
          <button type="submit" className="btn-pro" style={{ padding: '8px 14px', fontSize: '12px' }}>
            Search
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Transactions Table */}
      <div className="card-container" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="spinner" style={{ margin: '0 auto 12px' }} />
            <div>Loading live transaction data...</div>
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <CreditCard size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              No transactions found
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
              {statusFilter !== 'all' 
                ? `There are currently no transactions matching the "${statusFilter}" filter.` 
                : 'Transactions will appear here as soon as clients confirm bookings and make payments.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-input)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Booking / Reference</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Client</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Expert</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Gross</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Platform Fee</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Expert Share</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const gross = (Number(p.expertPayout ?? p.amount) || 0) + (Number(p.platformFee) || 0);
                  const fee = Number(p.platformFee) || 0;
                  const payout = Number(p.expertPayout ?? p.amount) || 0;
                  const isPaid = p.status === 'completed' || p.status === 'paid';
                  const isRefunded = p.status === 'refunded' || p.refundStatus;
                  const isPending = p.status === 'pending';

                  return (
                    <tr 
                      key={p.id || p.paymentIntentId}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                    >
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div>{p.bookingNumber || (p.bookingId ? `#${p.bookingId.slice(-6)}` : 'Direct')}</div>
                        {p.paymentIntentId && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.paymentIntentId.slice(0, 14)}...</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.clientName || 'Client'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.clientEmail || ''}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.expertName || 'Expert'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.expertEmail || ''}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency || 'USD' }).format(gross / 100)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#8b5cf6', fontWeight: '600' }}>
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency || 'USD' }).format(fee / 100)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: '600' }}>
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency || 'USD' }).format(payout / 100)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isPaid ? '#10b981' : isPending ? '#f59e0b' : '#ef4444',
                          textTransform: 'capitalize'
                        }}>
                          {p.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => setSelectedTxn(p)}
                          className="filter-btn"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="filter-btn"
                style={{ padding: '4px 10px', opacity: page <= 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="filter-btn"
                style={{ padding: '4px 10px', opacity: page >= totalPages ? 0.5 : 1 }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <div className="modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="modal-box" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedTxn(null)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                <CreditCard size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Transaction Details
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ID: {selectedTxn.id || selectedTxn.paymentIntentId || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span style={{ fontWeight: '700', color: selectedTxn.status === 'completed' ? '#10b981' : '#f59e0b' }}>
                  {selectedTxn.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gross Amount</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                  ${Number(selectedTxn.amount || 0).toFixed(2)} {selectedTxn.currency || 'USD'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Platform Fee (15%)</span>
                <span style={{ fontWeight: '700', color: '#8b5cf6' }}>
                  ${Number(selectedTxn.platformFee || (Number(selectedTxn.amount || 0) * 0.15)).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expert Settlement (85%)</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>
                  ${Number(selectedTxn.expertPayout || (Number(selectedTxn.amount || 0) * 0.85)).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedTxn.clientName} ({selectedTxn.clientEmail})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expert</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedTxn.expertName} ({selectedTxn.expertEmail})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Booking Reference</span>
                <span style={{ fontFamily: 'monospace' }}>{selectedTxn.bookingNumber || selectedTxn.bookingId || 'Direct'}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTxn(null)}
              className="btn-pro"
              style={{ width: '100%', marginTop: '20px', padding: '10px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
