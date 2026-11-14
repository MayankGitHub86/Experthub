import React, { useState } from 'react';
import { revenueOverviewData } from '../../data/mockDashboardData';

export default function RevenueChart() {
  const [timeframe, setTimeframe] = useState('daily');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const data = revenueOverviewData[timeframe] || revenueOverviewData.daily;
  const maxVal = 60000;
  const svgWidth = 640;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingBottom = 30;
  const paddingTop = 15;
  const paddingRight = 20;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  // Calculate coordinates
  const points = data.map((item, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartW;
    const yRev = paddingTop + chartH - (item.revenue / maxVal) * chartH;
    const yExp = paddingTop + chartH - (item.expenses / maxVal) * chartH;
    return { ...item, x, yRev, yExp };
  });

  // Curve generation
  const generateSmoothPath = (pts, key) => {
    if (!pts.length) return '';
    let d = `M ${pts[0].x},${pts[0][key]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx},${p0[key]} ${mx},${p1[key]} ${p1.x},${p1[key]}`;
    }
    return d;
  };

  const revenuePath = generateSmoothPath(points, 'yRev');
  const expensesPath = generateSmoothPath(points, 'yExp');
  
  // Closed path for gradient area
  const areaPath = `${revenuePath} L ${points[points.length - 1].x},${paddingTop + chartH} L ${points[0].x},${paddingTop + chartH} Z`;

  const yLabels = ["$60K", "$45K", "$30K", "$15K", "$0"];

  return (
    <div className="card-container">
      <div className="card-header">
        <h3 className="card-title">Revenue Overview</h3>
        <div className="card-actions">
          {/* Legend */}
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }}></span>
              <span>Revenue</span>
            </div>
            <div className="legend-item">
              <span className="legend-dash" style={{ backgroundColor: '#3b82f6' }}></span>
              <span>Expenses</span>
            </div>
          </div>

          {/* Timeframe selector */}
          <select 
            className="time-filter-select"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="revenue-chart-area">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          width="100%" 
          height="100%"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Purple Gradient Fill */}
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id="neonGlowPurple" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#8b5cf6" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Grid lines & Y Labels */}
          {yLabels.map((label, idx) => {
            const yPos = paddingTop + (idx / (yLabels.length - 1)) * chartH;
            return (
              <g key={label}>
                <line 
                  x1={paddingLeft} 
                  y1={yPos} 
                  x2={svgWidth - paddingRight} 
                  y2={yPos} 
                  stroke="#1c2033" 
                  strokeDasharray="3 3"
                />
                <text 
                  x={paddingLeft - 8} 
                  y={yPos + 4} 
                  fill="#64748b" 
                  fontSize="11" 
                  textAnchor="end"
                  fontFamily="Inter"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* X Axis Date Labels */}
          {points.map((p, idx) => {
            // Show every few labels to avoid crowding
            const showLabel = timeframe === 'daily' ? idx % 2 === 0 || idx === points.length - 1 : true;
            if (!showLabel) return null;
            return (
              <text 
                key={p.label}
                x={p.x}
                y={svgHeight - 8}
                fill="#64748b"
                fontSize="11"
                textAnchor="middle"
                fontFamily="Inter"
              >
                {p.label}
              </text>
            );
          })}

          {/* Area Gradient */}
          <path d={areaPath} fill="url(#revenueGrad)" />

          {/* Expenses Line (Dashed Blue) */}
          <path 
            d={expensesPath} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2" 
            strokeDasharray="5 4"
            opacity="0.8"
          />

          {/* Revenue Line (Glowing Purple) */}
          <path 
            d={revenuePath} 
            fill="none" 
            stroke="#8b5cf6" 
            strokeWidth="3" 
            filter="url(#neonGlowPurple)"
          />

          {/* Interactive Hover Dots */}
          {points.map((p, idx) => (
            <g key={idx} onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)}>
              {/* Invisible touch target */}
              <circle cx={p.x} cy={p.yRev} r="14" fill="transparent" style={{ cursor: 'pointer' }} />
              
              {/* Visible dot on hover */}
              {hoveredPoint && hoveredPoint.label === p.label && (
                <>
                  <circle cx={p.x} cy={p.yRev} r="6" fill="#8b5cf6" stroke="#ffffff" strokeWidth="2" />
                  <circle cx={p.x} cy={p.yExp} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                  <line 
                    x1={p.x} 
                    y1={paddingTop} 
                    x2={p.x} 
                    y2={paddingTop + chartH} 
                    stroke="rgba(139, 92, 246, 0.4)" 
                    strokeDasharray="2 2" 
                  />
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            left: `${(hoveredPoint.x / svgWidth) * 100}%`,
            top: `${(hoveredPoint.yRev / svgHeight) * 100 - 30}%`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#1a1e32',
            border: '1px solid #333a59',
            borderRadius: '8px',
            padding: '8px 12px',
            pointerEvents: 'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            zIndex: 10
          }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{hoveredPoint.label}</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#a78bfa' }}>
              Revenue: ${hoveredPoint.revenue.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#60a5fa' }}>
              Expenses: ${hoveredPoint.expenses.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
