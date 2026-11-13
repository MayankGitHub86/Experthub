# ExpertHub Platform - Production Roadmap

**Version:** 1.0  
**Last Updated:** January 2025  
**Target Completion:** Q3 2025 (8 months)

---

## Executive Overview

This roadmap transforms ExpertHub from a high-fidelity prototype into a production-ready SaaS marketplace platform. Development is organized into **6 phases** over **24-34 weeks**, prioritizing security, core marketplace functionality, and payment processing before advanced features.

**Key Principles:**
1. **Security First** - No shortcuts on authentication, authorization, or data protection
2. **Incremental Replacement** - Replace mock data systematically, preserve working UI
3. **Test Everything** - Automated tests prevent regressions
4. **Ship Iteratively** - Deploy to staging after each phase
5. **Document Continuously** - Keep docs updated with implementation

---

## Phase 1: Foundation & Security (Weeks 1-6)

**Objective:** Establish production-ready infrastructure, database, authentication, and API security.

**Status:** 🟡 In Progress

### 1.1 Database Setup (Week 1)

**Tasks:**
- [ ] Install MongoDB driver (`mongoose`)
- [ ] Create database connection module with retry logic
- [ ] Design MongoDB schemas for all collections
- [ ] Set up database migrations framework
- [ ] Create seed data scripts for development
- [ ] Configure MongoDB Atlas for staging/production
- [ ] Set up automated backups
- [ ] Test connection pooling and failover

**Deliverables:**
- `backend/src/database/connection.js`
- `backend/src/database/models/` (User, Expert, Booking, etc.)
- `backend/src/database/migrations/`
- `backend/src/database/seeds/`

**Acceptance Criteria:**
- ✓ Database connects successfully on server start
- ✓ All models have validation schemas
- ✓ Migrations run successfully
- ✓ Seed data populates test database
- ✓ Connection handles network failures gracefully

---

### 1.2 Authentication System (Weeks 2-3)

**Tasks:**
- [ ] Install dependencies (`bcrypt`, `jsonwebtoken`, `joi`)
- [ ] Implement password hashing with bcrypt (cost factor: 12)
- [ ] Create JWT access tokens (15min expiry) and refresh tokens (7 days)
- [ ] Build registration endpoint with email validation
- [ ] Build login endpoint with rate limiting (5 attempts/15min)
- [ ] Implement email verification flow
- [ ] Add password reset functionality
- [ ] Create authentication middleware
- [ ] Implement session management
- [ ] Add OAuth2 (Google) integration
- [ ] Write unit tests for all auth flows

**Deliverables:**
- `backend/src/modules/auth/` (controllers, services, routes)
- `backend/src/middleware/authenticate.js`
- `backend/tests/auth.test.js`
- Email templates (verification, password reset)

**API Endpoints:**
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token
POST /api/v1/auth/verify-email
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/google (OAuth initiate)
GET  /api/v1/auth/google/callback
```

**Acceptance Criteria:**
- ✓ Users can register with email/password
- ✓ Passwords are hashed, never stored plain
- ✓ JWT tokens are generated and validated
- ✓ Email verification emails are sent
- ✓ Password reset flow works end-to-end
- ✓ Google OAuth login works
- ✓ All tests pass (>90% coverage)

---

### 1.3 Authorization & RBAC (Week 3)

**Tasks:**
- [ ] Define role permissions matrix
- [ ] Implement authorization middleware
- [ ] Add resource-level permission checks
- [ ] Protect all existing API routes
- [ ] Create admin role management endpoints
- [ ] Add audit logging for sensitive actions
- [ ] Write authorization tests

**Deliverables:**
- `backend/src/middleware/authorize.js`
- `backend/src/config/permissions.js`
- `backend/src/modules/admin/roles.js`
- Permission documentation

**Roles & Permissions:**

| Role | Permissions |
|------|-------------|
| **Admin** | Full platform access, user management, expert approval, financial reports, dispute resolution |
| **Expert** | Manage own profile/services, view own bookings/earnings, access own chat rooms, manage availability |
| **Client** | Browse marketplace, book consultations, access own bookings, rate experts, manage profile |
| **Support** | View assigned tickets, access relevant booking details (read-only), no financial modifications |

**Acceptance Criteria:**
- ✓ Every API endpoint has auth middleware
- ✓ Users can only access their own resources
- ✓ Admin can access admin-only routes
- ✓ Unauthorized access returns 403 Forbidden
- ✓ IDOR vulnerabilities are eliminated

---

### 1.4 API Security (Week 4)

**Tasks:**
- [ ] Add input validation with Joi to all routes
- [ ] Implement rate limiting (express-rate-limit + Redis)
- [ ] Add request sanitization (prevent XSS, SQL injection)
- [ ] Configure CORS properly (whitelist origins)
- [ ] Add security headers (helmet.js)
- [ ] Implement CSRF protection for state-changing operations
- [ ] Add request ID tracking for debugging
- [ ] Set up API logging (winston/pino)
- [ ] Create security audit endpoints
- [ ] Write security tests

**Deliverables:**
- `backend/src/middleware/validation.js`
- `backend/src/middleware/rate-limit.js`
- `backend/src/middleware/security.js`
- `backend/src/utils/logger.js`

**Security Measures:**
```javascript
// Rate Limiting
- Login: 5 attempts / 15 minutes
- Registration: 3 attempts / hour
- API: 100 requests / 15 minutes per user
- Chat: 30 messages / minute

