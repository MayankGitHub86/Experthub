import React, { useState, useEffect } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import Sidebar from './components/common/Sidebar';
import TopHeader from './components/common/TopHeader';
import SearchModal from './components/common/SearchModal';
import UpgradeModal from './components/common/UpgradeModal';
import NotificationsModal from './components/common/NotificationsModal';

// Dark Mode Nexora components
import MetricCard from './components/dashboard/MetricCard';
import RevenueChart from './components/dashboard/RevenueChart';
import SalesChannelChart from './components/dashboard/SalesChannelChart';
import TopProductsTable from './components/dashboard/TopProductsTable';
import RecentOrdersTable from './components/dashboard/RecentOrdersTable';
import CustomerGrowthChart from './components/dashboard/CustomerGrowthChart';

// Light Mode MetricFlow component
import LightModeDashboard from './components/dashboard/LightModeDashboard';

// Marketplace & Booking components
import ExpertGrid from './components/marketplace/ExpertGrid';
import ExpertProfileModal from './components/marketplace/ExpertProfileModal';
import BookingModal from './components/booking/BookingModal';
import StripeCheckoutModal from './components/booking/StripeCheckoutModal';

// AI Matcher & Chat
import AIMatchingAgent from './components/ai-matcher/AIMatchingAgent';
import ConsultationChat from './components/chat/ConsultationChat';

// Financials, Orders, Products, Analytics, Settings
import PayoutsManager from './components/financials/PayoutsManager';
import OrdersView from './components/orders/OrdersView';
import SalesView from './components/sales/SalesView';
import CustomersView from './components/customers/CustomersView';
import ProductsView from './components/products/ProductsView';
import AnalyticsView from './components/analytics/AnalyticsView';
import SettingsView from './components/settings/SettingsView';

// Portals
import ExpertPortal from './components/portals/ExpertPortal';
import ClientPortal from './components/portals/ClientPortal';

// Landing Page & Auth
import LandingPage from './components/landing/LandingPage';
import AuthModal from './components/auth/AuthModal';

