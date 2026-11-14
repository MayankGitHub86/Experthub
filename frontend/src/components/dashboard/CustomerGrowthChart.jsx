import React, { useState } from 'react';
import { customerGrowthData } from '../../data/mockDashboardData';

export default function CustomerGrowthChart() {
  const [hoveredMonth, setHoveredMonth] = useState(null);

  return (
    <div className="card-container">
      <div className="card-header" style={{ marginBottom: '14px' }}>
        <h3 className="card-title">Customer Growth</h3>
        <select className="time-filter-select" defaultValue="monthly">
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div className="growth-header-stats">
        <div className="growth-stat-value">842</div>
        <div className="growth-stat-sub">
          <span style={{ color: 'var(--text-muted)' }}>Total Customers </span>
          <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>↑ 15.3% vs last month</span>
        </div>
      </div>

      {/* Vertical Bar Chart */}
      <div className="bars-container">
        {customerGrowthData.map((item) => {
          const isHovered = hoveredMonth === item.month;
          return (
            <div 
              key={item.month} 
              className="bar-col"
              onMouseEnter={() => setHoveredMonth(item.month)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {/* Value floating tag on hover */}
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                color: isHovered ? '#c084fc' : 'transparent',
                transition: 'color 0.2s',
                height: '14px'
              }}>
                {item.count}
              </div>

              {/* Glowing Bar Pillar */}
              <div 
                className="bar-pill" 
                style={{ 
                  height: `${item.heightPct}%`,
                  boxShadow: isHovered ? '0 0 16px rgba(139, 92, 246, 0.7)' : 'none',
                  background: isHovered 
                    ? 'linear-gradient(180deg, #a78bfa 0%, #60a5fa 100%)' 
                    : 'linear-gradient(180deg, #8b5cf6 0%, #3b82f6 100%)'
                }}
              />
              
              {/* Month Label */}
              <div 
                className="bar-label"
                style={{
                  color: isHovered ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: isHovered ? '600' : '400'
                }}
              >
                {item.month}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
