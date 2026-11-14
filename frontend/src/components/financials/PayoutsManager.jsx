import React, { useState } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownLeft, CheckCircle2, Shield, CreditCard, RefreshCw } from 'lucide-react';
import { mockExperts } from '../../data/mockExperts';

export default function PayoutsManager() {
  const [payoutsList, setPayoutsList] = useState([
    { id: "PO-7721", expert: "Dr. Aris Thorne", amount: "$3,450.00", date: "Jun 8, 2026", method: "Stripe Express •••• 9921", status: "Settled" },
    { id: "PO-7719", expert: "Elena Rostova", amount: "$2,890.00", date: "Jun 7, 2026", method: "Stripe Express •••• 4120", status: "Settled" },
    { id: "PO-7714", expert: "Marcus Sterling", amount: "$4,120.00", date: "Jun 5, 2026", method: "Stripe Express •••• 1088", status: "Settled" },
    { id: "PO-7708", expert: "Sophia Chen", amount: "$1,850.00", date: "Jun 3, 2026", method: "Stripe Express •••• 5542", status: "Settled" },
  ]);

  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  const handleTriggerPayout = () => {
    setIsProcessingPayout(true);
    setTimeout(() => {
      setIsProcessingPayout(false);
      setPayoutsList((prev) => [
        {
          id: `PO-${Math.floor(7800 + Math.random() * 100)}`,
          expert: "Batch Payout (3 Experts)",
          amount: "$5,240.00",
          date: "Just now",
          method: "Stripe Connect Direct Transfer",
          status: "Settled"
        },
        ...prev
      ]);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Financial Metric Highlights */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Gross Volume</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}>
              <DollarSign size={20} color="#a78bfa" />
            </div>
          </div>
          <div className="metric-value">$48,250.75</div>
          <div className="metric-footer">
            <span className="metric-trend positive">↑ 12.5%</span>
            <span className="metric-comparison">platform gross processed</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Platform Fee (15%)</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
              <ArrowDownLeft size={20} color="#34d399" />
            </div>
          </div>
          <div className="metric-value">$7,237.61</div>
          <div className="metric-footer">
            <span className="metric-trend positive">↑ Net Margin</span>
            <span className="metric-comparison">collected commission</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Expert Escrow Paid</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
              <ArrowUpRight size={20} color="#60a5fa" />
            </div>
          </div>
          <div className="metric-value">$41,013.14</div>
          <div className="metric-footer">
            <span className="metric-trend positive">85.0% split</span>
            <span className="metric-comparison">routed to vendor accounts</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Available Payouts</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)' }}>
              <CreditCard size={20} color="#fb923c" />
            </div>
          </div>
          <div className="metric-value">$5,240.00</div>
          <div className="metric-footer">
            <span className="metric-trend" style={{ color: '#fb923c' }}>Ready for transfer</span>
            <span className="metric-comparison">Stripe Connect buffer</span>
          </div>
        </div>
      </div>

      {/* Stripe Connect Escrow Header & Action */}
      <div className="card-container">
        <div className="card-header">
          <div>
            <h3 className="card-title">Stripe Connect Multi-Vendor Accounts</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Automatic split-pay routing directly to experts' verified Stripe Express accounts.
            </p>
          </div>

          <button
            onClick={handleTriggerPayout}
            disabled={isProcessingPayout}
            className="btn-pro"
            style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}
          >
            {isProcessingPayout ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Processing Transfers...</span>
              </>
            ) : (
              <>
                <DollarSign size={14} />
                <span>Execute Batch Payout ($5,240)</span>
              </>
            )}
          </button>
        </div>

        {/* Connected Vendors Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mockExperts.slice(0, 4).map((exp, idx) => (
            <div
              key={exp.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={exp.avatar} 
                  alt={exp.name} 
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {exp.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Stripe Account: <code style={{ color: 'var(--accent-purple-light)' }}>acct_1N928{idx}Xy</code> • Payouts Active
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    ${(exp.hourlyRate * 8.5).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '600' }}>
                    Ready for Payout
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  KYC Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout History */}
      <div className="card-container">
        <div className="card-header">
          <h3 className="card-title">Recent Payout Settlements</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {payoutsList.map((po) => (
            <div
              key={po.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '13px'
              }}
            >
              <div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{po.expert}</span>
                <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '11px' }}>{po.id}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{po.method}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{po.date}</div>
              <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{po.amount}</div>
              <div>
                <span className="badge-status success">{po.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
