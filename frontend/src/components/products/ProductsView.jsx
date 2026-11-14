import React from 'react';
import { Package, Plus, DollarSign, Clock, ArrowRight } from 'lucide-react';
import { topProductsData } from '../../data/mockDashboardData';

export default function ProductsView({ onBookService }) {
  const serviceCatalog = [
    {
      id: "srv-1",
      name: "AI & LLM Architecture Audit",
      category: "Advisory Sprint",
      price: "$280.00",
      duration: "45 mins",
      sales: "1,240 sold",
      growth: "+18.2%",
      desc: "Live code, vector index, and latency inspection with Senior AI Architects."
    },
    {
      id: "srv-2",
      name: "Design System & Token Architecture",
      category: "UI/UX Consultation",
      price: "$320.00",
      duration: "60 mins",
      sales: "890 sold",
      growth: "+12.4%",
      desc: "Figma token variables, React 19 component library audit, and dark-mode styling."
    },
    {
      id: "srv-3",
      name: "Kubernetes & AWS Cost Teardown",
      category: "Cloud Infrastructure",
      price: "$310.00",
      duration: "60 mins",
      sales: "750 sold",
      growth: "+9.6%",
      desc: "EKS cluster rightsizing, spot instance strategy, and monthly cloud bill reduction."
    },
    {
      id: "srv-4",
      name: "Smart Contract Threat Modeling",
      category: "Security & Web3",
      price: "$380.00",
      duration: "60 mins",
      sales: "430 sold",
      growth: "+14.1%",
      desc: "Formal verification check, reentrancy vulnerabilities, and gas profiling."
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="view-header">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Services & Product Catalog
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            WooCommerce standardized consultation tiers and digital advisory products
          </p>
        </div>

        <button className="btn-pro" style={{ width: 'auto', padding: '9px 18px' }}>
          <Plus size={15} />
          <span>New Service Tier</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {serviceCatalog.map((item) => (
          <div key={item.id} className="card-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: 'var(--accent-purple-light)'
                }}>
                  {item.category}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600' }}>
                  ↑ {item.growth}
                </span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {item.name}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                {item.desc}
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {item.duration} • {item.sales}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {item.price}
                </div>
              </div>

              <button 
                onClick={() => onBookService(item)}
                className="btn-pro" 
                style={{ width: '100%', padding: '9px' }}
              >
                <span>Book Package</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
