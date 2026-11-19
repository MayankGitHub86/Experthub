import React, { lazy, Suspense, useState, useEffect } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import Sidebar from './components/common/Sidebar';
import TopHeader from './components/common/TopHeader';
const SearchModal = lazy(() => import('./components/common/SearchModal'));
const UpgradeModal = lazy(() => import('./components/common/UpgradeModal'));
const NotificationsModal = lazy(() => import('./components/common/NotificationsModal'));

// Marketplace & Booking components
const ExpertGrid = lazy(() => import('./components/marketplace/ExpertGrid'));
const ExpertProfileModal = lazy(() => import('./components/marketplace/ExpertProfileModal'));
const BookingModal = lazy(() => import('./components/booking/BookingModal'));
const StripeCheckoutModal = lazy(() => import('./components/booking/StripeCheckoutModal'));

// AI Matcher & Chat
const AIMatchingAgent = lazy(() => import('./components/ai-matcher/AIMatchingAgent'));
const ConsultationChat = lazy(() => import('./components/chat/ConsultationChat'));

// Financials, Orders, Products, Analytics, Settings
const PayoutsManager = lazy(() => import('./components/financials/PayoutsManager'));
const OrdersView = lazy(() => import('./components/orders/OrdersView'));
const SalesView = lazy(() => import('./components/sales/SalesView'));
const CustomersView = lazy(() => import('./components/customers/CustomersView'));
const ProductsView = lazy(() => import('./components/products/ProductsView'));
const SettingsView = lazy(() => import('./components/settings/SettingsView'));

// Portals
const ExpertPortal = lazy(() => import('./components/portals/ExpertPortal'));
const ClientPortal = lazy(() => import('./components/portals/ClientPortal'));

// Landing Page & Auth
import LandingPage from './components/landing/LandingPage';
import AuthModal from './components/auth/AuthModal';