// Input Validation
- All request bodies validated with Joi schemas
- Max payload size: 10MB (100MB for file uploads)
- SQL injection protection via parameterized queries
- XSS prevention via input sanitization

// Headers
- helmet() for security headers
- CORS restricted to known domains
- HTTP Strict Transport Security (HSTS)
```

**Acceptance Criteria:**
- ✓ All endpoints validate input
- ✓ Rate limiting prevents abuse
- ✓ Security headers are set
- ✓ CORS only allows whitelisted origins
- ✓ Logs capture all requests
- ✓ Security scan passes (npm audit, Snyk)

---

### 1.5 Error Handling & Logging (Week 5)

**Tasks:**
- [ ] Create centralized error handling middleware
- [ ] Define error classes (ValidationError, AuthError, etc.)
- [ ] Implement structured logging
- [ ] Set up log rotation and retention
- [ ] Integrate Sentry for error tracking
- [ ] Add health check endpoints
- [ ] Create API status page
- [ ] Write error handling tests

**Deliverables:**
- `backend/src/middleware/error-handler.js`
- `backend/src/utils/errors.js`
- `backend/src/utils/logger.js`
- Sentry integration

**Error Response Format:**
```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "email": "Invalid email format",
    "password": "Must be at least 8 characters"
  },
  "requestId": "req_abc123",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Acceptance Criteria:**
- ✓ All errors return consistent format
- ✓ 500 errors are logged to Sentry
- ✓ Logs include request ID for tracing
- ✓ Health check endpoint returns service status
- ✓ Sensitive data not exposed in errors

---

### 1.6 Environment Configuration (Week 6)

**Tasks:**
- [ ] Create environment files (.env.development, .env.staging, .env.production)
- [ ] Set up secrets management (dotenv-vault / AWS Secrets Manager)
- [ ] Configure different database URLs per environment
- [ ] Set up feature flags
- [ ] Create deployment scripts
- [ ] Document all environment variables
- [ ] Add environment validation on startup

**Deliverables:**
- `.env.example` (updated)
- `backend/src/config/environment.js`
- `docs/ENVIRONMENT_VARIABLES.md`
- Deployment scripts

**Environment Variables:**
```bash
# Server
NODE_ENV=production
PORT=3001
BASE_URL=https://api.experthub.com

# Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# Authentication
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=...
SMTP_PASSWORD=...
FROM_EMAIL=noreply@experthub.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Monitoring
SENTRY_DSN=...
```

**Acceptance Criteria:**
- ✓ App fails to start if required vars missing
- ✓ Different configs for dev/staging/prod
- ✓ Secrets not committed to git
- ✓ All variables documented

---

**Phase 1 Completion Checklist:**
- [ ] Database connected and models defined
- [ ] Authentication system working (JWT + OAuth)
- [ ] All API endpoints protected with auth
- [ ] Authorization middleware enforces permissions
- [ ] Input validation on all routes
- [ ] Rate limiting active
- [ ] Error handling standardized
- [ ] Logging and monitoring configured
- [ ] All tests passing (>85% coverage)
- [ ] Security audit completed
- [ ] Documentation updated

**Phase 1 Deliverable:** Secure API foundation ready for marketplace features.

---

## Phase 2: Core Marketplace (Weeks 7-14)

**Objective:** Build expert onboarding, marketplace search, booking engine, and availability management.

### 2.1 Expert Registration & Onboarding (Weeks 7-8)

**Tasks:**
- [ ] Create expert profile model
- [ ] Build expert registration flow
- [ ] Implement multi-step profile completion
- [ ] Add profile image upload (S3/Cloudinary)
- [ ] Create service package management
- [ ] Add skill/specialty tagging
- [ ] Build portfolio document upload
- [ ] Implement profile preview
- [ ] Create expert dashboard
- [ ] Write expert onboarding tests

**API Endpoints:**
```
POST   /api/v1/experts/profile
PUT    /api/v1/experts/profile
GET    /api/v1/experts/:id
POST   /api/v1/experts/services
PUT    /api/v1/experts/services/:id
DELETE /api/v1/experts/services/:id
POST   /api/v1/experts/documents
```

