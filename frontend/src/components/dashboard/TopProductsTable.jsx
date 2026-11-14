import React from 'react';
import { topProductsData } from '../../data/mockDashboardData';
import { Headphones, Watch, Speaker, BatteryCharging } from 'lucide-react';

export default function TopProductsTable({ onViewAll }) {
  const getProductIcon = (iconName) => {
    switch (iconName) {
      case 'headphones':
        return <Headphones size={18} color="#a78bfa" />;
      case 'watch':
        return <Watch size={18} color="#60a5fa" />;
      case 'speaker':
        return <Speaker size={18} color="#34d399" />;
      case 'battery':
        return <BatteryCharging size={18} color="#f59e0b" />;
      default:
        return <Headphones size={18} color="#a78bfa" />;
    }
  };

  return (
    <div className="card-container">
      <div className="card-header">
        <h3 className="card-title">Top Products</h3>
        <button className="view-report-link" onClick={onViewAll}>
          <span>View All</span>
        </button>
      </div>

      <div className="table-list">
        {topProductsData.map((item) => (
          <div key={item.id} className="product-row-item">
            <div className="product-media-group">
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {getProductIcon(item.icon)}
              </div>
              <div>
                <div className="product-name">{item.name}</div>
                <div className="product-sales">{item.subtext}</div>
              </div>
            </div>

            <div className="product-financials">
              <div className="product-amt">{item.amount}</div>
              <div className="product-growth">↑ {item.growth}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
