# Phase 3: Frontend-Backend Integration Implementation Plan

**Timeline**: 7 Days (Nov 14-20, 2026)  
**Goal**: Migrate from mock data to real API integration without Stripe payments  
**Current Status**: Phase 3A COMPLETE ✓

## Overall Architecture

```
Frontend (React, Vite)          Backend (Express, Node)
├── AuthModal.jsx               ├── POST /api/v1/auth/login
├── ExpertGrid.jsx         ──→  ├── GET /api/v1/experts
├── BookingModal.jsx       ──→  ├── POST /api/v1/bookings/holds
├── ConsultationChat.jsx   ──→  ├── WebSocket /chat
└── AIMatchingAgent.jsx    ──→  └── POST /api/v1/bookings/confirm
```

---

## Phase 3A - Authentication ✅ COMPLETE

**Dates**: Nov 14, 2026  
**Commit**: `4cc9cc2`

### Completed
✅ Created `/frontend/src/api/client.js`
- Axios instance with JWT token injection
- Request/response interceptors for automatic token refresh
- CORS configured with credentials

✅ Created `/frontend/src/api/auth.js`  
- Wrapper for `POST /api/v1/auth/login`
- Stores JWT tokens in localStorage

✅ Modified AuthModal.jsx
- Real API calls instead of mock 1200ms delay
- Error handling and display

✅ Verification
- Test user created: `phase3test@example.com / TestPassword123!`
- Login tested successfully: ✓ Status 200
- JWT token verified: ✓ Valid structure
- Backend tests: 40/40 passing ✓

---

## Phase 3B - Marketplace Integration (TODO)

**Estimated Timeline**: 1 Day (Nov 15)

### Goal
Replace mock expert data with real API calls. Display real experts, services, and availability.

### Tasks

#### 1. Create Expert API Wrapper
**File**: `/frontend/src/api/experts.js`

```javascript
export const expertsAPI = {
  // GET /api/v1/experts
  getAll: async (filters = {}) => { ... },
  
  // GET /api/v1/experts/:id
  getById: async (id) => { ... },
  
  // GET /api/v1/services/expert/:expertId
  getServices: async (expertId) => { ... },
  
  // GET /api/v1/availability/expert/:expertId
  getAvailability: async (expertId, date) => { ... }
};
```

#### 2. Modify ExpertGrid Component
**File**: `/frontend/src/components/marketplace/ExpertGrid.jsx`

Current: Hardcoded `mockExperts.js` with 11 static experts

Changes:
- Load experts via `expertsAPI.getAll()`
- Show loading state while fetching
- Handle errors gracefully
- Pagination (if API supports it)
- Search/filter by expertise

#### 3. Update Expert Card Component
**File**: `/frontend/src/components/marketplace/ExpertCard.jsx`

- Load services from `expertsAPI.getServices(expertId)`
- Load availability from `expertsAPI.getAvailability(expertId, date)`
- Display real service prices and durations
- Show available time slots

#### 4. Integration Points

```
ExpertGrid
├── Calls expertsAPI.getAll()
├── Maps response to ExpertCard components
├── Each card calls expertsAPI.getServices()
├── Each card calls expertsAPI.getAvailability()
└── User can click to book
```

### Testing Checklist

- [ ] GET /api/v1/experts returns real experts from database
- [ ] ExpertGrid displays expert count from API (not 11 mock)
- [ ] Click expert shows real services (not mock data)
- [ ] Availability calendar shows real slots from backend
- [ ] Can scroll through multiple experts
- [ ] Error handling if API is unavailable
- [ ] Loading states while fetching data
- [ ] Responsive on mobile (768px+)

### Success Criteria

- ✓ No hardcoded mock experts in UI
- ✓ All data loaded from `/api/v1/experts`
- ✓ Real services displayed from database
- ✓ Real availability slots from ReservationUnit
- ✓ User can search/filter experts
- ✓ Performance: < 2s load time for expert list

---

## Phase 3C - Booking Integration (TODO)

**Estimated Timeline**: 1.5 Days (Nov 16-17)

### Goal
Real booking flow: create hold → confirm booking → persist to database

### Tasks

#### 1. Create Booking API Wrapper
**File**: `/frontend/src/api/bookings.js`

```javascript
export const bookingsAPI = {
  // POST /api/v1/bookings/holds
  createHold: async (expertId, slotId, serviceId) => { ... },
  
  // POST /api/v1/bookings/confirm
  confirmBooking: async (holdId, paymentMethod) => { ... },
  
  // GET /api/v1/bookings/me
  getMyBookings: async () => { ... }
};
```

#### 2. Modify BookingModal Component
**File**: `/frontend/src/components/booking/BookingModal.jsx`