**Acceptance Criteria:**
- ✓ Experts can complete profile in steps
- ✓ Images uploaded to cloud storage
- ✓ Services have validation (min/max price, duration)
- ✓ Profile preview matches public view
- ✓ Incomplete profiles cannot go live

---

### 2.2 Expert Verification System (Week 9)

**Tasks:**
- [ ] Create admin review dashboard
- [ ] Build expert approval workflow
- [ ] Add document verification UI
- [ ] Implement approval/rejection emails
- [ ] Create verification badge system
- [ ] Add expert status state machine
- [ ] Build resubmission flow
- [ ] Write verification tests

**Expert Status Flow:**
```
Draft → Submitted → Under Review → Approved / Rejected → Active / Suspended
```

**Acceptance Criteria:**
- ✓ Admin can review pending expert profiles
- ✓ Experts notified of approval/rejection
- ✓ Only approved experts appear in marketplace
- ✓ Verification badge shows on approved profiles

---

### 2.3 Marketplace Search & Filters (Weeks 10-11)

**Tasks:**
- [ ] Replace mock expert data with database queries
- [ ] Implement search endpoint (text search on name, skills, bio)
- [ ] Add category filtering
- [ ] Add skill/specialty filters
- [ ] Add price range filtering
- [ ] Add rating filtering
- [ ] Add availability filtering
- [ ] Implement sorting (relevance, rating, price, reviews)
- [ ] Add pagination
- [ ] Create expert detail endpoint
- [ ] Add search analytics tracking
- [ ] Write search tests

**API Endpoints:**
```
GET /api/v1/experts?search=AI&category=Tech&minRate=100&maxRate=300&page=1
GET /api/v1/experts/:id
GET /api/v1/categories
```

**Search Features:**
- Full-text search on name, headline, bio, skills
- Fuzzy matching for typos
- Filter by category, skills, price, rating, availability
- Sort by relevance, rating, price, reviews, response time
- Pagination (20 per page)
- Total count

**Acceptance Criteria:**
- ✓ Search returns relevant experts
- ✓ Filters work correctly
- ✓ Pagination works
- ✓ Expert profiles load from database
- ✓ Frontend ExpertGrid uses real API
- ✓ Search performance < 300ms

---

### 2.4 Availability Management (Week 11)

**Tasks:**
- [ ] Create availability model
- [ ] Build weekly schedule editor
- [ ] Add exception/override dates
- [ ] Implement time zone handling
- [ ] Create availability checking service
- [ ] Add buffer time between bookings
- [ ] Build minimum notice enforcement
- [ ] Add max advance booking limits
- [ ] Write availability tests

**API Endpoints:**
```
GET  /api/v1/experts/:id/availability
POST /api/v1/experts/availability/schedule
POST /api/v1/experts/availability/exceptions
GET  /api/v1/experts/:id/slots?date=2025-01-20&duration=60
```

**Features:**
- Weekly recurring schedule
- Custom date exceptions (vacations, holidays)
- Time zone conversion
- Buffer time (15 min default)
- Minimum notice (2 hours default)
- Max advance booking (90 days default)

**Acceptance Criteria:**
- ✓ Experts can set weekly availability
- ✓ Exceptions override recurring schedule
- ✓ Available slots calculated correctly
- ✓ Time zones handled properly
- ✓ Buffers prevent back-to-back bookings

---

### 2.5 Booking Engine (Weeks 12-14)

**Tasks:**
- [ ] Create booking model with state machine
- [ ] Implement booking creation with conflict checking
- [ ] Add temporary slot holding (10 min)
- [ ] Create booking state transitions
- [ ] Build booking detail endpoint
- [ ] Add booking list for clients/experts
- [ ] Implement booking cancellation
- [ ] Add rescheduling flow
- [ ] Create no-show handling
- [ ] Add booking reminder scheduling
- [ ] Write booking engine tests (critical!)

**Booking State Machine:**
```
pending_payment → (payment) → confirmed → (time arrives) → in_progress → completed
                                     ↓
                              (cancel) → cancelled
                                     ↓
                              (refund) → refunded
                                     ↓
                            (no-show) → no_show
```

**Critical: Prevent Double Booking**
```javascript
// Use database transaction or optimistic locking
await Booking.create({
  expertId,
  scheduledTime,
  duration,
  status: 'pending_payment'
}, { 
  unique: { expertId, scheduledTime },  // Database constraint
  timeout: 10000  // Release if payment not completed
});
```

**API Endpoints:**
```
POST   /api/v1/bookings
GET    /api/v1/bookings/:id
GET    /api/v1/bookings (list for current user)
POST   /api/v1/bookings/:id/cancel
POST   /api/v1/bookings/:id/reschedule
PATCH  /api/v1/bookings/:id/complete
```

