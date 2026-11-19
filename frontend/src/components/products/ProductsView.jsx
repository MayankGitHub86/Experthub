import React, { useEffect, useState } from 'react';
import { Search, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import servicesAPI from '../../api/services.js';

const formatPrice = (service) => {
  const amount = Number(service.pricing?.amount);
  if (!Number.isFinite(amount)) return 'Price unavailable';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: service.pricing?.currency || 'USD',
  }).format(amount);
};

const expertName = (service) => {
  const user = service.expertId?.userId;
  return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Expert profile unavailable';
};

export default function ProductsView({ onBookService, canBook = false }) {
  const [services, setServices] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const results = await servicesAPI.getAll({ query: query.trim(), sortBy: 'rating' });
        if (!cancelled) setServices(Array.isArray(results) ? results : []);
      } catch (err) {
        if (!cancelled) {
          setServices([]);
          setError(err.response?.data?.message || 'Services could not be loaded.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Bookable Services</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active services published by approved experts.</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--surface-card)' }}>
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search services</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services" style={{ border: 0, background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} />
        </label>
      </div>

      {loading && <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}><RefreshCw size={16} className="spinner" />Loading services…</div>}
      {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
      {!loading && !error && services.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No active services match this search.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {services.map((service) => (
          <article key={service._id} className="card-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--accent-purple-light)', fontWeight: 600, marginBottom: '8px' }}>{service.category}</div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>{service.title}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{service.shortDescription || service.description}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{expertName(service)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}><Clock size={12} />{service.duration} min</div>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatPrice(service)}</div>
            </div>
            <button
              type="button"
              onClick={() => onBookService?.(service)}
              disabled={!canBook || !service.expertId?._id}
              className="btn-pro"
              style={{ width: '100%', padding: '9px', opacity: canBook && service.expertId?._id ? 1 : 0.55 }}
              title={!canBook ? 'Sign in as a client to book a service' : undefined}
            >
              <span>{canBook ? 'Book this service' : 'Client sign-in required'}</span>
              <ArrowRight size={14} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
