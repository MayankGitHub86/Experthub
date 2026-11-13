import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { salesChannelData } from '../../data/mockDashboardData';

export default function SalesChannelChart({ onViewReport }) {
  const [activeSegment, setActiveSegment] = useState(null);
  const channels = salesChannelData.channels;
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.4

  let accumulatedOffset = 0;
  const segments = channels.map((ch) => {
    const strokeDash = (ch.percentage / 100) * circumference;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += strokeDash;
    return {
      ...ch,
      strokeDash,
      strokeDashoffset,
    };
  });

  return (
    <div className="card-container">
      <div className="card-header">
        <h3 className="card-title">Sales by Channel</h3>
        <button className="view-report-link" onClick={onViewReport}>
          <span>View Report</span>
          <ExternalLink size={13} />
        </button>
      </div>

      <div className="donut-chart-container">
        {/* Donut SVG */}
        <div className="donut-svg-box">
          <svg viewBox="0 0 160 160" width="100%" height="100%">
            <defs>
              <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#8b5cf6" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Background Track Circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#1b1f32"
              strokeWidth="20"
            />

            {/* Colored Segment Arcs */}
            {segments.map((seg, idx) => {
              const isHovered = activeSegment === seg.name;
              return (
                <circle
                  key={idx}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? 24 : 20}
                  strokeDasharray={`${seg.strokeDash} ${circumference}`}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '80px 80px',
                    transition: 'stroke-width 0.2s, filter 0.2s',
                    cursor: 'pointer',
                    filter: isHovered ? `drop-shadow(0 0 8px ${seg.color})` : 'none'
                  }}
                  onMouseEnter={() => setActiveSegment(seg.name)}
                  onMouseLeave={() => setActiveSegment(null)}
                />
              );
            })}
          </svg>

          {/* Center Label */}
          <div className="donut-center-label">
            <div className="donut-center-sub">Total</div>
            <div className="donut-center-total">{salesChannelData.total}</div>
          </div>
        </div>

        {/* Breakdown Channel List */}
        <div className="channel-list">
          {channels.map((ch) => {
            const isHovered = activeSegment === ch.name;
            return (
              <div 
                key={ch.name} 
                className="channel-item"
                style={{
                  opacity: activeSegment && !isHovered ? 0.6 : 1,
                  transform: isHovered ? 'translateX(4px)' : 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={() => setActiveSegment(ch.name)}
                onMouseLeave={() => setActiveSegment(null)}
              >
                <div className="channel-info">
                  <span 
                    className="channel-bullet" 
                    style={{ backgroundColor: ch.color, boxShadow: `0 0 6px ${ch.color}` }}
                  />
                  <div>
                    <span className="channel-name">{ch.name}</span>
                    <span className="channel-pct" style={{ marginLeft: '6px' }}>{ch.percentage}%</span>
                  </div>
                </div>
                <div className="channel-amt">{ch.amount}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
