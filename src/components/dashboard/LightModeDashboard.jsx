import React, { useState } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Percent, 
  Info, 
  MoreVertical, 
  ChevronDown, 
  ChevronRight,
  Headphones,
  Watch,
  Speaker,
  BatteryCharging
} from 'lucide-react';

import { 
  lightMetrics, 
  lightSalesOverview, 
  lightTrafficOverview, 
  lightTopProducts, 
  lightChannelData 
} from '../../data/mockDashboardData';

export default function LightModeDashboard({ onViewAllProducts, onViewSalesReport }) {
  const [hoveredMonthSales, setHoveredMonthSales] = useState('May');
  const [hoveredMonthTraffic, setHoveredMonthTraffic] = useState('May');

  // Helper to render smooth SVG sparkline
  const renderSparkline = (points, strokeColor) => {
    const width = 120;
    const height = 34;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 6) - 3;
      return [x, y];
    });

    let d = `M ${coords[0][0]},${coords[0][1]}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const mx = (p0[0] + p1[0]) / 2;
      d += ` C ${mx},${p0[1]} ${mx},${p1[1]} ${p1[0]},${p1[1]}`;
    }

    return (
      <svg viewBox="0 0 120 34" width="100%" height="34" style={{ overflow: 'visible' }}>
        <path d={d} fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  };

  const getMetricIcon = (iconType, color) => {
    switch (iconType) {
      case 'dollar':
        return <DollarSign size={18} color={color} />;
      case 'cart':
        return <ShoppingCart size={18} color={color} />;
      case 'users':
        return <Users size={18} color={color} />;
      case 'trend':
        return <TrendingUp size={18} color={color} />;
      case 'percent':
        return <Percent size={18} color={color} />;
      default:
        return <DollarSign size={18} color={color} />;
    }
  };

  const getProductIcon = (iconName) => {
    switch (iconName) {
      case 'headphones':
        return <Headphones size={16} color="#475569" />;
      case 'watch':
        return <Watch size={16} color="#475569" />;
      case 'speaker':
        return <Speaker size={16} color="#475569" />;
      case 'battery':
        return <BatteryCharging size={16} color="#475569" />;
      default:
        return <Headphones size={16} color="#475569" />;
    }
  };

  // Donut chart calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.29
  let accumulatedOffset = 0;
  const donutSegments = lightChannelData.channels.map((ch) => {
    const strokeDash = (ch.percentage / 100) * circumference;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += strokeDash;
    return {
      ...ch,
      strokeDash,
      strokeDashoffset
    };
  });

  return (
    <div className="light-dashboard-grid">
      {/* 1. TOP STATS ROW: 5 COLUMNS */}
      <div className="light-metrics-row">
        {lightMetrics.map((m) => (
          <div key={m.id} className="light-metric-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: m.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {getMetricIcon(m.icon, m.iconColor)}
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>
              {m.title}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.4px', lineHeight: '1.2' }}>
                  {m.value}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>↑ {m.change}</span>
                  <span>{m.comparison}</span>
                </div>
              </div>

              {/* Sparkline */}
              <div style={{ width: '90px', marginBottom: '2px' }}>
                {renderSparkline(m.sparklinePoints, m.sparklineColor)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. MIDDLE ROW: TWO 50% CARDS (Sales Overview vs Traffic Overview) */}
      <div className="light-two-col-row">
        {/* Left: Sales Overview Dual Bar Chart */}
        <div className="light-card">
          <div className="light-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Sales Overview</h3>
              <Info size={14} color="#94a3b8" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0f172a' }} />
                  <span>2023 Revenue</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                  <span>2024 Revenue</span>
                </div>
              </div>

              {/* Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '8px' }}>
                <span>Monthly</span>
                <ChevronDown size={13} />
              </div>
              <MoreVertical size={16} color="#94a3b8" style={{ cursor: 'pointer' }} />
            </div>
          </div>

          {/* Bar Chart Area */}
          <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '14px' }}>
            <svg viewBox="0 0 540 220" width="100%" height="100%">
              {/* Grid lines and Y labels */}
              {[300, 250, 200, 150, 100, 50, 0].map((val, idx) => {
                const y = 20 + idx * 28;
                return (
                  <g key={val}>
                    <line x1="45" y1={y} x2="530" y2={y} stroke="#f1f5f9" strokeDasharray="2 2" />
                    <text x="38" y={y + 3} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="Inter">
                      ${val ? `${val}K` : '0'}
                    </text>
                  </g>
                );
              })}

              {/* Bars per month */}
              {lightSalesOverview.map((item, idx) => {
                const xBase = 58 + idx * 39;
                const maxK = 300000;
                const h2023 = (item.rev2023 / maxK) * 168;
                const h2024 = (item.rev2024 / maxK) * 168;
                const y2023 = 188 - h2023;
                const y2024 = 188 - h2024;
                const isHovered = hoveredMonthSales === item.month;

                return (
                  <g 
                    key={item.month}
                    onMouseEnter={() => setHoveredMonthSales(item.month)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Month Highlight background */}
                    {isHovered && (
                      <rect 
                        x={xBase - 6} 
                        y="15" 
                        width="36" 
                        height="175" 
                        fill="rgba(37, 99, 235, 0.05)" 
                        rx="4"
                      />
                    )}

                    {/* 2023 Bar (Navy) */}
                    <rect 
                      x={xBase} 
                      y={y2023} 
                      width="10" 
                      height={h2023} 
                      fill="#0f172a" 
                      rx="2"
                    />

                    {/* 2024 Bar (Royal Blue) */}
                    <rect 
                      x={xBase + 12} 
                      y={y2024} 
                      width="10" 
                      height={h2024} 
                      fill="#2563eb" 
                      rx="2"
                    />

                    {/* Month Label */}
                    <text 
                      x={xBase + 11} 
                      y="204" 
                      fill={isHovered ? '#0f172a' : '#94a3b8'} 
                      fontSize="10" 
                      textAnchor="middle"
                      fontWeight={isHovered ? '600' : '400'}
                    >
                      {item.month}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip for May (as in reference image) */}
            {hoveredMonthSales && (
              <div style={{
                position: 'absolute',
                top: '18px',
                left: '42%',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                pointerEvents: 'none',
                zIndex: 10,
                fontSize: '11px'
              }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{hoveredMonthSales}</span>
                  <Info size={11} color="#94a3b8" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0f172a' }} />
                    2023 Revenue
                  </span>
                  <strong style={{ color: '#0f172a' }}>
                    ${(lightSalesOverview.find(m => m.month === hoveredMonthSales)?.rev2023 || 180400).toLocaleString()}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', color: '#64748b', marginTop: '2px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                    2024 Revenue
                  </span>
                  <strong style={{ color: '#2563eb' }}>
                    ${(lightSalesOverview.find(m => m.month === hoveredMonthSales)?.rev2024 || 248400).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Traffic Overview Area Chart */}
        <div className="light-card">
          <div className="light-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Traffic Overview</h3>
              <Info size={14} color="#94a3b8" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0f172a' }} />
                  <span>Website Visitors</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                  <span>Unique Visitors</span>
                </div>
              </div>

              {/* Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '8px' }}>
                <span>Monthly</span>
                <ChevronDown size={13} />
              </div>
              <MoreVertical size={16} color="#94a3b8" style={{ cursor: 'pointer' }} />
            </div>
          </div>

          {/* Dual Line Chart Area */}
          <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '14px' }}>
            <svg viewBox="0 0 540 220" width="100%" height="100%">
              <defs>
                <linearGradient id="trafficFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines and Y labels */}
              {[120, 100, 80, 60, 40, 20, 0].map((val, idx) => {
                const y = 20 + idx * 28;
                return (
                  <g key={val}>
                    <line x1="45" y1={y} x2="530" y2={y} stroke="#f1f5f9" strokeDasharray="2 2" />
                    <text x="38" y={y + 3} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="Inter">
                      {val ? `${val}K` : '0'}
                    </text>
                  </g>
                );
              })}

              {/* Path generation */}
              {(() => {
                const ptsWeb = lightTrafficOverview.map((item, idx) => {
                  const x = 55 + idx * 42;
                  const y = 188 - (item.website / 120000) * 168;
                  return [x, y];
                });

                const ptsUniq = lightTrafficOverview.map((item, idx) => {
                  const x = 55 + idx * 42;
                  const y = 188 - (item.unique / 120000) * 168;
                  return [x, y];
                });

                const genPath = (coords) => {
                  let d = `M ${coords[0][0]},${coords[0][1]}`;
                  for (let i = 0; i < coords.length - 1; i++) {
                    const p0 = coords[i];
                    const p1 = coords[i + 1];
                    const mx = (p0[0] + p1[0]) / 2;
                    d += ` C ${mx},${p0[1]} ${mx},${p1[1]} ${p1[0]},${p1[1]}`;
                  }
                  return d;
                };

                const pathWeb = genPath(ptsWeb);
                const pathUniq = genPath(ptsUniq);
                const areaWeb = `${pathWeb} L ${ptsWeb[ptsWeb.length - 1][0]},188 L ${ptsWeb[0][0]},188 Z`;

                return (
                  <>
                    <path d={areaWeb} fill="url(#trafficFillGrad)" />
                    <path d={pathWeb} fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <path d={pathUniq} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />

                    {/* Vertical dashed indicator at May (index 4) */}
                    <line 
                      x1={ptsWeb[4][0]} 
                      y1="20" 
                      x2={ptsWeb[4][0]} 
                      y2="188" 
                      stroke="#2563eb" 
                      strokeDasharray="3 3" 
                      strokeWidth="1.5"
                    />
                    <circle cx={ptsWeb[4][0]} cy={ptsWeb[4][1]} r="4.5" fill="#0f172a" stroke="#fff" strokeWidth="1.5" />
                    <circle cx={ptsUniq[4][0]} cy={ptsUniq[4][1]} r="4.5" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />

                    {/* X-axis months */}
                    {lightTrafficOverview.map((m, idx) => (
                      <text 
                        key={m.month}
                        x={55 + idx * 42}
                        y="204"
                        fill={m.month === hoveredMonthTraffic ? '#0f172a' : '#94a3b8'}
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight={m.month === hoveredMonthTraffic ? '600' : '400'}
                      >
                        {m.month}
                      </text>
                    ))}
                  </>
                );
              })()}
            </svg>

            {/* Hover Tooltip for Traffic May */}
            <div style={{
              position: 'absolute',
              top: '25px',
              left: '42%',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              pointerEvents: 'none',
              zIndex: 10,
              fontSize: '11px'
            }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                May
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0f172a' }} />
                  Website Visitors
                </span>
                <strong style={{ color: '#0f172a' }}>86,400</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', color: '#64748b', marginTop: '2px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                  Unique Visitors
                </span>
                <strong style={{ color: '#3b82f6' }}>54,200</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: TWO 50% CARDS (Top Products vs Sales by Channel) */}
      <div className="light-two-col-row">
        {/* Left: Top Products Table */}
        <div className="light-card">
          <div className="light-card-header">
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Top Products</h3>
            <button 
              onClick={onViewAllProducts}
              style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '500' }}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Table */}
          <div style={{ width: '100%', overflowX: 'auto', marginTop: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ color: '#94a3b8', borderBottom: '1px solid #f1f5f9', fontWeight: '500' }}>
                  <th style={{ padding: '8px 12px 12px 0' }}>Product</th>
                  <th style={{ padding: '8px 12px 12px 12px' }}>Revenue ↓</th>
                  <th style={{ padding: '8px 12px 12px 12px' }}>Orders</th>
                  <th style={{ padding: '8px 0 12px 12px' }}>Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {lightTopProducts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    {/* Product Name & Icon */}
                    <td style={{ padding: '12px 12px 12px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {getProductIcon(p.icon)}
                        </div>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{p.name}</span>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td style={{ padding: '12px', fontWeight: '600', color: '#0f172a' }}>
                      {p.revenue}
                    </td>

                    {/* Orders */}
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      {p.orders}
                    </td>

                    {/* Conversion Rate + Mini Sparkline */}
                    <td style={{ padding: '12px 0 12px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: '600', color: '#0f172a', minWidth: '42px' }}>
                          {p.conversion}
                        </span>
                        <div style={{ width: '70px' }}>
                          {renderSparkline(p.sparkline, '#22c55e')}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Sales by Channel Donut & Breakdown */}
        <div className="light-card">
          <div className="light-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Sales by Channel</h3>
              <Info size={14} color="#94a3b8" />
            </div>
            <button 
              onClick={onViewSalesReport}
              style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '500' }}
            >
              <span>View Report</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginTop: '16px' }}>
            {/* Donut SVG */}
            <div style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0 }}>
              <svg viewBox="0 0 150 150" width="100%" height="100%">
                <circle cx="75" cy="75" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="22" />
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="75"
                    cy="75"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="22"
                    strokeDasharray={`${seg.strokeDash} ${circumference}`}
                    strokeDashoffset={seg.strokeDashoffset}
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '75px 75px',
                      transition: 'all 0.3s'
                    }}
                  />
                ))}
              </svg>

              {/* Center Total Text */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  {lightChannelData.total}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Total Revenue
                </div>
              </div>
            </div>

            {/* Breakdown List */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lightChannelData.channels.map((ch) => (
                <div key={ch.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ch.color }} />
                    <span style={{ color: '#0f172a', fontWeight: '500' }}>{ch.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>{ch.amount}</span>
                    <span style={{ color: '#16a34a', fontWeight: '600', minWidth: '45px', textAlign: 'right' }}>
                      ↑ {ch.growth}
                    </span>
                  </div>
                </div>
              ))}

              {/* Total Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9',
                fontSize: '12px',
                marginTop: '4px'
              }}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>Total</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{lightChannelData.total}</span>
                  <span style={{ color: '#16a34a', fontWeight: '700', minWidth: '45px', textAlign: 'right' }}>
                    ↑ {lightChannelData.growth}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