**Acceptance Criteria:**
- ✓ Clients can create bookings
- ✓ Double booking is impossible (tested with concurrent requests)
- ✓ Slots are held for 10 minutes
- ✓ Expired holds are released automatically
- ✓ Booking states transition correctly
- ✓ Cancellation policies enforced
- ✓ Rescheduling works
- ✓ Reminders sent 24h and 1h before
- ✓ All tests pass including race conditions

---

**Phase 2 Completion Checklist:**
- [ ] Expert registration flow complete
- [ ] Admin can approve/reject experts
- [ ] Marketplace search works with real data
- [ ] Filters and sorting functional
- [ ] Availability system working
- [ ] Booking engine prevents conflicts
- [ ] Booking state machine correct
- [ ] All tests passing (>90% coverage)
- [ ] Frontend connected to real APIs
- [ ] Performance acceptable (<500ms API response)

**Phase 2 Deliverable:** Functional marketplace with real expert data and working booking system.

---

## Phase 3: Payment Processing (Weeks 15-20)

**Objective:** Integrate Stripe Connect for payments, commission processing, and expert payouts.

### 3.1 Stripe Connect Setup (Weeks 15-16)

**Tasks:**
- [ ] Install Stripe SDK (`stripe`)
- [ ] Create Stripe platform account
- [ ] Configure webhooks endpoint
- [ ] Build Stripe Connect Express onboarding flow
- [ ] Create expert Stripe account linking
- [ ] Implement account status checking
- [ ] Add account update handling
- [ ] Build account details dashboard
- [ ] Write Stripe integration tests (use test mode)

**Deliverables:**
- `backend/src/integrations/stripe/`
- Expert onboarding UI for Stripe Connect
- Webhook handler

**API Endpoints:**
```
POST /api/v1/payments/stripe/connect/onboard
GET  /api/v1/payments/stripe/connect/status
POST /api/v1/payments/stripe/connect/refresh
POST /api/v1/webhooks/stripe (webhook receiver)
```

**Acceptance Criteria:**
- ✓ Experts can complete Stripe onboarding
- ✓ Account status synced correctly
- ✓ Webhook signature verification works
- ✓ Test mode integration passes

---

### 3.2 Payment Processing (Weeks 17-18)

**Tasks:**
- [ ] Replace mock payment intent with real Stripe API
- [ ] Implement payment intent creation with commission
- [ ] Add payment confirmation handling
- [ ] Create payment webhook processing
- [ ] Implement idempotency for webhooks
- [ ] Add payment failure handling
- [ ] Create payment retry logic
- [ ] Build transaction ledger
- [ ] Add payment receipts
- [ ] Write payment tests

**Payment Flow:**
```
1. Client clicks "Book Session"
2. Backend creates Booking (status: pending_payment)
3. Backend creates Stripe PaymentIntent with application_fee
4. Client completes payment in frontend
5. Stripe webhook: payment_intent.succeeded
6. Backend verifies webhook signature
7. Backend updates Booking (status: confirmed)
8. Backend creates Transaction record
9. Backend sends confirmation emails
10. Client receives booking details
```

**Commission Calculation:**
```javascript
const grossAmount = 250.00;  // $250 session
const platformFeePercent = 15;  // 15% configurable
const stripeFeePercent = 2.9;  // 2.9% + $0.30
const stripeFeeFixed = 0.30;

const platformFee = grossAmount * (platformFeePercent / 100);  // $37.50
const stripeFee = (grossAmount * (stripeFeePercent / 100)) + stripeFeeFixed;  // $7.55
const expertPayout = grossAmount - platformFee - stripeFee;  // $204.95
```

**API Endpoints:**
```
POST /api/v1/payments/intents (create payment intent)
GET  /api/v1/payments/:id/status (check payment status)
POST /api/v1/webhooks/stripe (handle Stripe events)
GET  /api/v1/transactions (list user transactions)
GET  /api/v1/transactions/:id (transaction details)
```

**Acceptance Criteria:**
- ✓ Real Stripe payments processed
- ✓ Commission calculated correctly
- ✓ Expert receives 85% payout
- ✓ Webhooks verified and idempotent
- ✓ Payment failures handled gracefully
- ✓ Transaction ledger accurate
- ✓ Receipts generated
- ✓ All tests pass

---

### 3.3 Refund Management (Week 19)

**Tasks:**
- [ ] Implement refund request flow
- [ ] Create refund processing with Stripe
- [ ] Add partial refund support
- [ ] Build refund approval workflow (admin)
- [ ] Handle commission refund (platform + expert)
- [ ] Update booking status on refund
- [ ] Send refund notification emails
- [ ] Write refund tests

**Refund Scenarios:**
```
1. Client cancels >24h before: Full refund
2. Client cancels <24h before: 50% refund
3. Expert cancels: Full refund + credit
4. Technical issue: Full refund
5. Dispute resolution: Admin decision
```

