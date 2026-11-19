import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  X, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  AlertCircle,
  UserCheck
} from 'lucide-react';
import usersAPI from '../../api/users.js';

const formatSettledSpend = (customer) => {
  const amounts = Array.isArray(customer.settledSpendByCurrency)
    ? customer.settledSpendByCurrency
    : customer.totalSpent != null && Number.isFinite(Number(customer.totalSpent))
      ? [{ currency: 'USD', amount: Number(customer.totalSpent) }]
      : [];
  if (!amounts.length) return '—';
  return amounts
    .map(({ currency, amount }) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(Number(amount) || 0))
    .join(' · ');
};

export default function CustomersView() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [customerDetailsError, setCustomerDetailsError] = useState('');

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 15,
        role: roleFilter,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (appliedSearchQuery.trim()) {
        params.search = appliedSearchQuery.trim();
      }

      const res = await usersAPI.listUsers(params);
      setCustomers(Array.isArray(res?.users) ? res.users : []);
      setTotalPages(res?.pagination?.pages || 1);
      setTotalCount(res?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError(err.response?.data?.message || 'Failed to fetch customer directory');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter, appliedSearchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearchQuery(searchQuery);
  };

  const handleOpenDetails = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerDetailsLoading(true);
    setCustomerBookings([]);
    setCustomerDetailsError('');

    try {
      const details = await usersAPI.getUserDetails(customer.id);
      setCustomerBookings(details?.bookings || []);
    } catch (err) {
      console.error('Failed to load customer details:', err);
      setCustomerDetailsError(err.response?.data?.message || 'Failed to load consultation history.');
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            Customer & Client Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Registered platform clients, booking frequencies, consultation history, and lifetime value
          </p>
        </div>

        <button
          onClick={loadCustomers}
          className="filter-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{
          padding: '20px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Directory
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Registered {roleFilter === 'all' ? 'accounts' : `${roleFilter}s`}
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Active on Page
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <UserCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981' }}>
            {customers.filter(c => c.status === 'active').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Active accounts in this page
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Completed Sessions
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <BookOpen size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#8b5cf6' }}>
            {customers.reduce((acc, c) => acc + (c.completedBookings || 0), 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Completed bookings in this page
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
        {/* Role & Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setRoleFilter('client'); setPage(1); }}
            className={`filter-btn ${roleFilter === 'client' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Clients
          </button>
          <button
            onClick={() => { setRoleFilter('expert'); setPage(1); }}
            className={`filter-btn ${roleFilter === 'expert' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Experts
          </button>
          <button
            onClick={() => { setRoleFilter('all'); setPage(1); }}
            className={`filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            All Accounts
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Status
          <select aria-label="Filter accounts by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-input)', color: 'var(--text-primary)' }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
        </label>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '360px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              id="customer-search"
              name="search"
              aria-label="Search customers by name or email"
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
            Filter
          </button>
        </form>
      </div>

      {/* Error State */}
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

      {/* Customers Table */}
      <div className="card-container" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="spinner" style={{ margin: '0 auto 12px' }} />
            <div>Loading client directory...</div>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Users size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              No customers found
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto' }}>
              {searchQuery ? `No records match "${searchQuery}".` : 'Registered clients will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-input)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Customer Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Email Address</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Registered</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Total Bookings</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Completed</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Cancelled</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Settled Spend</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr 
                    key={c.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '12px'
                        }}>
                          {(c.firstName || 'C')[0]}{(c.lastName || '')[0] || ''}
                        </div>
                        <div>
                          <div>{c.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: #{c.id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {c.email}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: c.role === 'admin' ? 'rgba(239, 68, 68, 0.12)' : c.role === 'expert' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: c.role === 'admin' ? '#ef4444' : c.role === 'expert' ? '#8b5cf6' : '#3b82f6',
                        textTransform: 'capitalize'
                      }}>
                        {c.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {c.totalBookings || 0} sessions
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>{c.completedBookings || 0}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>{c.cancelledBookings || 0}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#10b981' }}>
                      {formatSettledSpend(c)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: c.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: c.status === 'active' ? '#10b981' : '#ef4444'
                      }}>
                        {c.status === 'active' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        <span style={{ textTransform: 'capitalize' }}>{c.status || 'Active'}</span>
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleOpenDetails(c)}
                        className="filter-btn"
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} />
                        <span>Profile</span>
                      </button>
                    </td>
                  </tr>
                ))}
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
              Page {page} of {totalPages} ({totalCount} total)
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

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-box" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedCustomer(null)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '18px'
              }}>
                {(selectedCustomer.firstName || 'C')[0]}{(selectedCustomer.lastName || '')[0] || ''}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  {selectedCustomer.name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedCustomer.email} • Joined {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : 'date unavailable'}
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--surface-input)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Bookings</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {selectedCustomer.totalBookings || 0}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--surface-input)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lifetime Spend</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', marginTop: '4px' }}>
                  ${(Number(selectedCustomer.totalSpent) || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Consultation History */}
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Consultation & Session History
            </h4>

            {customerDetailsLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spinner" style={{ margin: '0 auto 8px' }} />
                <div>Loading booking history...</div>
              </div>
            ) : customerDetailsError ? (
              <div role="alert" style={{ padding: '24px', color: '#ef4444', fontSize: '13px' }}>{customerDetailsError}</div>
            ) : customerBookings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--surface-input)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recorded consultation bookings for this client yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {customerBookings.map((b) => (
                  <div 
                    key={b._id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--surface-input)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {b.serviceId?.title || 'Consultation'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : 'Scheduled'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {b.pricing?.currency || 'USD'} {Number(b.totalAmount || 0).toFixed(2)}
                      </div>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '700',
                        backgroundColor: b.status === 'confirmed' || b.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: b.status === 'confirmed' || b.status === 'completed' ? '#10b981' : '#f59e0b'
                      }}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedCustomer(null)}
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
