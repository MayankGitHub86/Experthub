import React from 'react';
import { DollarSign, ShoppingBag, Users, TrendingUp, Info } from 'lucide-react';

export default function MetricCard({ metric }) {
  const getIcon = () => {
    switch (metric.icon) {
      case 'dollar':
        return <DollarSign size={20} color={metric.iconColor} />;
      case 'bag':
        return <ShoppingBag size={20} color={metric.iconColor} />;
      case 'users':
        return <Users size={20} color={metric.iconColor} />;
      case 'trending':
        return <TrendingUp size={20} color={metric.iconColor} />;
      default:
        return <DollarSign size={20} color={metric.iconColor} />;
    }
  };

  // Generate smooth SVG path from sparkline points
  const generateSvgPath = (points) => {
    const width = 280;
    const height = 36;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 8) - 4;
      return [x, y];
    });

    let d = `M ${coords[0][0]},${coords[0][1]}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const mx = (p0[0] + p1[0]) / 2;
      d += ` C ${mx},${p0[1]} ${mx},${p1[1]} ${p1[0]},${p1[1]}`;
    }
    return d;
  };

  const pathString = generateSvgPath(metric.sparklinePoints);

  return (
    <div className="metric-card">
      <div className="metric-header">
        <div className="metric-title-group">
          <span className="metric-title">{metric.title}</span>
          <Info size={13} className="metric-info-icon" />
        </div>
        <div 
          className="metric-icon-box"
          style={{ backgroundColor: metric.iconBg }}
        >
          {getIcon()}
        </div>
      </div>

      <div className="metric-value">{metric.value}</div>

      <div className="metric-footer">
        <span className={`metric-trend ${metric.isPositive ? 'positive' : 'negative'}`}>
          ↑ {metric.change}
        </span>
        <span className="metric-comparison">{metric.comparison}</span>
      </div>

      {/* SVG Sparkline */}
      <div className="sparkline-container">
        <svg 
          viewBox="0 0 280 36" 
          width="100%" 
          height="100%" 
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id={`glow-${metric.id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={metric.sparklineColor} floodOpacity="0.7" />
            </filter>
          </defs>
          <path
            d={pathString}
            fill="none"
            stroke={metric.sparklineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            filter={`url(#glow-${metric.id})`}
          />
        </svg>
      </div>
    </div>
  );
}