**API Endpoints:**
```
POST /api/v1/bookings/:id/refund
GET  /api/v1/refunds
POST /api/v1/admin/refunds/:id/approve
POST /api/v1/admin/refunds/:id/reject
```

**Acceptance Criteria:**
- ✓ Refunds process through Stripe
- ✓ Cancellation policies enforced
- ✓ Admin can approve/reject refund requests
- ✓ Both client and expert notified
- ✓ Refund ledger accurate

---

### 3.4 Payout Management (Week 20)

**Tasks:**
- [ ] Build expert earnings dashboard
- [ ] Create payout calculation service
- [ ] Implement manual payout trigger (admin)
- [ ] Add automated payout scheduling
- [ ] Build payout history tracking
- [ ] Handle payout failures
- [ ] Create payout reports
- [ ] Add 1099 data export (US experts)
- [ ] Write payout tests

**Payout Logic:**
```
Earnings become available for payout 7 days after session completion
(to allow for refund window)

Weekly payout schedule:
- Minimum: $50
- Day: Every Friday
- Method: Stripe automatic payout to connected account
```

**API Endpoints:**
```
GET  /api/v1/experts/earnings (current expert)
GET  /api/v1/experts/payouts (payout history)
POST /api/v1/admin/payouts/process (manual trigger)
GET  /api/v1/admin/payouts/reports (download)
```

**Acceptance Criteria:**
- ✓ Expert sees accurate earnings
- ✓ Payouts calculated correctly
- ✓ Automated payouts run weekly
- ✓ Failed payouts retry and notify
- ✓ Payout history accurate
- ✓ Reports generated correctly

---

**Phase 3 Completion Checklist:**
- [ ] Stripe Connect onboarding works
- [ ] Real payments processed
- [ ] Commission calculated and split correctly
- [ ] Webhooks verified and processed
- [ ] Refunds work through Stripe
- [ ] Expert payouts automated
- [ ] Transaction ledger complete
- [ ] All payment tests passing
- [ ] Financial reports accurate
- [ ] Security audit of payment flow passed

**Phase 3 Deliverable:** Fully functional payment system with real money processing.

---

## Phase 4: Communication & Notifications (Weeks 21-24)

**Objective:** Persistent chat storage, real-time improvements, file sharing, notifications, and calendar integration.

### 4.1 Persistent Chat Storage (Week 21)

**Tasks:**
- [ ] Create Message and Conversation models
- [ ] Migrate Socket.io messages to MongoDB
- [ ] Implement message pagination
- [ ] Add conversation search
- [ ] Build conversation list endpoint
- [ ] Add unread message counts
- [ ] Implement read receipts
- [ ] Add message deletion (soft delete)
- [ ] Write chat persistence tests

**API Endpoints:**
```
GET    /api/v1/conversations (list for current user)
GET    /api/v1/conversations/:id/messages?page=1
POST   /api/v1/conversations/:id/messages
DELETE /api/v1/messages/:id (soft delete)
PATCH  /api/v1/conversations/:id/read (mark all read)
```

**Acceptance Criteria:**
- ✓ All messages saved to database
- ✓ Message history persists across server restarts
- ✓ Pagination works for long conversations
- ✓ Unread counts accurate
- ✓ Read receipts working

---

### 4.2 File Sharing (Week 22)

**Tasks:**
- [ ] Set up cloud storage (AWS S3 / Cloudinary)
- [ ] Implement file upload endpoint
- [ ] Add file type validation (images, PDFs, docs)
- [ ] Add file size limits (10MB per file)
- [ ] Generate signed URLs for secure access
- [ ] Add malware scanning (ClamAV / VirusTotal)
- [ ] Build file preview in chat
- [ ] Add file download tracking
- [ ] Write file upload tests

**Supported File Types:**
```
Images: jpg, png, gif, webp (max 5MB)
Documents: pdf, doc, docx, xls, xlsx (max 10MB)
Code: txt, json, js, py, java (max 2MB)
```

**API Endpoints:**
```
POST /api/v1/files/upload
GET  /api/v1/files/:id/download (generates signed URL)
```

**Acceptance Criteria:**
- ✓ Files uploaded to cloud storage
- ✓ File size and type validation works
- ✓ Malware scanning passes before storage
- ✓ Files accessible only to conversation participants
- ✓ Signed URLs expire after 1 hour

---

### 4.3 Email Notifications (Week 22)

**Tasks:**
- [ ] Set up email service (SendGrid / AWS SES)
- [ ] Create email templates (HTML + plain text)
- [ ] Build email sending service
- [ ] Add email queue (Bull + Redis)
- [ ] Implement notification preferences
- [ ] Add unsubscribe functionality
- [ ] Create email analytics tracking
- [ ] Write email tests (use mock service)