Current: Local state only, no API calls

Changes:
- Call `bookingsAPI.createHold()` when user clicks "Book"
- Show hold ID for reference
- Call `bookingsAPI.confirmBooking()` on final confirmation
- Handle errors (slot no longer available, etc.)
- Skip payment (no Stripe in Phase 3)

#### 3. Update OrdersView
**File**: `/frontend/src/views/OrdersView.jsx`

Current: Shows `mockBookings.js` (static data)

Changes:
- Call `bookingsAPI.getMyBookings()` on load
- Display real booking history from database
- Show booking status: pending, confirmed, completed, cancelled
- Allow cancellation if status allows

### Testing Checklist

- [ ] Create booking hold: POST returns holdId
- [ ] Hold expires after 5 minutes (backend enforces)
- [ ] Cannot double-book same slot
- [ ] Confirm booking creates Booking document
- [ ] Booking persists in MongoDB
- [ ] getMyBookings() shows confirmed bookings
- [ ] OrdersView displays real booking history
- [ ] Can view booking details: expert, date, time, service

### Success Criteria

- ✓ No mock bookings in UI
- ✓ Real holds created with 5-min expiry
- ✓ Bookings confirmed and persisted to DB
- ✓ User can see their booking history
- ✓ Concurrency protection (no double-booking)
- ✓ Atomic transactions working

---

## Phase 3D - Chat Persistence (TODO)

**Estimated Timeline**: 0.5 Days (Nov 17)

### Goal
Enable MongoDB persistence for chat messages. Stop using in-memory Map storage.

### Tasks

#### 1. Update Backend Chat Routes
**File**: `/backend/routes/chat.js`

Current: In-memory `messages` Map storage

Changes:
- Replace Map with MongoDB Message model calls
- Each new message: `await new Message({...}).save()`
- Emit via Socket.io after save

#### 2. Create Chat API Wrapper (Frontend)
**File**: `/frontend/src/api/chat.js`

```javascript
export const chatAPI = {
  // GET /api/chat/:conversationId
  getMessages: async (conversationId) => { ... },
  
  // POST /api/chat/send
  sendMessage: async (conversationId, content) => { ... }
};
```

#### 3. Modify ConsultationChat Component
**File**: `/frontend/src/components/chat/ConsultationChat.jsx`

- Load message history from `chatAPI.getMessages()`
- Listen to Socket.io for new messages
- Send via `chatAPI.sendMessage()`
- Display "Message saved" confirmation

### Testing Checklist

- [ ] Messages saved to MongoDB after Socket.io send
- [ ] Can reload page and see message history
- [ ] New messages appear in real-time via Socket.io
- [ ] Message timestamps are accurate
- [ ] Conversation persists between sessions

### Success Criteria

- ✓ Chat messages persisted to MongoDB
- ✓ Message history loads on page refresh
- ✓ Real-time updates via Socket.io still working
- ✓ No data loss on server restart

---

## Phase 3E - Expert Onboarding (TODO)

**Estimated Timeline**: 1.5 Days (Nov 18)

### Goal
Create flow for experts to register, set services, and configure availability.

### Tasks

#### 1. Create Expert Registration Flow
**File**: `/frontend/src/modules/expert-signup/`

- Signup role selector: Already shows "Expert" option
- After registration, redirect to expert onboarding
- Call `POST /api/v1/experts` to create expert profile

#### 2. Create Service Management UI
**File**: `/frontend/src/components/services/ServiceForm.jsx`

- Form to add services:
  - Service name, description, duration, price
  - Call `POST /api/v1/services` to create
- View existing services
- Delete/edit services

#### 3. Create Availability Management UI
**File**: `/frontend/src/components/availability/AvailabilityScheduler.jsx`

- Calendar to set availability
- Add time slots per day
- Call `POST /api/v1/availability/slots` to create
- Delete/edit slots

### Testing Checklist

- [ ] Expert can register and be marked as role: 'expert'
- [ ] Expert profile created via API
- [ ] Can add services with name/price/duration
- [ ] Services saved to database
- [ ] Can set availability calendar
- [ ] Slots saved to ReservationUnit
- [ ] Own availability visible when experts browse profile

### Success Criteria

- ✓ Non-functional admin UI not needed
- ✓ Experts can self-onboard
- ✓ Services and availability configurable
- ✓ Data persists to database

---

## Phase 3F - Theme & Responsive Design (TODO)

**Estimated Timeline**: 0.5 Days (Nov 19)

### Goal
Ensure dark theme toggle works and layout responsive across devices.

### Tasks

#### 1. Implement Theme Persistence
**File**: `/frontend/src/hooks/useTheme.js`