import { dashboardMetrics } from './data/mockDashboardData';
import { mockExperts } from './data/mockExperts';


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light'); // default to light to showcase the new MetricFlow white mode or toggle
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          name: parsed.firstName ? `${parsed.firstName} ${parsed.lastName || ''}`.trim() : parsed.email,
          email: parsed.email,
          role: parsed.role || 'admin',
          avatar: parsed.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          ...parsed
        };
      }
    } catch {}
    return {
      name: 'Alex Morgan',
      email: 'admin@experthub.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    };
  });
  const [userRole, setUserRole] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) return JSON.parse(stored).role || 'admin';
    } catch {}
    return 'admin';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('accessToken')) return true;
      if (window.location.hash === '#app' || window.location.hash === '#dashboard') {
        return true;
      }
    }
    return false;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  // Modal States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile sidebar state
  
  const [selectedExpertForProfile, setSelectedExpertForProfile] = useState(null);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [activeChatExpert, setActiveChatExpert] = useState(mockExperts[0]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'payment',
      title: 'Stripe Payout Settled',
      message: '$3,450.00 routed to Dr. Aris Thorne (acct_1N9280Xy).',
      time: '12m ago'
    },
    {
      id: 2,
      type: 'booking',
      title: 'New Consultation Booked',
      message: 'Alex Rivera scheduled 45-min Deep Dive with Dr. Aris Thorne.',
      time: '34m ago'
    },
    {
      id: 3,
      type: 'ai',
      title: 'AI Match Generated',
      message: 'New client inquiry matched with 98% confidence to Sophia Chen.',
      time: '2h ago'
    }
  ]);

  // Sync theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleStartBooking = (expert, pkg = null) => {
    setSelectedExpertForProfile(null);
    setBookingTarget({ expert, selectedPackage: pkg });
  };

  const handleCompleteBooking = (bookingData) => {
    setBookingTarget(null);
    setCheckoutTarget(bookingData);
  };

  // Alias used by BookingModal's onProceedToPayment prop
  const handleProceedToPayment = (bookingData) => {
    console.log('🟢 App.jsx handleProceedToPayment called with:', bookingData);
    setBookingTarget(null);
    console.log('  ✅ Setting checkoutTarget:', bookingData);
    setCheckoutTarget(bookingData);
  };

  const handlePaymentComplete = () => {
    setCheckoutTarget(null);
    setActiveTab('orders');
    // In real app, we'd add to orders list here
  };

  const handleBookingSuccess = (newOrder) => {
    setCheckoutTarget(null);
    setNotifications((prev) => [
      {
        id: Date.now(),
        type: 'booking',
        title: 'Booking Confirmed!',
        message: `${newOrder.clientName} confirmed session for $${newOrder.amount}.00`,
        time: 'Just now'
      },
      ...prev
    ]);
    setActiveChatExpert(mockExperts.find(e => e.name === newOrder.expertName) || mockExperts[0]);
    setActiveTab('chat');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setUserRole(user.role);
    setIsAuthenticated(true);
    setIsAuthOpen(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch {}
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Channel,Percentage,Amount,Growth\n" +
      "Online Store,40%,$99360,12.4%\n" +
      "Marketplace,30%,$74520,8.7%\n" +
      "Retail,20%,$49680,15.3%\n" +
      "Wholesale,10%,$24840,6.1%\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ExpertHub_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="landing-root">
        <LandingPage 
          onLogin={() => {
            setAuthMode('login');
            setIsAuthOpen(true);
          }}
          onGetStarted={() => {
            setAuthMode('signup');
            setIsAuthOpen(true);
          }}
          onExploreApp={() => {
            setIsAuthenticated(true);
          }}
          onNavigateToExperts={() => {
            setIsAuthenticated(true);
            setActiveTab('customers');
          }}
          onSelectExpertProfile={(expert) => {
            setIsAuthenticated(true);
            setSelectedExpertForProfile(expert);
          }}
          onBookExpert={(expert) => {
            setIsAuthenticated(true);
            handleStartBooking(expert);
          }}
        />

        <AuthModal 
          isOpen={isAuthOpen}
          initialMode={authMode}
          onClose={() => setIsAuthOpen(false)}
          onAuthenticate={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); }} 
        theme={theme} 
        setTheme={setTheme}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        currentUser={currentUser}
        userRole={userRole}
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <TopHeader 
          activeTab={activeTab}
          theme={theme}
          onOpenSearch={() => setIsSearchOpen(true)}
          userRole={userRole}
          setUserRole={setUserRole}
          dateRange={dateRange}
          setDateRange={setDateRange}
          notifications={notifications}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenChat={() => setActiveTab('chat')}
          onExport={handleExportData}
          currentUser={currentUser}
          onLogout={handleLogout}
          onViewLanding={() => setIsAuthenticated(false)}
          onMenuToggle={() => setIsMobileMenuOpen(true)}
        />

        <main className="content-area">
          {/* VIEW: DASHBOARD — role-aware */}
          {activeTab === 'dashboard' && (
            userRole === 'expert' ? (
              <ExpertPortal
                theme={theme}
                onJoinSession={(booking) => {
                  const matched = mockExperts.find(e => e.id === booking.expertId) || mockExperts[0];
                  setActiveChatExpert(matched);
                  setActiveTab('chat');
                }}
              />
            ) : userRole === 'client' ? (
              <ClientPortal
                theme={theme}
                currentUser={currentUser}
                onBook={handleStartBooking}
                onViewProfile={(expert) => setSelectedExpertForProfile(expert)}
                onJoinSession={(booking) => {
                  const matched = mockExperts.find(e => e.id === booking.expertId) || mockExperts[0];
                  setActiveChatExpert(matched);
                  setActiveTab('chat');
                }}
              />
            ) : theme === 'light' ? (
              /* ADMIN — METRICFLOW LIGHT MODE */
              <LightModeDashboard
                onViewAllProducts={() => setActiveTab('products')}
                onViewSalesReport={() => setActiveTab('analytics')}
              />
            ) : (
              /* ADMIN — NEXORA DARK MODE */
              <div className="dashboard-grid">
                <div className="metrics-row">
                  {dashboardMetrics.map((metric) => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>

                <div className="charts-row">
                  <RevenueChart />
                  <SalesChannelChart onViewReport={() => setActiveTab('analytics')} />
                </div>

                <div className="bottom-row">
                  <TopProductsTable onViewAll={() => setActiveTab('products')} />
                  <RecentOrdersTable onViewAll={() => setActiveTab('orders')} />
                  <CustomerGrowthChart />
                </div>
              </div>
            )
          )}

          {/* VIEW: EXPERT MARKETPLACE (CLIENT) & CUSTOMERS MANAGEMENT (ADMIN) */}
          {activeTab === 'customers' && (
            userRole === 'admin' ? (
              <CustomersView />
            ) : (
              <ExpertGrid 
                onBook={(expert) => handleStartBooking(expert)}
                onViewProfile={(expert) => setSelectedExpertForProfile(expert)}
                onOpenAIMatcher={() => setActiveTab('ai-matcher')}
              />
            )
          )}

          {/* VIEW: PRODUCTS & SERVICE PACKAGES */}
          {activeTab === 'products' && (
            <ProductsView onBookService={() => handleStartBooking(mockExperts[0])} />
          )}

          {/* VIEW: ORDERS & BOOKINGS (CLIENT/EXPERT) / SALES LEDGER (ADMIN) */}
          {activeTab === 'orders' && (
            userRole === 'admin' ? (
              <SalesView />
            ) : (
              <OrdersView onJoinSession={(booking) => {
                const matched = mockExperts.find(e => e.id === booking.expertId) || mockExperts[0];
                setActiveChatExpert(matched);
                setActiveTab('chat');
              }} />
            )
          )}

          {/* VIEW: AI MATCHING AGENT / MARKETING */}
          {activeTab === 'ai-matcher' && (
            <AIMatchingAgent 
              onBookExpert={(expert) => handleStartBooking(expert)}
              onStartChat={(expert) => {
                setActiveChatExpert(expert);
                setActiveTab('chat');
              }}
            />
          )}

          {/* VIEW: CONSULTATION CHAT & VIDEO ROOM / REPORTS */}
          {activeTab === 'chat' && (
            <ConsultationChat selectedExpert={activeChatExpert} />
          )}

          {/* VIEW: STRIPE FINANCIALS / ALERTS */}
          {activeTab === 'financials' && (
            <PayoutsManager />
          )}

          {/* VIEW: ANALYTICS & REPORTS */}
          {activeTab === 'analytics' && (
            <AnalyticsView />
          )}

          {/* VIEW: SETTINGS & CONFIG */}
          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectExpert={(expert) => {
          setSelectedExpertForProfile(expert);
          setIsSearchOpen(false);
        }}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setIsSearchOpen(false);
        }}
      />

      <UpgradeModal 
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />

      <NotificationsModal 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onClear={() => setNotifications([])}
      />

      <ExpertProfileModal 
        expert={selectedExpertForProfile}
        onClose={() => setSelectedExpertForProfile(null)}
        onSelectPackage={(expert, pkg) => handleStartBooking(expert, pkg)}
      />

      <BookingModal 
        expert={bookingTarget?.expert}
        initialPackage={bookingTarget?.selectedPackage}
        onClose={() => setBookingTarget(null)}
        onProceedToPayment={handleProceedToPayment}
      />

      {checkoutTarget && (
        <StripeCheckoutModal 
          bookingDetails={checkoutTarget}
          onClose={() => setCheckoutTarget(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