**Email Templates:**
1. Welcome email
2. Email verification
3. Password reset
4. Booking confirmed
5. Booking reminder (24h, 1h before)
6. Booking cancelled
7. Expert approval
8. New message notification
9. Payout processed
10. Review request

**API Endpoints:**
```
GET   /api/v1/users/notifications/preferences
PATCH /api/v1/users/notifications/preferences
POST  /api/v1/users/notifications/unsubscribe/:token
```

**Acceptance Criteria:**
- ✓ Emails sent reliably
- ✓ Templates render correctly
- ✓ Email queue processes asynchronously
- ✓ Users can manage notification preferences
- ✓ Unsubscribe links work
- ✓ Failed emails retry

---

### 4.4 Calendar Integration (Week 23-24)

**Tasks:**
- [ ] Set up Google Calendar OAuth
- [ ] Implement calendar connection flow
- [ ] Add event creation on booking confirmation
- [ ] Add event updates on rescheduling
- [ ] Add event deletion on cancellation
- [ ] Build calendar sync status UI
- [ ] Handle calendar API failures gracefully
- [ ] Add calendar disconnect
- [ ] Generate .ics files for non-Google users
- [ ] Write calendar integration tests

**API Endpoints:**
```
POST   /api/v1/calendar/google/connect
GET    /api/v1/calendar/status
POST   /api/v1/calendar/disconnect
GET    /api/v1/bookings/:id/ics (download calendar invite)
```

**Acceptance Criteria:**
- ✓ Users can connect Google Calendar
- ✓ Bookings automatically added to calendar
- ✓ Updates and cancellations sync
- ✓ .ics files downloadable
- ✓ Calendar errors don't break booking flow

---

**Phase 4 Completion Checklist:**
- [ ] Chat messages persist in database
- [ ] File sharing works securely
- [ ] Email notifications sent reliably
- [ ] Calendar integration functional
- [ ] All communication tests passing
- [ ] User preferences respected
- [ ] Performance acceptable

**Phase 4 Deliverable:** Complete communication system with persistence and external integrations.

---

## Phase 5: Intelligence & Reviews (Weeks 25-28)

**Objective:** Real AI matching, review system, and recommendation engine.

### 5.1 OpenAI Integration (Weeks 25-26)

**Tasks:**
- [ ] Install OpenAI SDK
- [ ] Implement GPT-4 query understanding
- [ ] Create expert profile embeddings
- [ ] Build vector search (MongoDB Atlas Vector Search or Pinecone)
- [ ] Implement semantic matching algorithm
- [ ] Add explanation generation
- [ ] Create matching quality tracking
- [ ] Optimize costs (cache common queries)
- [ ] Write AI matching tests

**Matching Flow:**
```
1. Client submits query: "Need help scaling Kubernetes infrastructure"
2. GPT-4 extracts: skills=[kubernetes, devops, cloud], budget=null, urgency=high
3. Generate query embedding
4. Vector search expert embeddings
5. Rank by: semantic similarity, availability, rating, price
6. Generate explanation for each match
7. Return top 5 experts
```

**API Endpoints:**
```
POST /api/v1/ai/match
GET  /api/v1/ai/match/history
POST /api/v1/ai/feedback (track success)
```

**Acceptance Criteria:**
- ✓ AI matching uses real OpenAI API
- ✓ Semantic search returns relevant experts
- ✓ Explanations are accurate
- ✓ Fallback works if OpenAI unavailable
- ✓ Costs monitored and optimized

---

### 5.2 Review System (Week 27)

**Tasks:**
- [ ] Create Review model
- [ ] Build review submission endpoint
- [ ] Add review eligibility check (completed bookings only)
- [ ] Implement review moderation
- [ ] Update expert ratings automatically
- [ ] Add expert response to reviews
- [ ] Build review report functionality
- [ ] Display reviews on expert profiles
- [ ] Write review tests

**Review Rules:**
- Only clients with completed bookings can review
- One review per booking
- Reviews editable for 48 hours
- Experts can respond once
- Admin can moderate/remove abusive reviews
- Ratings update expert aggregate score

**API Endpoints:**
```
POST  /api/v1/bookings/:id/review
PUT   /api/v1/reviews/:id
POST  /api/v1/reviews/:id/report
POST  /api/v1/reviews/:id/respond (expert)
GET   /api/v1/experts/:id/reviews
```

**Acceptance Criteria:**
- ✓ Reviews tied to completed bookings
- ✓ Duplicate reviews prevented
- ✓ Expert ratings update automatically
- ✓ Admin can moderate reviews
- ✓ Reviews display on profiles

---

### 5.3 Recommendation Engine (Week 28)

**Tasks:**
- [ ] Build collaborative filtering
- [ ] Implement "Experts you may like"
- [ ] Add "Recently viewed"
- [ ] Create "Trending experts"
- [ ] Add "Similar experts"
- [ ] Implement personalized homepage
- [ ] Track recommendation performance
- [ ] Write recommendation tests

