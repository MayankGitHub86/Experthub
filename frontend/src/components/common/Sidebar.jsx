import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  ShoppingBag, 
  Users, 
  Package, 
  Sparkles, 
  MessageSquare, 
  Bell, 
  Sliders, 
  Settings, 
  Sun,
  Moon,
  ChevronDown,
  X
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, theme, setTheme, onOpenUpgrade, currentUser, onLogout, isOpen, onClose, userRole }) {
  const isLight = theme === 'light';
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const role = userRole || currentUser?.role || 'admin';

  // Navigation Items — role-aware labels for ExpertHub
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'orders', label: role === 'admin' ? 'Bookings' : 'My Bookings', icon: ShoppingBag },
    { id: 'customers', label: role === 'client' ? 'Find Experts' : 'Clients', icon: Users },
    { id: 'products', label: 'Services', icon: Package },
    { id: 'ai-matcher', label: 'AI Matcher', icon: Sparkles },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'financials', label: 'Payments', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Sliders },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 90,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div>
          {/* Brand Logo & Name */}
          <div className="brand-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="brand-icon-wrapper" style={{
                background: isLight ? '#2563eb' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                boxShadow: isLight ? '0 0 14px rgba(37, 99, 235, 0.4)' : '0 0 15px rgba(124, 58, 237, 0.5)'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 4v16l8-10 8 10V4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="brand-name" style={{ color: '#ffffff', letterSpacing: '-0.2px' }}>
                ExpertHub
              </div>
            </div>
            {/* Mobile Close Button */}
            <button 
              className="mobile-close-btn" 
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'none' // will be shown via CSS media query
              }}
            >
              <X size={24} />
            </button>
          </div>
        {/* Navigation Menu */}
        <nav>
          <ul className="nav-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    style={isActive && isLight ? {
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                      border: 'none'
                    } : {}}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div>
        {/* User profile at bottom (with popover menu) */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: '12px',
              marginBottom: '8px',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'background 0.2s'
            }}
            className="sidebar-user-row"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                src={currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                alt="User Avatar"
                style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', lineHeight: '1.2' }}>
                  {currentUser?.name || (isLight ? 'Michael Anderson' : 'Alex Morgan')}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>
                  {currentUser?.role || 'Admin'}
                </div>
              </div>
            </div>
            <ChevronDown size={14} color="#94a3b8" />
          </div>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '8px',
              marginBottom: '6px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              zIndex: 100
            }}>
              <div style={{ padding: '6px 8px', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                Signed in as <strong>{currentUser?.email || 'admin@experthub.com'}</strong>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  fontSize: '12px',
                  fontWeight: '600',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                Sign Out / Exit to Landing
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="sidebar-bottom" style={{ borderTop: 'none', paddingTop: 0 }}>
          <div className="theme-toggle-wrap" style={{ color: '#94a3b8' }}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{isLight ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <div 
            className={`toggle-switch ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle between White Mode and Dark Mode"
            style={{ backgroundColor: isLight ? '#cbd5e1' : 'var(--accent-purple)' }}
          >
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