Current: Theme toggle works but doesn't persist

Changes:
- Store theme selection in localStorage
- Load theme from localStorage on mount
- Sync across tabs

#### 2. Verify Responsive Breakpoints
**File**: `/frontend/src/index.css`

Test at breakpoints:
- 1440px (desktop)
- 1366px (laptop)
- 768px (tablet)
- 390px (mobile)

Changes:
- Fix layout issues at each breakpoint
- Ensure touch targets are 44px minimum
- Test on real mobile device

### Testing Checklist

- [ ] Theme toggle persists on page refresh
- [ ] Theme persists across browser tabs
- [ ] Layout looks good at 1440px
- [ ] Layout looks good at 768px
- [ ] Layout looks good at 390px
- [ ] Touch targets are properly sized

### Success Criteria

- ✓ Dark theme preference saved
- ✓ Responsive at all breakpoints
- ✓ Mobile-first design verified

---

## Phase 3G - Testing & Launch (TODO)

**Estimated Timeline**: 1 Day (Nov 20)

### Final Testing

#### Backend Test Suite
```bash
cd backend
npm test
```

Expected: 40/40 tests passing

#### Frontend Build
```bash
cd frontend
npm run build
```

Expected: Zero errors, dist/ folder created

#### E2E User Journey Testing

**Journey 1: Client Books Expert**
1. Start: Landing page
2. Click "Get Started"
3. Sign up as client
4. Browse experts
5. Click expert → view services
6. Click "Book Now"
7. Select time slot
8. Confirm booking
9. See booking in "My Bookings"

**Journey 2: Expert Joins Platform**
1. Sign up as expert
2. Add service: "React Consulting - $150/hr"
3. Set availability: Mon-Fri 9am-5pm
4. View profile as other user sees it
5. Receive booking from Journey 1

**Journey 3: Chat During Session**
1. Booked user enters consultation
2. Types message to expert
3. Expert responds in real-time
4. Both see full message history
5. Refresh page → messages persist

### Deployment Checklist

- [ ] All tests passing
- [ ] No console errors
- [ ] No TypeScript warnings
- [ ] Frontend builds without warnings
- [ ] All API endpoints tested
- [ ] Error handling implemented
- [ ] Environment variables documented

### Git & Release

```bash
# Final commit
git add -A
git commit -m "feat(phase3): complete frontend-backend integration

- Phase 3A: Real JWT authentication ✓
- Phase 3B: Real expert marketplace ✓
- Phase 3C: Real booking flow ✓
- Phase 3D: Chat persistence ✓
- Phase 3E: Expert onboarding ✓
- Phase 3F: Responsive design ✓

E2E user journeys verified:
✓ Client signup → book expert → chat
✓ Expert signup → add service → receive bookings
✓ Chat persists across sessions

Backend: 40/40 tests passing
Frontend: Production build successful
No Stripe payment integration (Phase 4 feature)
"

# Tag release
git tag -a v0.3.0 -m "Phase 3: Full frontend-backend integration"

# Push
git push origin main --tags
```

---

## Current Status Summary

| Phase | Task | Status | Commit |
|-------|------|--------|--------|
| 3A | Authentication | ✅ COMPLETE | 4cc9cc2 |
| 3B | Marketplace | 🔄 TODO | - |
| 3C | Booking | 🔄 TODO | - |
| 3D | Chat Persistence | 🔄 TODO | - |
| 3E | Expert Onboarding | 🔄 TODO | - |
| 3F | Responsive Design | 🔄 TODO | - |
| 3G | Testing & Launch | 🔄 TODO | - |

---

## Known Blockers

**None** - All dependencies ready

- ✅ Backend API fully implemented
- ✅ MongoDB connected and tested
- ✅ JWT authentication working
- ✅ Frontend build process functional
- ✅ Axios installed and configured

---

## Success Metrics

After Phase 3 completion:

✓ **0 mock data** in production UI  
✓ **100% API-driven** user journeys  
✓ **40/40 backend tests** passing  
✓ **Production build** successful  
✓ **E2E flows** verified manually  
✓ **Data persistence** confirmed (MongoDB)  
✓ **Real-time** features (Socket.io chat) working  
✓ **Responsive design** at all breakpoints  
✓ **Error handling** for all API failures  

---

## Next Phase: Phase 4 (Stripe Payments)

After Phase 3 is complete, Phase 4 will add:
- Stripe integration for payment processing
- Transaction model and history
- Refund handling
- Invoice generation

---

**Last Updated**: November 14, 2026  
**Created By**: Kiro Agent  
**Status**: Phase 3A Complete, Ready for Phase 3B
