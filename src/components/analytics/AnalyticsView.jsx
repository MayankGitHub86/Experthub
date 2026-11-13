import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, BarChart3, Users, Globe, Star,
  ArrowUpRight, ArrowDownRight, DollarSign, Activity, Zap,
  Award, RefreshCw, Download, Filter
} from 'lucide-react';
import {
  analyticsKPIs, revenueTimelineData, funnelData,
  topExpertLeaderboard, utilizationHeatmap, geoData, unitEconomics
} from '../../data/mockDashboardData';

// --- Mini Sparkline SVG (no recharts needed) ---
function Sparkline({ data, color, height = 40 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.85 - h * 0.05;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const fill = `${pts.join(' ')} ${w},${h} 0,${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// --- KPI Card ---
function KPICard({ kpi }) {
  return (
    <div className="analytics-kpi-card" style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '14px',
      padding: '20px 22px',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}88)` }} />
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
        {kpi.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>
            {kpi.value}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            {kpi.isPositive
              ? <TrendingUp size={13} color="#10b981" />
              : <TrendingDown size={13} color="#ef4444" />}
            <span style={{ fontSize: '12px', fontWeight: '700', color: kpi.isPositive ? '#10b981' : '#ef4444' }}>{kpi.change}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpi.sub}</span>
          </div>
        </div>
        <Sparkline data={kpi.sparkline} color={kpi.color} />
      </div>
    </div>
  );
}

// --- Revenue Timeline Chart (pure SVG) ---
function RevenueTimeline({ data, metric }) {
  const vals = data.map(d => d[metric]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 600, H = 160, pad = 36;
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return { x, y, v, month: data[i].month };
  });

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length-1].x},${H - pad} L${pts[0].x},${H - pad} Z`;
  const color = metric === 'revenue' ? '#8b5cf6' : metric === 'sessions' ? '#3b82f6' : '#10b981';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id={`tl-${metric}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t}
          x1={pad} y1={pad + t * (H - pad * 2)}
          x2={W - pad} y2={pad + t * (H - pad * 2)}
          stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="4,4"
        />
      ))}
      {/* Area fill */}
      <path d={areaD} fill={`url(#tl-${metric})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="var(--surface-card)" strokeWidth="2" />
          <text x={p.x} y={H - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="Inter,sans-serif">
            {p.month}
          </text>
        </g>
      ))}
    </svg>
  );
}

// --- Conversion Funnel ---
function ConversionFunnel({ data }) {
  const maxCount = data[0].count;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((step, idx) => {
        const widthPct = (step.count / maxCount) * 100;
        const dropOff = idx > 0 ? ((data[idx-1].count - step.count) / data[idx-1].count * 100).toFixed(1) : null;
        return (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: step.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: step.color }}>{idx + 1}</span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{step.step}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {dropOff && (
                  <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>
                    ↓ {dropOff}% drop
                  </span>
                )}
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {step.count.toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ height: '10px', borderRadius: '5px', backgroundColor: 'var(--surface-input)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${widthPct}%`,
                background: `linear-gradient(90deg, ${step.color}, ${step.color}bb)`,
                borderRadius: '5px',
                boxShadow: `0 0 8px ${step.color}55`,
                transition: 'width 0.8s ease'
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Utilization Heatmap ---
function UtilizationHeatmap({ data }) {
  const allVals = data.data.flat();
  const maxVal = Math.max(...allVals);
  const getColor = (v) => {
    const intensity = v / maxVal;
    if (intensity === 0) return 'var(--surface-input)';
    const r = Math.round(139 + (99 - 139) * intensity);
    const g = Math.round(92 + (102 - 92) * intensity);
    const b = Math.round(246 + (241 - 246) * intensity);
    return `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.75})`;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '480px' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', gap: '3px', marginBottom: '3px', paddingLeft: '4px' }}>
          <div />
          {data.days.map(d => (
            <div key={d} style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'center' }}>{d}</div>
          ))}
        </div>
        {/* Rows */}
        {data.data.map((row, hi) => (
          <div key={hi} style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', paddingRight: '4px', justifyContent: 'flex-end' }}>
              {data.hours[hi]}
            </div>
            {row.map((val, di) => (
              <div key={di} title={`${val} sessions`} style={{
                height: '28px',
                borderRadius: '4px',
                backgroundColor: getColor(val),
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease',
                cursor: 'default'
              }}>
                {val > 0 && <span style={{ fontSize: '9px', fontWeight: '600', color: val > maxVal * 0.5 ? '#ffffff' : 'var(--text-secondary)' }}>{val}</span>}
              </div>
            ))}
          </div>
        ))}
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Low</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(t => (
            <div key={t} style={{ width: '18px', height: '18px', borderRadius: '3px', backgroundColor: getColor(Math.round(t * maxVal)) }} />
          ))}
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>High</span>
        </div>
      </div>
    </div>
  );
}