**Recommendation Strategies:**
1. **Collaborative:** Users who booked X also booked Y
2. **Content-based:** Similar skills/specialties
3. **Popularity:** Most booked this week
4. **Trending:** Rapidly increasing bookings
5. **Personalized:** Based on user's past bookings

**API Endpoints:**
```
GET /api/v1/recommendations/for-you
GET /api/v1/recommendations/trending
GET /api/v1/recommendations/similar/:expertId
```

**Acceptance Criteria:**
- ✓ Recommendations relevant to user
- ✓ Trending calculation accurate
- ✓ Performance acceptable (<200ms)

---

**Phase 5 Completion Checklist:**
- [ ] OpenAI integration working
- [ ] AI matching provides accurate results
- [ ] Review system functional
- [ ] Expert ratings updated correctly
- [ ] Recommendations personalized
- [ ] All AI/review tests passing

**Phase 5 Deliverable:** Intelligent platform with AI matching and social proof.

---

## Phase 6: Polish & Production (Weeks 29-34)

**Objective:** Admin tools, analytics, performance optimization, security hardening, comprehensive testing, and production deployment.

### 6.1 Admin Dashboard (Weeks 29-30)

**Tasks:**
- [ ] Build real-time metrics dashboard
- [ ] Replace hardcoded dashboard data with database queries
- [ ] Add user management
- [ ] Build expert approval queue
- [ ] Create booking management
- [ ] Add financial reports
- [ ] Build dispute resolution UI
- [ ] Add platform settings management
- [ ] Create audit log viewer
- [ ] Write admin dashboard tests

**Admin Features:**
- User search and management
- Expert approval/rejection
- Booking management
- Refund approvals
- Review moderation
- Financial reports (revenue, payouts, commission)
- Platform settings (commission %, policies)
- Audit logs

**Acceptance Criteria:**
- ✓ Dashboard shows real data
- ✓ All admin functions working
- ✓ Reports accurate
- ✓ Audit logs complete

---

### 6.2 Analytics & Reporting (Week 31)

**Tasks:**
- [ ] Build analytics tracking
- [ ] Create conversion funnel reports
- [ ] Add retention analysis
- [ ] Build expert performance reports
- [ ] Add financial analytics
- [ ] Create CSV/PDF exports
- [ ] Set up analytics dashboards (Metabase / Grafana)
- [ ] Write analytics tests

**Reports:**
1. Revenue by date/month
2. Booking conversion funnel
3. Expert performance
4. Client retention
5. Top categories
6. Refund analysis
7. Platform growth

**Acceptance Criteria:**
- ✓ Analytics accurate
- ✓ Reports exportable
- ✓ Performance acceptable

---

### 6.3 Performance Optimization (Week 32)

**Tasks:**
- [ ] Add Redis caching for expert profiles
- [ ] Optimize database queries with indexes
- [ ] Implement database query optimization
- [ ] Add CDN for static assets
- [ ] Enable gzip compression
- [ ] Optimize images
- [ ] Add React lazy loading
- [ ] Implement code splitting
- [ ] Run load tests (k6)
- [ ] Optimize bundle size

**Performance Targets:**
- API response time: <300ms (95th percentile)
- Page load time: <2s
- Time to interactive: <3s
- Database query time: <100ms
- Bundle size: <500KB

**Acceptance Criteria:**
- ✓ Load tests pass (1000 concurrent users)
- ✓ Performance targets met
- ✓ No memory leaks

---

### 6.4 Security Hardening (Week 33)

**Tasks:**
- [ ] Run security audit (npm audit, Snyk)
- [ ] Fix all critical vulnerabilities
- [ ] Implement CSP headers
- [ ] Add rate limiting to all endpoints
- [ ] Enable database encryption at rest
- [ ] Set up SSL/TLS certificates
- [ ] Implement backup & disaster recovery
- [ ] Add intrusion detection
- [ ] Run penetration tests
- [ ] Create security incident response plan

**Security Checklist:**
- [ ] OWASP Top 10 mitigated
- [ ] All dependencies up-to-date
- [ ] No secrets in code
- [ ] Database backups automated
- [ ] SSL certificates configured
- [ ] Rate limiting active
- [ ] WAF configured (Cloudflare)
- [ ] Security headers set

**Acceptance Criteria:**
- ✓ Security audit passes
- ✓ Penetration test passes
- ✓ Backups restorable

---

### 6.5 Comprehensive Testing (Week 33)

**Tasks:**
- [ ] Achieve >85% unit test coverage
- [ ] Write integration tests for all flows
- [ ] Create E2E tests for critical paths
- [ ] Add visual regression tests
- [ ] Perform accessibility testing
- [ ] Run cross-browser testing
- [ ] Test mobile responsiveness
- [ ] Perform UAT with test users

