import React, { useCallback, useEffect, useState } from 'react';
import { DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import paymentsAPI from '../../api/payments.js';

const money = (amount, currency = 'USD') => new Intl.NumberFormat(undefined, {
  style: 'currency', currency: String(currency || 'USD').toUpperCase(),
}).format((Number(amount) || 0) / 100);

export default function PayoutsManager() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await paymentsAPI.listPayments({ page: 1, limit: 25, sortBy: 'createdAt', sortOrder: 'desc' });
      setPayments(Array.isArray(result?.payments) ? result.payments : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      setPayments([]);
      setPagination(null);
      setError(err.response?.data?.message || 'Payment records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const completed = payments.filter((payment) => payment.status === 'completed');
  const grossCents = completed.reduce((sum, payment) => sum + (Number(payment.expertPayout) || 0) + (Number(payment.platformFee) || 0), 0);
  const feeCents = completed.reduce((sum, payment) => sum + (Number(payment.platformFee) || 0), 0);
  const expertCents = completed.reduce((sum, payment) => sum + (Number(payment.expertPayout) || 0), 0);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Payment Activity</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Amounts are derived from recorded booking payment transactions.</p>
        </div>
        <button type="button" onClick={loadPayments} disabled={loading} className="filter-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Refresh
        </button>
      </header>

      {error && <div role="alert" style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#ef4444' }}><AlertCircle size={16} />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {[
          ['Recorded transactions', pagination?.total ?? (loading ? '—' : payments.length)],
          ['Gross in latest page', money(grossCents)],
          ['Platform fee in latest page', money(feeCents)],
          ['Expert share in latest page', money(expertCents)],
        ].map(([label, value]) => (
          <div key={label} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
              {label}<DollarSign size={15} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="card-container" style={{ overflowX: 'auto' }}>
        <h3 className="card-title" style={{ marginBottom: '12px' }}>Latest payment transactions</h3>
        {loading ? <p role="status" style={{ color: 'var(--text-muted)' }}>Loading payment records…</p> : payments.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No payment transactions are recorded.</p> : (
          <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead><tr>{['Date', 'Client', 'Expert', 'Booking', 'Gross', 'Status'].map((label) => <th key={label} style={{ padding: '10px 8px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>{label}</th>)}</tr></thead>
            <tbody>{payments.map((payment) => (
              <tr key={payment.id}>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>{payment.clientName || '—'}</td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>{payment.expertName || '—'}</td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>{payment.bookingNumber || payment.bookingId || '—'}</td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>{money((Number(payment.expertPayout) || 0) + (Number(payment.platformFee) || 0), payment.currency)}</td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>{payment.status}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <p style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>This backend exposes payment records but no manual payout execution endpoint. No transfer action is available here.</p>
      </div>
    </section>
  );
}
