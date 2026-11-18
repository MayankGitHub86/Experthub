# Phase 3-4: UI/UX Redesign & Booking Journey Testing Plan

**Status:** Transitioning from code audit to live testing

---

## Phase 1 Fixes Completed ✅

1. **dateRange crash fixed**
   - Changed contract from object `{startDate, endDate}` to string preset `"Last 30 Days"`
   - Removed `.includes()` call that was causing TypeError
   - TopHeader now handles string values safely
   - Commits: f042180, 73ce925

2. **integrations tab added**
   - Sidebar had tab but App.jsx had no handler
   - Added placeholder route handler
   - Commit: e5e5169

---

## Phase 3: UI/UX Current State

### Dashboard Components (✅ Present)
- MetricCard
- RevenueChart
- SalesChannelChart
- TopProductsTable
- RecentOrdersTable
- CustomerGrowthChart
- LightModeDashboard (light theme variant)
- ExpertPortal (role-specific)
- ClientPortal (role-specific)

### Layout Components (✅ Present)
- Sidebar with role-aware navigation
- TopHeader with date range filter
- Mobile-responsive backdrop
- ErrorBoundary for crash protection

### Missing/To-Do
- [ ] Verify responsive behavior at multiple viewports
- [ ] Check dark/light theme consistency
- [ ] Ensure loading skeletons present
- [ ] Verify empty states show helpful messages
- [ ] Test modal z-index stacking
- [ ] Verify button/link hover states
- [ ] Check form validation feedback
- [ ] Verify form input accessibility (labels, placeholders, aria-labels)

---

## Phase 4: Booking Journey Workflow

### Current Architecture
1. **ExpertGrid** → User sees expert list
2. **ExpertProfileModal** → User views expert details & services
3. **BookingModal** (Step 1: Service) → User selects service
4. **BookingModal** (Step 2: Date/Time) → User picks time slot
5. **BookingModal** (Step 3: Confirm) → User confirms details
6. **StripeCheckoutModal** → Payment processing
7. **Booking Success** → Order added to dashboard

### Tested Workflows (from code inspection)

✅ **Service Loading**
- From API endpoint (if available)
- Fallback to expert.services
- Fallback to expert.packages
- Fallback to expert.hourlyRate
- Synthetic service creation

✅ **Availability Loading**
- Calls backend for expert availability on selected date
- Filters for selected service duration
- Shows available time slots

✅ **Booking Hold Creation**
- Creates atomic hold with 15-minute expiration
- Prevents double-booking
- Holds released on expiration

✅ **Payment Integration**
- Uses real Stripe test key from .env
- Creates genuine PaymentIntent via backend
- Returns client_secret
- Stripe Elements mounted only when both Stripe instance and client_secret exist

✅ **Confirmation & Settlement**
- Webhook signature validation
- Booking marked paid only after verified payment
- Transaction recorded

### Outstanding Requirements

- [ ] Test with real browser automation
- [ ] Verify timezone handling (UTC storage, local display)
- [ ] Verify no double-booking scenarios
- [ ] Verify payment timeout handling
- [ ] Verify expert sees booking on their dashboard
- [ ] Verify client sees booking in their orders
- [ ] Test cancellation workflow
- [ ] Test refund workflow (admin only)

---

## Testing Checklist

### Desktop (1440px) Tests

**Landing Page**
- [ ] Open http://localhost:5173
- [ ] All sections visible without scrolling past fold
- [ ] Navigation bar visible and clickable
- [ ] Hero section has proper spacing
- [ ] Featured experts display as cards
- [ ] Buttons are clickable
- [ ] No console errors
- [ ] No network errors

**Admin Dashboard (Dark Theme)**
- [ ] Click "Explore App" or login as admin
- [ ] Dashboard tab loads
- [ ] Sidebar visible with 10 tabs
- [ ] Metrics cards display (4 cards in first row)
- [ ] Charts render without errors
- [ ] Tables display sample data
- [ ] Dark theme applied correctly
- [ ] Date range picker functional
- [ ] No console errors

**Light Theme Dashboard**
- [ ] Sidebar theme toggle available
- [ ] Click theme toggle
- [ ] Light colors apply
- [ ] "Overview" title displays
- [ ] Export button visible and clickable
- [ ] All components visible
- [ ] No white-on-white text
- [ ] No console errors

**Customers Page (Admin)**
- [ ] Click "Customers" in sidebar
- [ ] Customer table loads
- [ ] Search bar functional
- [ ] Status filters available
- [ ] Pagination works
- [ ] Real API data displayed (if backend populated)
- [ ] No dummy data
- [ ] No console errors

**Sales Page (Admin)**
- [ ] Click "Orders" then see SalesView
- [ ] Transaction table loads
- [ ] Real payment data displays
- [ ] Search/filter work
- [ ] CSV export button works
- [ ] Export contains actual data (not hardcoded)
- [ ] No console errors