**Test Coverage:**
- Unit: >85%
- Integration: >80%
- E2E: Critical paths

**Acceptance Criteria:**
- ✓ All tests passing
- ✓ Test coverage meets targets
- ✓ UAT signed off

---

### 6.6 Production Deployment (Week 34)

**Tasks:**
- [ ] Set up production infrastructure (AWS/GCP/DigitalOcean)
- [ ] Configure CI/CD pipeline
- [ ] Set up monitoring (Datadog/New Relic)
- [ ] Configure error tracking (Sentry)
- [ ] Set up log aggregation (ELK/Loki)
- [ ] Configure alerts
- [ ] Create runbooks
- [ ] Perform final security review
- [ ] Deploy to production
- [ ] Monitor for 48 hours

**Infrastructure:**
- Web servers: Load-balanced Node.js instances
- Database: MongoDB Atlas (replica set)
- Cache: Redis cluster
- Storage: AWS S3 / Cloudinary
- CDN: Cloudflare
- Email: SendGrid

**Deployment Checklist:**
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database backed up
- [ ] Monitoring configured
- [ ] Alerts tested
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] Rollback plan documented

**Acceptance Criteria:**
- ✓ Production deployment successful
- ✓ All services healthy
- ✓ Monitoring active
- ✓ No critical errors
- ✓ Performance acceptable

---

**Phase 6 Completion Checklist:**
- [ ] Admin dashboard functional
- [ ] Analytics accurate
- [ ] Performance optimized
- [ ] Security hardened
- [ ] All tests passing
- [ ] Production deployed
- [ ] Monitoring active
- [ ] Documentation complete

**Phase 6 Deliverable:** Production-ready ExpertHub platform.

---

## Definition of Done

The project is production-ready when:

### Functional Requirements
- [ ] Clients can register, browse experts, and book consultations
- [ ] Experts can register, complete onboarding, and receive bookings
- [ ] Payments process through Stripe Connect
- [ ] Commissions calculated and split correctly
- [ ] Expert payouts automated
- [ ] Real-time chat persists messages
- [ ] File sharing works securely
- [ ] Email notifications sent reliably
- [ ] Calendar integration functional
- [ ] AI matching provides relevant recommendations
- [ ] Review system working
- [ ] Admin can manage platform

### Technical Requirements
- [ ] Database persistence (MongoDB)
- [ ] JWT authentication
- [ ] Role-based authorization
- [ ] API security (validation, rate limiting, CORS)
- [ ] Error handling and logging
- [ ] Unit test coverage >85%
- [ ] Integration tests for all flows
- [ ] E2E tests for critical paths
- [ ] Performance targets met
- [ ] Security audit passed

### Operational Requirements
- [ ] CI/CD pipeline active
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Backups automated
- [ ] Disaster recovery tested
- [ ] Documentation complete
- [ ] Runbooks created
- [ ] Production deployed

---

## Risk Management

### High Risks

1. **Timeline Overrun** (70% probability)
   - **Mitigation:** Build MVP features first, defer nice-to-haves
   - **Contingency:** Extend timeline or reduce scope

2. **Stripe Integration Complexity** (50% probability)
   - **Mitigation:** Start Stripe early, use thorough testing
   - **Contingency:** Hire Stripe consultant or use simpler payment provider

3. **Database Migration Issues** (40% probability)
   - **Mitigation:** Test migrations thoroughly, have rollback plan
   - **Contingency:** Use feature flags to gradually migrate data

4. **Performance Issues** (30% probability)
   - **Mitigation:** Load test early, optimize continuously
   - **Contingency:** Add caching, optimize queries, scale infrastructure

### Medium Risks

5. **OpenAI Cost Overrun** (40% probability)
   - **Mitigation:** Cache results, implement usage limits
   - **Contingency:** Use simpler matching algorithm as fallback

6. **Security Vulnerabilities** (30% probability)
   - **Mitigation:** Security-first development, regular audits
   - **Contingency:** Hire security consultant, delay launch if needed

---

## Success Metrics

### Development Metrics
- [ ] All phases completed on time (±2 weeks acceptable)
- [ ] Test coverage >85%
- [ ] Zero critical bugs in production
- [ ] API response time <300ms
- [ ] Page load time <2s

### Business Metrics (Post-Launch)
- Monthly bookings >100 within 3 months
- Revenue >$10k/month within 6 months
- Client retention >60%
- Expert satisfaction >4.5/5
- Platform uptime >99.9%

---

**Roadmap Status:** APPROVED  
**Next Phase:** Phase 1 - Foundation & Security  
**Start Date:** January 2025  
**Target Completion:** September 2025  

---

*Roadmap Version 1.0*  
*Last Updated: January 2025*  
*Owner: Development Team*
