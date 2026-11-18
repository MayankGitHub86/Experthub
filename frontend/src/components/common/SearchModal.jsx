import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, Users, ShoppingBag, ArrowRight } from 'lucide-react';
import { mockExperts } from '../../data/mockExperts';

export default function SearchModal({ isOpen, onClose, onSelectExpert, onNavigate }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose ? onClose() : null;
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredExperts = mockExperts.filter(exp => 
    exp.name.toLowerCase().includes(query.toLowerCase()) ||
    exp.role.toLowerCase().includes(query.toLowerCase()) ||
    exp.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box" 
        style={{ maxWidth: '560px', padding: '16px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
          <Search size={18} color="var(--accent-purple-light)" />
          <input 
            id="search-modal-input"
            name="search"
            type="text"
            placeholder="Search experts, skills, bookings, or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: 'transparent',
              fontSize: '15px',
              border: 'none',
              color: 'var(--text-primary)'
            }}
          />
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Nav Suggestions */}
        {!query && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick Navigation
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button 
                onClick={() => { onNavigate('dashboard'); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', color: 'var(--text-secondary)', textAlign: 'left', width: '100%' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-input)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ArrowRight size={14} color="var(--accent-purple)" />
                <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Go to Executive Dashboard</span>
              </button>
              <button 
                onClick={() => { onNavigate('ai-matcher'); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', color: 'var(--text-secondary)', textAlign: 'left', width: '100%' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-input)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Sparkles size={14} color="var(--accent-cyan)" />
                <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Open AI Matchmaker Agent</span>
              </button>
              <button 
                onClick={() => { onNavigate('customers'); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', color: 'var(--text-secondary)', textAlign: 'left', width: '100%' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-input)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Users size={14} color="#f59e0b" />
                <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Browse Expert Marketplace</span>
              </button>
            </div>
          </div>
        )}

        {/* Filtered Experts */}
        {query && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Matching Experts ({filteredExperts.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredExperts.map(exp => (
                <div 
                  key={exp.id}
                  onClick={() => { onSelectExpert(exp); onClose(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface-input)',
                    cursor: 'pointer',
                    transition: 'border 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={exp.avatar} alt={exp.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{exp.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{exp.role}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-purple-light)' }}>
                    ${exp.hourlyRate}/hr
                  </div>
                </div>
              ))}
              {filteredExperts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No experts found matching "{query}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