// --- Expert Leaderboard ---
function ExpertLeaderboard({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {data.map((expert, idx) => (
        <div key={idx} style={{
          display: 'grid',
          gridTemplateColumns: '28px 44px 1fr 80px 80px 60px 52px',
          alignItems: 'center',
          gap: '12px',
          padding: '11px 0',
          borderBottom: idx < data.length - 1 ? '1px solid var(--border-subtle)' : 'none'
        }}>
          <span style={{
            fontSize: '13px', fontWeight: '800', textAlign: 'center',
            color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7c54' : 'var(--text-muted)'
          }}>#{expert.rank}</span>
          <img src={expert.avatar} alt={expert.name} style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{expert.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{expert.category}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{expert.revenue}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>revenue</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{expert.sessions}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>sessions</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
            <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{expert.rating}</span>
          </div>
          <div style={{
            fontSize: '11px', fontWeight: '700', color: '#10b981',
            textAlign: 'center',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            borderRadius: '6px',
            padding: '3px 6px'
          }}>
            {expert.growth}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Unit Economics Panel ---
function UnitEconomicsPanel({ data }) {
  const items = Object.values(data);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      {items.map((item, idx) => (
        <div key={idx} style={{
          backgroundColor: 'var(--surface-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '14px 16px'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '500' }}>{item.label}</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{item.value}</div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: item.good ? '#10b981' : '#ef4444', marginTop: '4px' }}>
            {item.good ? '↑' : '↓'} {item.trend}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Geographic Distribution ---
function GeoDistribution({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((region, idx) => (
        <div key={idx}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: region.color }} />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{region.region}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{region.revenue}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{region.sessions} sessions</span>
            </div>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-input)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${region.pct}%`,
              background: `linear-gradient(90deg, ${region.color}, ${region.color}99)`,
              borderRadius: '4px',
              boxShadow: `0 0 6px ${region.color}44`
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN ANALYTICS VIEW
// ============================================================
export default function AnalyticsView() {
  const [activeMetric, setActiveMetric] = useState('revenue');

  const metricOptions = [
    { id: 'revenue', label: 'Revenue', color: '#8b5cf6' },
    { id: 'sessions', label: 'Sessions', color: '#3b82f6' },
    { id: 'experts', label: 'Active Experts', color: '#10b981' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Executive Analytics
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Platform performance, marketplace health, and expert economics — Jan–Dec 2024
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--surface-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}>
            <Filter size={13} />
            Filter
          </button>
          <button style={{
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--surface-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}>
            <Download size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {analyticsKPIs.map(kpi => <KPICard key={kpi.id} kpi={kpi} />)}
      </div>

      {/* ── Row 2: Revenue Timeline + Conversion Funnel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>

        {/* Revenue Timeline */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '22px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Revenue Timeline</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>12-month rolling performance</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {metricOptions.map(m => (
                <button key={m.id} onClick={() => setActiveMetric(m.id)} style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: activeMetric === m.id ? m.color + '20' : 'transparent',
                  border: `1px solid ${activeMetric === m.id ? m.color : 'var(--border-subtle)'}`,
                  color: activeMetric === m.id ? m.color : 'var(--text-muted)'
                }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <RevenueTimeline data={revenueTimelineData} metric={activeMetric} />
          <div style={{ display: 'flex', gap: '20px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Peak Month</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>December 2024</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>YoY Growth</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>+69.9%</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avg / Month</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>$38,508</div>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '22px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Booking Funnel</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>End-to-end consultation conversion</p>
          </div>
          <ConversionFunnel data={funnelData} />
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Overall Conversion</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>3.24% ↑ 0.8pp</span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Utilization Heatmap + Expert Leaderboard ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '20px' }}>

        {/* Utilization Heatmap */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '22px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Expert Utilization</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sessions by day & hour (last 30 days)</p>
          </div>
          <UtilizationHeatmap data={utilizationHeatmap} />
        </div>

        {/* Expert Leaderboard */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '22px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Top Performers</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Expert leaderboard by revenue</p>
            </div>
            <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-purple)', fontWeight: '600' }}>
              This Month
            </span>
          </div>
          <ExpertLeaderboard data={topExpertLeaderboard} />
        </div>
      </div>

      {/* ── Row 4: Unit Economics + Geographic Distribution ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>

        {/* Unit Economics */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '22px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Unit Economics</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>LTV, CAC, and retention metrics</p>
          </div>
          <UnitEconomicsPanel data={unitEconomics} />
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            backgroundColor: 'rgba(139, 92, 246, 0.06)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            <strong style={{ color: 'var(--accent-purple)' }}>Insight:</strong> LTV:CAC ratio of 22.9x significantly exceeds the industry benchmark of 3:1, indicating highly efficient customer acquisition.
          </div>
        </div>

        {/* Geographic Distribution */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '22px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Geographic Revenue</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Revenue by region breakdown</p>
            </div>
            <Globe size={18} color="var(--text-muted)" />
          </div>
          <GeoDistribution data={geoData} />
          <div style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'var(--surface-input)', borderRadius: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>1,089</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Sessions</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'var(--surface-input)', borderRadius: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>5</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Regions</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
