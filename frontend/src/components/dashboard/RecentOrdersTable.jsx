import React from 'react';
import { recentOrdersData } from '../../data/mockDashboardData';

export default function RecentOrdersTable({ onViewAll }) {
  return (
    <div className="card-container">
      <div className="card-header">
        <h3 className="card-title">Recent Orders</h3>
        <button className="view-report-link" onClick={onViewAll}>
          <span>View All</span>
        </button>
      </div>

      <div className="table-list">
        {recentOrdersData.map((order) => (
          <div key={order.id} className="order-row-item">
            <div className="order-customer-group">
              <img 
                src={order.avatar} 
                alt={order.customer} 
                className="order-avatar" 
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="order-id">{order.id}</span>
                </div>
                <div className="order-name">{order.customer}</div>
              </div>
            </div>

            <div className="order-date">{order.date}</div>

            <div className="order-amt">{order.amount}</div>

            <div>
              <span className={`badge-status ${order.statusType}`}>
                {order.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