**Expert Marketplace (Client)**
- [ ] Switch to client role
- [ ] Click "Customers" (shows "Find Experts")
- [ ] Expert grid loads
- [ ] Expert cards display ratings
- [ ] Search box available
- [ ] Click expert card → ExpertProfileModal opens
- [ ] Modal shows services/packages
- [ ] "Book" button visible and clickable
- [ ] Close modal properly
- [ ] No console errors

**Booking Flow**
- [ ] Click "Book" on expert profile
- [ ] BookingModal opens (Step 1)
- [ ] Services load
- [ ] Select a service
- [ ] Click "Continue" → Step 2
- [ ] Calendar appears
- [ ] Select future date
- [ ] Time slots load
- [ ] Select time slot
- [ ] Click "Continue" → Step 3
- [ ] Details display (expert, service, date, time, price)
- [ ] Add client notes (optional)
- [ ] Click "Proceed to Payment"
- [ ] StripeCheckoutModal opens
- [ ] Stripe Elements loads
- [ ] Card input field visible
- [ ] Amount displays correctly (with platform fee breakdown)
- [ ] No console errors for Stripe initialization

**Analytics Page**
- [ ] Click "Analytics"
- [ ] KPI cards display
- [ ] Charts render (SVG-based)
- [ ] Trends and sparklines visible
- [ ] Tables load
- [ ] No console errors

**Settings Page**
- [ ] Click "Settings"
- [ ] Forms load
- [ ] No console errors

### Mobile (390px) Tests

**Landing Page**
- [ ] Hamburger menu appears
- [ ] Navigation bar responsive
- [ ] Hero section readable
- [ ] Expert cards stack vertically
- [ ] All buttons tappable (44px+ min height)
- [ ] No horizontal scroll

**Dashboard**
- [ ] Sidebar menu hamburger shows
- [ ] Click hamburger → sidebar slides
- [ ] Sidebar backdrop visible
- [ ] Close backdrop → sidebar hides
- [ ] Metrics stack vertically
- [ ] Charts responsive
- [ ] Tables horizontal scroll if needed
- [ ] No broken layout
- [ ] No overlapping elements

**Booking Modal**
- [ ] Modal responsive
- [ ] Service list scrollable
- [ ] Date picker visible
- [ ] Time slots readable
- [ ] Buttons tappable
- [ ] Keyboard navigation works
- [ ] No text clipping

### Dark/Light Theme Tests

- [ ] Dashboard theme toggle works
- [ ] All colors change appropriately
- [ ] Text contrast maintained (WCAG AA minimum)
- [ ] Backgrounds/text not inverted incorrectly
- [ ] Sidebar theme matches
- [ ] Modals themed
- [ ] Charts themed
- [ ] No unreadable text

### Network/Error Tests

- [ ] Stop backend → page shows "Connection failed"
- [ ] Stop MongoDB → API returns error
- [ ] Invalid booking data → error message displayed
- [ ] Missing Stripe key → Stripe error shown
- [ ] Network timeout → error handling
- [ ] Recovery after network restoration

---

## Real Stripe Test (If Account Eligible)

**Prerequisites:**
- Stripe test account configured
- Connected account onboarded (expert account)
- Webhook endpoint registered
- Mock webhook tool available (ngrok + Stripe CLI)

**Test Steps:**
1. Fill Stripe payment form with test card: 4242 4242 4242 4242
2. Expiry: 12/34
3. CVC: 123
4. Click "Pay"
5. Verify PaymentIntent created (check Stripe dashboard)
6. Verify webhook received
7. Verify booking status updated to "paid"
8. Verify expert sees booking

---

## Current Build Status

✅ Frontend builds successfully (1984 modules)
✅ Backend server running on port 3001
✅ MongoDB connected
✅ No critical errors in code
✅ Three commits pushed to GitHub

---

## Outstanding Issues to Address

1. **responsive design** - Needs testing and potential fixes
2. **Loading skeletons** - Verify presence or implement
3. **Error boundaries** - Already implemented, verify working
4. **Form validation** - Verify feedback UX
5. **Accessibility** - Keyboard nav, ARIA labels
6. **Empty states** - Verify helpful messages
7. **Modal stacking** - Verify z-index correct
8. **Timezone handling** - UTC storage with local display
9. **Double-booking prevention** - Verify logic
10. **Webhook settlement** - Verify only trusted signatures accepted

---

## Next Steps

1. Start live browser testing immediately after push completes
2. Document any UI issues found
3. Fix issues systematically
4. Retest after each fix
5. Capture screenshots as evidence
6. Move to Phase 5 (Stripe Checkout Root Cause Analysis)
7. Move to Phase 6 (Backend API Verification)
8. Move to Phase 7 (End-to-End Testing)
9. Generate final report with all evidence

**Estimated Time:** 2-3 hours of active testing + fixes

**Success Criteria:**
- All pages render without JavaScript errors
- All workflows complete successfully
- No fake payment data
- Real Stripe integration (if eligible)
- Responsive at all viewports
- Dark/light themes work
- Accessible navigation
- Proper error handling