import paymentsAPI from './api/payments.js';
import authAPI from './api/auth.js';


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light'); // default to light to showcase the new MetricFlow white mode or toggle
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [postAuthDestination, setPostAuthDestination] = useState(null);
  const [marketplaceQuery, setMarketplaceQuery] = useState('');

  // Modal States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile sidebar state
  
  const [selectedExpertForProfile, setSelectedExpertForProfile] = useState(null);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [activeChatExpert, setActiveChatExpert] = useState(null);
  const [activeChatBooking, setActiveChatBooking] = useState(null);
  const [adminPaymentSummary, setAdminPaymentSummary] = useState({ records: [], total: 0, loading: true, error: '' });
  // dateRange is the selected preset name (string), not date objects
  const [dateRange, setDateRange] = useState('Last 30 Days');

  useEffect(() => {
    let cancelled = false;
    const hydrateSession = async () => {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const user = await authAPI.getCurrentUser();
          if (!cancelled && user) {
            setCurrentUser(user);
            setUserRole(user.role);
            setIsAuthenticated(true);
          }
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };
    hydrateSession();
    return () => { cancelled = true; };
  }, []);

  const [notifications, setNotifications] = useState([]);

  // Sync theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin' || activeTab !== 'dashboard') return undefined;
    let cancelled = false;
    setAdminPaymentSummary((current) => ({ ...current, loading: true, error: '' }));
    paymentsAPI.listPayments({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
      .then((result) => {
        if (!cancelled) setAdminPaymentSummary({ records: result?.payments || [], total: result?.pagination?.total || 0, loading: false, error: '' });
      })
      .catch((error) => {
        if (!cancelled) setAdminPaymentSummary({ records: [], total: 0, loading: false, error: error.response?.data?.message || 'Payment activity could not be loaded.' });
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, userRole, activeTab]);

  const handleStartBooking = (expert, pkg = null) => {
    if (!expert) return;
    setSelectedExpertForProfile(null);
    setBookingTarget({ expert, selectedPackage: pkg });
  };

  // Alias used by BookingModal's onProceedToPayment prop
  const handleProceedToPayment = (bookingData) => {
    setBookingTarget(null);
    setCheckoutTarget(bookingData);
  };

  const handleBookingSuccess = () => {
    setCheckoutTarget(null);
    setNotifications((prev) => [
      {
        id: Date.now(),
        type: 'booking',
        title: 'Payment Confirmed',
        message: 'The server confirmed payment for your booking.',
        time: 'Just now'
      },
      ...prev
    ]);
    setActiveChatBooking(null);
    setActiveTab('orders');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setUserRole(user.role);
    setIsAuthenticated(true);
    setIsAuthOpen(false);
    setActiveTab(postAuthDestination?.tab === 'customers' && user.role === 'client' ? 'customers' : 'dashboard');
    setPostAuthDestination(null);
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRole(null);
    setActiveTab('dashboard');
  };

  if (!authReady) {
    return <div className="landing-root" aria-busy="true" />;
  }

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
          onNavigateToExperts={(query = '') => {
            setPostAuthDestination({ tab: 'customers', query });
            setMarketplaceQuery(query);
            setAuthMode('login');
            setIsAuthOpen(true);
          }}
          onSelectExpertProfile={(expert) => {
            setSelectedExpertForProfile(expert);
            setAuthMode('login');
            setIsAuthOpen(true);
          }}
          onBookExpert={(expert) => {
            handleStartBooking(expert);
            setAuthMode('login');
            setIsAuthOpen(true);
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
          dateRange={dateRange}
          setDateRange={setDateRange}
          notifications={notifications}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenChat={() => setActiveTab('chat')}
          currentUser={currentUser}
          onLogout={handleLogout}
          onViewLanding={() => setIsAuthenticated(false)}
          onMenuToggle={() => setIsMobileMenuOpen(true)}
        />

        <main className="content-area">
          <Suspense fallback={<p role="status">Loading workspace…</p>}>
          {/* VIEW: DASHBOARD — role-aware */}
          {activeTab === 'dashboard' && (
            userRole === 'expert' ? (
              <ExpertPortal
                theme={theme}
                onJoinSession={(booking) => {
                  setActiveChatBooking(booking);
                  setActiveChatExpert(null);
                  setActiveTab('chat');
                }}
              />
            ) : userRole === 'client' ? (
              <ClientPortal
                theme={theme}
                currentUser={currentUser}
                onBook={handleStartBooking}
                onBrowseExperts={() => setActiveTab('customers')}
                onViewProfile={(expert) => setSelectedExpertForProfile(expert)}
                onJoinSession={(booking) => {
                  setActiveChatBooking(booking);
                  setActiveChatExpert(null);
                  setActiveTab('chat');
                }}
              />
            ) : (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <header><h2>Payment Activity</h2><p>Latest records from the payment ledger.</p></header>
                {adminPaymentSummary.error && <p role="alert" style={{ color: '#ef4444' }}>{adminPaymentSummary.error}</p>}
                {adminPaymentSummary.loading ? <p role="status">Loading payment activity…</p> : <>
                  <div className="metrics-row"><div className="metric-card"><div className="metric-title">Recorded payments</div><div className="metric-value">{adminPaymentSummary.total}</div></div></div>
                  {adminPaymentSummary.records.length === 0 ? <p>No payment transactions are recorded.</p> : <div className="card-container" style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: '620px', textAlign: 'left', borderCollapse: 'collapse' }}><thead><tr>{['Date', 'Client', 'Expert', 'Booking', 'Status'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{adminPaymentSummary.records.map((payment) => <tr key={payment.id}><td>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '—'}</td><td>{payment.clientName || '—'}</td><td>{payment.expertName || '—'}</td><td>{payment.bookingNumber || payment.bookingId || '—'}</td><td>{payment.status}</td></tr>)}</tbody></table></div>}
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Showing up to 10 latest records. Open Sales for filters and pagination.</p>
                </>}
              </section>
            )
          )}

          {/* VIEW: EXPERT MARKETPLACE (CLIENT) & CUSTOMERS MANAGEMENT (ADMIN) */}
          {activeTab === 'customers' && (
            userRole === 'admin' ? (
              <CustomersView />
            ) : (
              <ExpertGrid 
                initialSearchQuery={marketplaceQuery}
                onInitialSearchApplied={() => setMarketplaceQuery('')}
                onBook={(expert) => handleStartBooking(expert)}
                onViewProfile={(expert) => setSelectedExpertForProfile(expert)}
                onOpenAIMatcher={() => setActiveTab('ai-matcher')}
              />
            )
          )}

          {/* VIEW: PRODUCTS & SERVICE PACKAGES */}
          {activeTab === 'products' && (
            <ProductsView canBook={userRole === 'client'} onBookService={(service) => handleStartBooking(service.expertId, service)} />
          )}

          {/* VIEW: ORDERS & BOOKINGS (CLIENT/EXPERT) / SALES LEDGER (ADMIN) */}
          {activeTab === 'orders' && (
            userRole === 'admin' ? (
              <SalesView />
            ) : (
              <OrdersView onJoinSession={(booking) => {
                setActiveChatBooking(booking);
                setActiveChatExpert(null);
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
                setActiveChatBooking(null);
                setActiveTab('chat');
              }}
            />
          )}

          {/* VIEW: CONSULTATION CHAT & VIDEO ROOM / REPORTS */}
          {activeTab === 'chat' && (
            <ConsultationChat selectedExpert={activeChatExpert} initialBooking={activeChatBooking} currentUser={currentUser} />
          )}

          {/* VIEW: STRIPE FINANCIALS / ALERTS */}
          {activeTab === 'financials' && (
            <PayoutsManager />
          )}

          {/* VIEW: ANALYTICS & REPORTS */}
          {activeTab === 'analytics' && (
            <SalesView />
          )}

          {/* VIEW: SETTINGS & CONFIG */}
          {activeTab === 'settings' && (
            <SettingsView />
          )}

          {/* VIEW: INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <h2>Integrations</h2>
              <p>Integration management coming soon.</p>
            </div>
          )}
          </Suspense>
        </main>
      </div>

      {/* Global Modals */}
      <Suspense fallback={null}>
      {isSearchOpen && <SearchModal
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
      />}

      {isUpgradeOpen && <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />}

      {isNotificationsOpen && <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onClear={() => setNotifications([])}
      />}

      {selectedExpertForProfile && <ExpertProfileModal
        expert={selectedExpertForProfile}
        onClose={() => setSelectedExpertForProfile(null)}
        onSelectPackage={(expert, pkg) => handleStartBooking(expert, pkg)}
      />}

      {bookingTarget && <BookingModal
        expert={bookingTarget?.expert}
        initialPackage={bookingTarget?.selectedPackage}
        onClose={() => setBookingTarget(null)}
        onProceedToPayment={handleProceedToPayment}
      />}

      {checkoutTarget && (
        <StripeCheckoutModal 
          bookingDetails={checkoutTarget}
          onClose={() => setCheckoutTarget(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
      </Suspense>
    </div>
    </ErrorBoundary>
  );
}
