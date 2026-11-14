import React, { useState } from 'react';
import { 
  Menu,
  Search, 
  Bell, 
  Mail, 
  Calendar, 
  ChevronDown, 
  Download,
  HelpCircle,
  Check, 
  Shield, 
  UserCheck, 
  ExternalLink 
} from 'lucide-react';

export default function TopHeader({ 
  activeTab, 
  theme,
  onOpenSearch, 
  userRole, 
  setUserRole, 
  dateRange, 
  setDateRange,
  notifications,
  onOpenNotifications,
  onOpenChat,
  onExport,
  currentUser,
  onLogout,
  onViewLanding,
  onMenuToggle
}) {
  const isLight = theme === 'light';
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  const getTitleAndSubtitle = () => {
    if (isLight && activeTab === 'dashboard') {
      return {
        title: "Overview",
        subtitle: "Welcome back, Michael! Here's what's happening with your business today."
      };
    }

    switch(activeTab) {
      case 'dashboard':
        return {
          title: "Dashboard",
          subtitle: `Welcome back, Alex! Here's what's happening with your platform.`
        };
      case 'analytics':
        return {
          title: "Platform Analytics",
          subtitle: "Deep-dive cohort retention, consultation funnels, and revenue metrics."
        };
      case 'customers':
        return {
          title: "Expert & Client Directory",
          subtitle: "Browse vetted domain specialists, book consultations, and view ratings."
        };
      case 'products':
        return {
          title: "Products & Packages",
          subtitle: "Manage consulting packages, advisory tiers, and digital products."
        };
      case 'orders':
        return {
          title: "Bookings & Orders",
          subtitle: "Real-time WooCommerce booking pipeline and order tracking."
        };
      case 'ai-matcher':
        return {
          title: "ExpertMatcher AI",
          subtitle: "Natural-language smart matching agent for specialized consultation needs."
        };
      case 'chat':
        return {
          title: "Consultation Room",
          subtitle: "Live WebRTC-ready chat simulator with real-time messaging."
        };
      case 'financials':
        return {
          title: "Stripe Connect Financials",
          subtitle: "Multi-vendor escrow balance, payouts, and platform commission splits."
        };
      default:
        return {
          title: "Platform Settings",
          subtitle: "Configure API credentials, webhook URLs, and platform parameters."
        };
    }
  };

  const { title, subtitle } = getTitleAndSubtitle();

  const dateOptions = isLight 
    ? ["May 1 - May 31, 2024", "Apr 1 - Apr 30, 2024", "Last 7 Days", "Year to Date (2024)"]
    : ["May 12 - Jun 10, 2026", "Last 7 Days (Jun 3 - Jun 10)", "Last 30 Days", "Year to Date (2026)"];

  const activeDatePill = isLight ? (dateRange.includes('2024') ? dateRange : 'May 1 - May 31, 2024') : dateRange;

  return (
    <header className="top-header" style={{
      backgroundColor: isLight ? '#ffffff' : 'var(--bg-primary)',
      borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid var(--border-subtle)'
    }}>
      {/* Title & Subtitle with optional Hamburger Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="mobile-menu-btn" 
          onClick={onMenuToggle}
          style={{ 
            color: isLight ? '#0f172a' : 'var(--text-primary)', 
            display: 'none', 
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }} 
          title="Open Menu"
        >
          <Menu size={24} />
        </button>
        {isLight && <div className="desktop-menu-spacer" style={{ width: '0' }} />}

        <div className="header-title-wrap">
          <h1 style={{ color: isLight ? '#0f172a' : 'var(--text-primary)' }}>{title}</h1>
          <p style={{ color: isLight ? '#64748b' : 'var(--text-secondary)' }}>{subtitle}</p>
        </div>
      </div>

      {/* Header Controls */}
      <div className="header-actions">
        {/* Search Bar Button (in Dark mode) */}
        {!isLight && (
          <button className="search-bar-btn" onClick={onOpenSearch} title="Search command palette (⌘K)">
            <Search size={15} />
            <span>Search anything...</span>
            <span className="search-kbd">⌘ K</span>
          </button>
        )}

        {/* Date Filter Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className="date-range-pill" 
            onClick={() => setShowDateMenu(!showDateMenu)}
            style={isLight ? {
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            } : {}}
          >
            <Calendar size={14} color={isLight ? '#64748b' : undefined} />
            <span>{activeDatePill}</span>
            <ChevronDown size={13} color={isLight ? '#64748b' : undefined} />
          </button>

          {showDateMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              backgroundColor: isLight ? '#ffffff' : 'var(--surface-elevated)',
              border: isLight ? '1px solid #e2e8f0' : '1px solid var(--border-medium)',
              borderRadius: '12px',
              padding: '6px',
              minWidth: '220px',
              zIndex: 50,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
            }}>
              {dateOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setDateRange(opt);
                    setShowDateMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: opt === activeDatePill ? (isLight ? '#2563eb' : 'var(--accent-purple-light)') : (isLight ? '#475569' : 'var(--text-secondary)'),
                    fontWeight: opt === activeDatePill ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: '8px',
                    textAlign: 'left'
                  }}
                >
                  <span>{opt}</span>
                  {opt === activeDatePill && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Light Mode: Export Action Button (matching MetricFlow reference) */}
        {isLight && (
          <button 
            onClick={onExport}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        )}

        {/* Notification Bell */}
        <button 
          className="icon-action-btn" 
          onClick={onOpenNotifications} 
          title="Notifications"
          style={isLight ? {
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#475569'
          } : {}}
        >
          <Bell size={18} />
          <span 
            className="badge-dot" 
            style={isLight ? { backgroundColor: '#2563eb', border: '2px solid #ffffff' } : {}}
          >
            {notifications.length}
          </span>
        </button>

        {/* View Landing Page Button */}
        <button
          onClick={onViewLanding}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '9px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: isLight ? '#eff6ff' : 'rgba(37, 99, 235, 0.15)',
            border: isLight ? '1px solid #bfdbfe' : '1px solid rgba(37, 99, 235, 0.3)',
            color: isLight ? '#1e40af' : '#93c5fd',
            transition: 'all 0.15s ease'
          }}
          title="Switch to Public Landing Page"
        >
          <ExternalLink size={14} />
          <span>Landing Page</span>
        </button>

        {/* Help Circle Icon (as in MetricFlow reference) */}
        {isLight && (
          <button 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Help & Documentation"
          >
            <HelpCircle size={18} />
          </button>
        )}

        {/* Mail / Chat Shortcut (in Dark Mode) */}
        {!isLight && (
          <button 
            className="icon-action-btn" 
            onClick={onOpenChat} 
            title="Live Consultations"
          >
            <Mail size={18} />
          </button>
        )}

        {/* Profile & Role Switcher (in Dark Mode, in light mode profile is in sidebar bottom) */}
        {!isLight && (
          <div style={{ position: 'relative' }}>
            <button 
              className="user-profile-menu"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
            >
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                alt="Alex Morgan" 
                className="user-avatar"
              />
              <div className="user-details">
                <div className="user-name">Alex Morgan</div>
                <div className="user-role">
                  {userRole === 'admin' ? 'admin@nexora.com' : userRole === 'expert' ? 'expert@nexora.com' : 'client@nexora.com'}
                </div>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {showRoleMenu && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: '12px',
                padding: '8px',
                minWidth: '220px',
                zIndex: 50,
                boxShadow: 'var(--shadow-card)'
              }}>
                <div style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Active Persona
                </div>
                <button
                  onClick={() => { setUserRole('admin'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: userRole === 'admin' ? '#c084fc' : 'var(--text-primary)',
                    backgroundColor: userRole === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'transparent'
                  }}
                >
                  <Shield size={16} />
                  <span>Admin View</span>
                </button>
                <button
                  onClick={() => { setUserRole('expert'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: userRole === 'expert' ? '#60a5fa' : 'var(--text-primary)',
                    backgroundColor: userRole === 'expert' ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
                  }}
                >
                  <UserCheck size={16} />
                  <span>Expert View</span>
                </button>
                <button
                  onClick={() => { setUserRole('client'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: userRole === 'client' ? '#34d399' : 'var(--text-primary)',
                    backgroundColor: userRole === 'client' ? 'rgba(16, 185, 129, 0.15)' : 'transparent'
                  }}
                >
                  <ExternalLink size={16} />
                  <span>Client View</span>
                </button>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '6px 0' }} />

                <button
                  onClick={() => { setShowRoleMenu(false); onViewLanding && onViewLanding(); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#93c5fd',
                    backgroundColor: 'transparent'
                  }}
                >
                  <ExternalLink size={16} />
                  <span>Public Landing Page</span>
                </button>

                <button
                  onClick={() => { setShowRoleMenu(false); onLogout && onLogout(); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#f87171',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)'
                  }}
                >
                  <ExternalLink size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
