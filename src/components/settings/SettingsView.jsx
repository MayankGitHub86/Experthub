import React, { useState } from 'react';
import { Settings, Shield, Key, Database, Webhook, Check } from 'lucide-react';

export default function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [wpUrl, setWpUrl] = useState('http://localhost:8000');
  const [nodeUrl, setNodeUrl] = useState('http://localhost:3001');
  const [openaiKey, setOpenaiKey] = useState('sk-proj-••••••••••••••••••••••••');
  const [stripeSecret, setStripeSecret] = useState('sk_test_••••••••••••••••••••••••');

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="view-header">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
            System & Microservice Settings
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure WordPress Headless REST endpoints, Node.js Socket.io, and Stripe Connect keys
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="card-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* WordPress Config */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            <Database size={15} color="var(--accent-purple-light)" />
            <span>WordPress / WooCommerce Base URL</span>
          </label>
          <input
            type="text"
            value={wpUrl}
            onChange={(e) => setWpUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Endpoints at: <code>/wp-json/wp/v2/experts</code> and <code>/wp-json/wc/v3/orders</code>
          </span>
        </div>

        {/* Node.js Microservice Config */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            <Webhook size={15} color="#3b82f6" />
            <span>Node.js / Socket.io Real-Time Microservice</span>
          </label>
          <input
            type="text"
            value={nodeUrl}
            onChange={(e) => setNodeUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
          />
        </div>

        {/* OpenAI Key */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            <Key size={15} color="#10b981" />
            <span>OpenAI API Key (Embeddings & Semantic Matcher)</span>
          </label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
          />
        </div>

        {/* Stripe Secret Key */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            <Shield size={15} color="#f59e0b" />
            <span>Stripe Connect Secret Key</span>
          </label>
          <input
            type="password"
            value={stripeSecret}
            onChange={(e) => setStripeSecret(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          {saved ? (
            <span style={{ fontSize: '13px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} />
              <span>Configurations saved successfully!</span>
            </span>
          ) : <span />}

          <button type="submit" className="btn-pro" style={{ width: 'auto', padding: '10px 24px' }}>
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
