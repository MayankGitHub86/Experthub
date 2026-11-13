# ExpertHub Platform - Production Architecture

**Version:** 2.0  
**Last Updated:** January 2025  
**Status:** Production Architecture Design

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Real-time Communication](#7-real-time-communication)
8. [External Integrations](#8-external-integrations)
9. [Security Architecture](#9-security-architecture)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Scalability Strategy](#11-scalability-strategy)
12. [Data Flow Diagrams](#12-data-flow-diagrams)

---

## 1. System Overview

### 1.1 Product Description

ExpertHub is a premium **on-demand expert consultation marketplace** that connects clients with verified industry experts for professional consultations. The platform provides:

- **Marketplace:** Browse and discover experts by skills, categories, and AI recommendations
- **Booking:** Schedule consultations with integrated availability management
- **Payments:** Secure payments via Stripe Connect with automated commission splits
- **Communication:** Real-time chat and video consultations
- **Intelligence:** AI-powered expert matching using OpenAI GPT-4

### 1.2 Technical Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19.x | UI framework |
| **Build Tool** | Vite | 8.x | Fast development and production builds |
| **Backend** | Node.js | 20.x LTS | JavaScript runtime |
| **Web Framework** | Express | 4.x | REST API server |
| **Real-time** | Socket.io | 4.x | WebSocket communication |
| **Database** | MongoDB | 6.x | Primary data store |
| **Cache** | Redis | 7.x | Session storage, caching, queues |
| **Payment** | Stripe Connect | Latest | Payment processing |
| **AI** | OpenAI | GPT-4 | Expert matching and recommendations |
| **Email** | SendGrid / AWS SES | Latest | Transactional emails |
| **Storage** | AWS S3 / Cloudinary | Latest | File and image storage |
| **Container** | Docker | Latest | Containerization |
| **Orchestration** | Docker Compose / Kubernetes | Latest | Container orchestration |

---

## 2. Architecture Principles

### 2.1 Design Principles

1. **Security First**
   - All endpoints authenticated and authorized
   - Input validation on every request
   - Secrets never in code or logs
   - Defense in depth

2. **Modular Monolith**
   - Start with modular monolith, not microservices
   - Clear module boundaries
   - Easily extractable into microservices if needed

3. **API-First Design**
   - Frontend communicates only via REST APIs and WebSockets
   - No direct database access from frontend
   - Clear API versioning

4. **Stateless Backend**
   - Sessions stored in Redis, not memory
   - Horizontal scaling capability
   - No sticky sessions required

5. **Fail-Safe Operations**
   - Graceful degradation
   - Circuit breakers for external services
   - Comprehensive error handling

6. **Data Integrity**
   - Database transactions for critical operations
   - Idempotent webhooks
   - Audit logging

### 2.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **Availability** | 99.9% uptime | Monthly uptime percentage |
| **Performance** | <300ms API response | 95th percentile |
| **Scalability** | 10,000 concurrent users | Load test |
| **Security** | Zero critical vulnerabilities | Weekly scans |
| **Reliability** | <0.1% error rate | Error tracking |
| **Maintainability** | >85% test coverage | Automated reports |

---

## 3. High-Level Architecture

### 3.1 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ExpertHub Platform                        │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐           ┌────▼────┐           ┌───▼────┐
   │ Clients │           │ Experts │           │ Admins │
   └─────────┘           └─────────┘           └────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
           ┌──────────────────────────────────────┐
           │         React SPA Frontend           │
           │   (Landing, Marketplace, Dashboard)  │
           └──────────────────┬───────────────────┘
                              │ HTTPS / WSS
                              ▼
           ┌──────────────────────────────────────┐
           │      Express API Gateway (Node.js)   │
           │   - Authentication Middleware        │
           │   - Rate Limiting                    │
           │   - Input Validation                 │
           │   - Request Logging                  │
           └──────────────────┬───────────────────┘
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
     ┌────▼─────┐      ┌──────▼──────┐      ┌────▼────────┐
     │ Business │      │  Real-time  │      │   Redis     │
     │  Logic   │      │  Socket.io  │      │   Cache     │
     └────┬─────┘      └──────┬──────┘      └────┬────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   MongoDB Atlas   │
                    │  (Primary Store)  │
                    └───────────────────┘
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
     ┌────▼─────┐      ┌──────▼──────┐      ┌────▼────────┐
     │  Stripe  │      │   OpenAI    │      │  SendGrid   │
     │ Connect  │      │   GPT-4     │      │    Email    │
     └──────────┘      └─────────────┘      └─────────────┘
```

### 3.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Internet / CDN                             │
│                      (Static Assets)                             │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS
                    ┌────────▼──────────┐
                    │  Load Balancer    │
                    │  (Nginx / ALB)    │
                    └────────┬──────────┘
                             │
            ┌────────────────┼───────────────────┐
            │                │                   │
      ┌─────▼────┐     ┌─────▼────┐     ┌──────▼─────┐
      │  Web 1   │     │  Web 2   │     │   Web N    │
      │  Node.js │     │  Node.js │     │   Node.js  │
      │  Express │     │  Express │     │   Express  │
      └─────┬────┘     └─────┬────┘     └──────┬─────┘
            │                │                   │
            └────────────────┼───────────────────┘
                             │
            ┌────────────────┼───────────────────┐
            │                │                   │
      ┌─────▼────┐     ┌─────▼────┐     ┌──────▼─────┐
      │ MongoDB  │     │  Redis   │     │  Worker    │
      │ Replica  │     │  Cluster │     │  Queue     │
      │   Set    │     │          │     │  (Bull)    │
      └──────────┘     └──────────┘     └────────────┘
```

---

## 4. Frontend Architecture

### 4.1 Directory Structure

```
src/
├── app/
│   └── App.jsx                    # Main application component
├── assets/
│   ├── images/
│   └── icons/
├── components/
│   ├── common/                    # Reusable components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Sidebar.jsx
│   └── [feature]/                 # Feature-specific components
├── features/
│   ├── auth/                      # Authentication module
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── AuthContext.jsx
│   ├── marketplace/               # Expert marketplace
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── bookings/                  # Booking management
│   ├── chat/                      # Real-time messaging
│   ├── dashboard/                 # Analytics dashboards
│   └── admin/                     # Admin panel
├── hooks/
│   ├── useAuth.js
│   ├── useWebSocket.js
│   └── useApi.js
├── layouts/
│   ├── MainLayout.jsx
│   ├── AuthLayout.jsx
│   └── AdminLayout.jsx
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── [other pages]
├── services/
│   ├── api/
│   │   ├── client.js              # Axios/Fetch wrapper
│   │   ├── auth.js
│   │   ├── experts.js
│   │   └── bookings.js
│   └── socket/
│       └── socket.js              # Socket.io client
├── store/
│   ├── slices/                    # Redux slices or Zustand stores
│   └── store.js
├── styles/
│   ├── index.css                  # Global styles
│   ├── themes/
│   └── variables.css
├── utils/
│   ├── validators.js
│   ├── formatters.js
│   └── constants.js
├── routes/
│   └── routes.jsx                 # React Router configuration
├── main.jsx                       # Application entry point
└── vite.config.js
```

### 4.2 State Management

**Strategy:** Context API + React Query

```javascript
// Global State (Context API)
- AuthContext: User authentication state
- ThemeContext: Dark/Light mode
- NotificationContext: Toast notifications

// Server State (React Query)
- Experts data (cached, auto-refetch)
- Bookings data
- User profile
- Chat messages

// Local State (useState)
- Form inputs
- UI state (modals, dropdowns)
```

### 4.3 Routing

```javascript
// Public Routes
/                      → Landing Page
/experts               → Marketplace
/experts/:id           → Expert Profile
/login                 → Login
/signup                → Registration

// Protected Routes (Client)
/dashboard             → Client Dashboard
/bookings              → My Bookings
/bookings/:id/chat     → Consultation Chat
/messages              → All Conversations
/settings              → User Settings

// Protected Routes (Expert)
/expert/dashboard      → Expert Dashboard
/expert/profile        → Manage Profile
/expert/services       → Manage Services
/expert/availability   → Availability Calendar
/expert/earnings       → Earnings & Payouts

// Protected Routes (Admin)
/admin/dashboard       → Admin Overview
/admin/users           → User Management
/admin/experts         → Expert Approvals
/admin/bookings        → Booking Management
/admin/financials      → Financial Reports
```

### 4.4 Performance Optimization

1. **Code Splitting**
```javascript
// Route-based lazy loading
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AdminPanel = React.lazy(() => import('./pages/Admin'));
```

2. **Image Optimization**
- WebP format with fallback
- Lazy loading with Intersection Observer
- Responsive images with srcset

3. **Bundle Optimization**
- Tree shaking
- Minification
- Gzip compression

---

## 5. Backend Architecture

### 5.1 Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js            # MongoDB connection
│   │   ├── redis.js               # Redis connection
│   │   ├── environment.js         # Environment variables
│   │   └── constants.js           # Application constants
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.routes.js
│   │   │   └── auth.validation.js
│   │   ├── users/
│   │   │   ├── user.model.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   └── user.routes.js
│   │   ├── experts/
│   │   │   ├── expert.model.js
│   │   │   ├── expert.controller.js
│   │   │   ├── expert.service.js
│   │   │   ├── expert.routes.js
│   │   │   └── expert.validation.js
│   │   ├── bookings/
│   │   │   ├── booking.model.js
│   │   │   ├── booking.controller.js
│   │   │   ├── booking.service.js
│   │   │   ├── booking.routes.js
│   │   │   └── booking.state-machine.js
│   │   ├── payments/
│   │   │   ├── payment.controller.js
│   │   │   ├── payment.service.js
│   │   │   ├── payment.routes.js
│   │   │   └── stripe.integration.js
│   │   ├── chat/
│   │   │   ├── message.model.js
│   │   │   ├── conversation.model.js
│   │   │   ├── chat.controller.js
│   │   │   ├── chat.service.js
│   │   │   └── chat.routes.js
│   │   ├── notifications/
│   │   │   ├── notification.service.js
│   │   │   ├── email.service.js
│   │   │   └── templates/
│   │   ├── ai/
│   │   │   ├── matching.service.js
│   │   │   ├── embeddings.service.js
│   │   │   └── openai.integration.js
│   │   ├── reviews/
│   │   │   ├── review.model.js
│   │   │   ├── review.controller.js
│   │   │   └── review.service.js
│   │   └── admin/
│   │       ├── admin.controller.js
│   │       ├── admin.service.js
│   │       └── admin.routes.js
│   ├── middleware/
│   │   ├── authenticate.js        # JWT verification
│   │   ├── authorize.js           # Permission checking
│   │   ├── validate.js            # Input validation
│   │   ├── rate-limit.js          # Rate limiting
│   │   ├── error-handler.js       # Global error handler
│   │   └── logger.js              # Request logging
│   ├── integrations/
│   │   ├── stripe/
│   │   │   ├── connect.js
│   │   │   ├── webhooks.js
│   │   │   └── payouts.js
│   │   ├── openai/
│   │   │   ├── client.js
│   │   │   └── embeddings.js
│   │   ├── sendgrid/
│   │   │   └── client.js
│   │   └── aws/
│   │       └── s3.js
│   ├── jobs/
│   │   ├── queue.js               # Bull queue setup
│   │   ├── email.job.js
│   │   ├── payout.job.js
│   │   └── reminder.job.js
│   ├── sockets/
│   │   ├── socket-server.js       # Socket.io setup
│   │   ├── chat.handler.js
│   │   ├── typing.handler.js
│   │   └── presence.handler.js
│   ├── utils/
│   │   ├── logger.js              # Winston logger
│   │   ├── errors.js              # Custom error classes
│   │   ├── validators.js
│   │   ├── sanitizers.js
│   │   └── helpers.js
│   ├── app.js                     # Express app setup
│   └── server.js                  # HTTP server entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
└── Dockerfile
```

### 5.2 Layered Architecture

```
┌─────────────────────────────────────┐
│        Routes (API Endpoints)       │  HTTP Request/Response
├─────────────────────────────────────┤
│     Middleware (Auth, Validation)   │  Request Processing
├─────────────────────────────────────┤
│       Controllers (HTTP Logic)      │  Request Handling
├─────────────────────────────────────┤
│   Services (Business Logic)         │  Core Application Logic
├─────────────────────────────────────┤
│   Models / Repositories (Data)      │  Data Access
├─────────────────────────────────────┤
│          Database (MongoDB)         │  Data Storage
└─────────────────────────────────────┘
```

**Layer Responsibilities:**

1. **Routes:** Define API endpoints and HTTP methods
2. **Middleware:** Auth, validation, rate limiting, logging
3. **Controllers:** Handle HTTP requests, call services, return responses
4. **Services:** Business logic, orchestration, external API calls
5. **Models/Repositories:** Database schemas, queries, data validation
6. **Database:** MongoDB persistence

### 5.3 API Design

**Base URL:** `https://api.experthub.com/api/v1`

**Versioning:** URL-based (`/api/v1/`, `/api/v2/`)

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "user": { ... }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**Error Format:**
```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "email": "Email is required"
  },
  "requestId": "req_abc123",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## 6. Database Architecture

### 6.1 MongoDB Schema Design

#### 6.1.1 Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password_hash: String,
  name: String,
  role: Enum['client', 'expert', 'admin'],
  avatar: String (URL),
  email_verified: Boolean,
  verification_token: String,
  reset_password_token: String,
  reset_password_expires: Date,
  last_login: Date,
  created_at: Date,
  updated_at: Date,
  
  // OAuth
  google_id: String (optional),
  oauth_provider: String (optional),
  
  // Profile
  bio: String,
  timezone: String,
  language: String,
  
  // Notification Preferences
  notifications: {
    email: Boolean,
    sms: Boolean,
    push: Boolean
  },
  
  // Status
  status: Enum['active', 'suspended', 'deleted'],
  suspended_reason: String (optional),
  deleted_at: Date (optional)
}
```

**Indexes:**
- `email`: unique
- `role`: non-unique
- `created_at`: non-unique (for sorting)

#### 6.1.2 Experts Collection

```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: Users, indexed),
  
  // Profile
  headline: String,
  bio: String (long text),
  hourly_rate: Number,
  company: String,
  experience_years: Number,
  skills: [String],
  specialties: [String],
  languages: [String],
  
  // Verification
  verification_status: Enum['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended'],
  verification_submitted_at: Date,
  verification_reviewed_at: Date,
  verification_reviewed_by: ObjectId (ref: Users),
  verification_notes: String,
  
  // Documents
  documents: [{
    type: String,  // 'id', 'resume', 'certification'
    url: String,
    uploaded_at: Date
  }],
  
  // Stripe
  stripe_account_id: String (indexed),
  stripe_onboarding_complete: Boolean,
  
  // Availability
  availability: {
    timezone: String,
    weekly_schedule: {
      monday: [{ start: String, end: String }],
      tuesday: [{ start: String, end: String }],
      // ... other days
    },
    exceptions: [{
      date: Date,
      available: Boolean,
      slots: [{ start: String, end: String }]
    }],
    buffer_minutes: Number,
    min_notice_hours: Number,
    max_advance_days: Number
  },
  
  // Stats (denormalized for performance)
  total_earnings: Number,
  total_sessions: Number,
  completed_sessions: Number,
  cancelled_sessions: Number,
  rating: Number (calculated average),
  review_count: Number,
  
  // Calendar
  google_calendar_token: String (encrypted),
  google_calendar_refresh_token: String (encrypted),
  calendar_sync_enabled: Boolean,
  
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `user_id`: unique
- `verification_status`: non-unique
- `stripe_account_id`: unique sparse
- `skills`: multi-key
- `rating`: non-unique (for sorting)

#### 6.1.3 Services Collection

```javascript
{
  _id: ObjectId,
  expert_id: ObjectId (ref: Experts, indexed),
  
  title: String,
  description: String,
  duration_minutes: Number,
  price: Number,
  currency: String (default: 'usd'),
  
  deliverables: [String],
  cancellation_policy: String,
  
  is_active: Boolean,
  sort_order: Number,
  
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `expert_id`: non-unique
- `is_active`: non-unique

#### 6.1.4 Bookings Collection

```javascript
{
  _id: ObjectId,
  booking_number: String (unique, e.g., 'BK-1234'),
  
  client_id: ObjectId (ref: Users, indexed),
  expert_id: ObjectId (ref: Experts, indexed),
  service_id: ObjectId (ref: Services),
  
  scheduled_time: Date (indexed),
  duration_minutes: Number,
  timezone: String,
  
  status: Enum[
    'pending_payment',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'refunded',
    'no_show'
  ],
  
  // Payment
  amount: Number,
  currency: String,
  platform_fee: Number,
  expert_payout: Number,
  stripe_payment_id: String,
  stripe_charge_id: String,
  payment_status: Enum['pending', 'succeeded', 'failed', 'refunded'],
  
  // Cancellation
  cancelled_by: ObjectId (ref: Users),
  cancelled_at: Date,
  cancellation_reason: String,
  
  // Refund
  refund_amount: Number,
  refund_status: Enum['none', 'pending', 'approved', 'rejected', 'processed'],
  refund_processed_at: Date,
  
  // Session
  session_notes: String,
  session_recording_url: String (optional),
  
  // Reminders
  reminder_24h_sent: Boolean,
  reminder_1h_sent: Boolean,
  
  created_at: Date,
  updated_at: Date,
  completed_at: Date
}
```

**Indexes:**
- `booking_number`: unique
- `client_id`: non-unique
- `expert_id`: non-unique
- `scheduled_time`: non-unique
- `status`: non-unique
- Compound: `{ expert_id: 1, scheduled_time: 1 }` (prevent double booking)

#### 6.1.5 Messages Collection

```javascript
{
  _id: ObjectId,
  conversation_id: ObjectId (ref: Conversations, indexed),
  sender_id: ObjectId (ref: Users, indexed),
  
  text: String,
  type: Enum['text', 'file', 'system'],
  
  // File attachment (if type='file')
  file: {
    url: String,
    filename: String,
    size: Number,
    mime_type: String
  },
  
  is_read: Boolean,
  read_at: Date,
  
  // Soft delete
  deleted_at: Date,
  deleted_by: ObjectId (ref: Users),
  
  created_at: Date
}
```

**Indexes:**
- `conversation_id`: non-unique
- `created_at`: non-unique (for pagination)
- Compound: `{ conversation_id: 1, created_at: -1 }`

#### 6.1.6 Conversations Collection

```javascript
{
  _id: ObjectId,
  expert_id: ObjectId (ref: Experts, indexed),
  client_id: ObjectId (ref: Users, indexed),
  booking_id: ObjectId (ref: Bookings),
  
  status: Enum['active', 'archived', 'deleted'],
  
  last_message: String,
  last_message_time: Date,
  
  unread_count_expert: Number,
  unread_count_client: Number,
  
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `expert_id`: non-unique
- `client_id`: non-unique
- `booking_id`: unique sparse
- Compound: `{ client_id: 1, last_message_time: -1 }`
- Compound: `{ expert_id: 1, last_message_time: -1 }`

#### 6.1.7 Transactions Collection

```javascript
{
  _id: ObjectId,
  booking_id: ObjectId (ref: Bookings, indexed),
  
  type: Enum['payment', 'refund', 'payout', 'adjustment'],
  
  // Amounts
  gross_amount: Number,
  platform_fee: Number,
  stripe_fee: Number,
  expert_payout: Number,
  net_amount: Number,
  currency: String,
  
  // Stripe References
  stripe_payment_id: String,
  stripe_charge_id: String,
  stripe_refund_id: String (optional),
  stripe_payout_id: String (optional),
  
  // Status
  status: Enum['pending', 'succeeded', 'failed'],
  
  // Metadata
  description: String,
  notes: String,
  
  created_at: Date,
  processed_at: Date
}
```

**Indexes:**
- `booking_id`: non-unique
- `type`: non-unique
- `created_at`: non-unique

#### 6.1.8 Reviews Collection

```javascript
{
  _id: ObjectId,
  booking_id: ObjectId (ref: Bookings, unique, indexed),
  expert_id: ObjectId (ref: Experts, indexed),
  client_id: ObjectId (ref: Users, indexed),
  
  rating: Number (1-5),
  comment: String,
  
  // Expert Response
  expert_response: String,
  expert_responded_at: Date,
  
  // Moderation
  is_published: Boolean,
  moderated_by: ObjectId (ref: Users),
  moderation_notes: String,
  
  // Reporting
  reports: [{
    reported_by: ObjectId (ref: Users),
    reason: String,
    reported_at: Date
  }],
  
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `booking_id`: unique
- `expert_id`: non-unique
- `is_published`: non-unique

### 6.2 Data Relationships

```
Users (1) ←─── (1) → Experts
  │                     │
  │ (1)                 │ (1)
  ↓                     ↓
Bookings (N)        Services (N)
  │                     │
  │ (1)                 │ (1)
  ↓                     ↓
Transactions (N)    Reviews (1)

Conversations (1) ──→ (N) Messages
      │
      └──→ (1) Bookings
```

### 6.3 Indexing Strategy

**Performance Targets:**
- Query response time: <100ms
- Write operations: <50ms

**Index Types:**
1. **Single Field:** For simple queries (`email`, `status`)
2. **Compound:** For multi-field queries (`{ expert_id, scheduled_time }`)
3. **Text:** For full-text search (`name`, `bio`, `skills`)
4. **Geospatial:** If adding location-based search (future)

**Index Monitoring:**
- Review query plans monthly
- Monitor slow queries (>100ms)
- Remove unused indexes

---

## 7. Real-time Communication

### 7.1 Socket.io Architecture

```javascript
// Socket Server Setup
io.on('connection', (socket) => {
  // 1. Authenticate Socket
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);
  socket.userId = user.id;
  socket.userRole = user.role;
  
  // 2. Join User Room
  socket.join(`user:${user.id}`);
  
  // 3. Event Handlers
  socket.on('join_room', handleJoinRoom);
  socket.on('leave_room', handleLeaveRoom);
  socket.on('send_message', handleSendMessage);
  socket.on('typing', handleTyping);
  socket.on('stop_typing', handleStopTyping);
  socket.on('disconnect', handleDisconnect);
});
```

### 7.2 Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `connection` | Client → Server | New socket connection |
| `join_room` | Client → Server | Join consultation room |
| `leave_room` | Client → Server | Leave consultation room |
| `send_message` | Client → Server | Send chat message |
| `receive_message` | Server → Client | Receive chat message |
| `typing` | Client → Server | User started typing |
| `stop_typing` | Client → Server | User stopped typing |
| `user_typing` | Server → Client | Other user typing |
| `user_stop_typing` | Server → Client | Other user stopped typing |
| `user_joined` | Server → Client | User joined room |
| `user_left` | Server → Client | User left room |
| `webrtc_signal` | Both | WebRTC signaling |
| `disconnect` | Client → Server | Socket disconnected |

### 7.3 Room Authorization

```javascript
async function authorizeRoom(socket, roomId) {
  // 1. Parse room ID (e.g., 'booking:123')
  const [type, id] = roomId.split(':');
  
  // 2. Verify user can access this booking
  const booking = await Booking.findById(id);
  
  // 3. Check if user is participant
  const isParticipant = (
    booking.client_id.equals(socket.userId) ||
    booking.expert_id.equals(socket.userId) ||
    socket.userRole === 'admin'
  );
  
  if (!isParticipant) {
    throw new Error('Unauthorized');
  }
  
  return booking;
}
```

### 7.4 Horizontal Scaling

**Problem:** Socket.io is stateful - users connect to specific server instances

**Solution:** Redis Adapter

```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**Result:** Messages broadcast across all server instances

---

## 8. External Integrations

### 8.1 Stripe Connect

**Purpose:** Payment processing with commission splits

**Flow:**
```
1. Expert completes Stripe Connect onboarding
   ↓
2. Expert's Stripe account linked to platform
   ↓
3. Client books session
   ↓
4. Platform creates PaymentIntent with application_fee
   ↓
5. Client completes payment
   ↓
6. Stripe automatically splits: 85% → Expert, 15% → Platform
   ↓
7. Webhook confirms payment
   ↓
8. Platform updates booking status
```

**Implementation:**
```javascript
// Create Connected Account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: expert.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true }
  }
});

// Create Payment with Commission Split
const paymentIntent = await stripe.paymentIntents.create({
  amount: 25000,  // $250.00
  currency: 'usd',
  application_fee_amount: 3750,  // 15% = $37.50
  transfer_data: {
    destination: expertStripeAccountId
  },
  metadata: {
    booking_id: booking._id
  }
});
```

**Webhooks:**
- `account.updated`: Expert Stripe account status changed
- `payment_intent.succeeded`: Payment completed
- `payment_intent.payment_failed`: Payment failed
- `charge.refunded`: Refund processed
- `payout.paid`: Payout completed

### 8.2 OpenAI

**Purpose:** AI-powered expert matching

**Implementation:**
```javascript
// Generate Embeddings
const response = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: `${expert.name} ${expert.headline} ${expert.bio} ${expert.skills.join(' ')}`
});

const embedding = response.data[0].embedding;

// Store in MongoDB with vector
await Expert.updateOne(
  { _id: expert._id },
  { $set: { embedding } }
);

// Vector Search (MongoDB Atlas Vector Search)
const matches = await Expert.aggregate([
  {
    $vectorSearch: {
      queryVector: clientQueryEmbedding,
      path: 'embedding',
      numCandidates: 100,
      limit: 5,
      index: 'expert_embeddings'
    }
  },
  {
    $project: {
      name: 1,
      headline: 1,
      rating: 1,
      hourly_rate: 1,
      score: { $meta: 'vectorSearchScore' }
    }
  }
]);
```

**Cost Optimization:**
- Cache embeddings for experts (regenerate on profile update)
- Cache common queries (e.g., "AI expert")
- Use GPT-3.5-turbo for less critical queries

### 8.3 SendGrid / AWS SES

**Purpose:** Transactional emails

**Email Types:**
1. Verification emails
2. Password reset
3. Booking confirmations
4. Reminders
5. Receipts
6. Notifications

**Template System:**
```javascript
// Email Templates (Handlebars)
templates/
├── welcome.hbs
├── verification.hbs
├── booking-confirmed.hbs
├── booking-reminder.hbs
└── receipt.hbs

// Send Email
await sendEmail({
  to: user.email,
  template: 'booking-confirmed',
  data: {
    userName: user.name,
    expertName: expert.name,
    sessionTime: booking.scheduled_time,
    amount: booking.amount
  }
});
```

### 8.4 AWS S3 / Cloudinary

**Purpose:** File and image storage

**File Types:**
- Profile images
- Expert documents (resumes, certifications)
- Chat attachments
- Session recordings (optional)

**Implementation:**
```javascript
// Upload to S3
const uploadToS3 = async (file, folder) => {
  const key = `${folder}/${Date.now()}-${file.originalname}`;
  
  await s3.upload({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private'  // Important: Files are private
  }).promise();
  
  return key;
};

// Generate Signed URL (expires in 1 hour)
const getSignedUrl = (key) => {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: 3600  // 1 hour
  });
};
```

---

## 9. Security Architecture

### 9.1 Authentication Flow

```
┌───────────┐
│  Client   │
└─────┬─────┘
      │ 1. POST /api/v1/auth/login
      │    { email, password }
      ▼
┌────────────────────┐
│   Auth Service     │
│ 2. Verify password │
│ 3. Generate JWT    │
└────────┬───────────┘
         │ 4. { access_token, refresh_token }
         ▼
    ┌──────────┐
    │  Redis   │  5. Store refresh_token
    └──────────┘
         │
         │ 6. Return tokens
         ▼
    ┌──────────┐
    │  Client  │  7. Store access_token in memory
    │          │  8. Store refresh_token in httpOnly cookie
    └──────────┘
```

**JWT Payload:**
```javascript
{
  sub: user._id,
  email: user.email,
  role: user.role,
  iat: 1642000000,
  exp: 1642000900  // 15 minutes
}
```

### 9.2 Authorization Middleware

```javascript
// Middleware Stack
router.get('/api/v1/bookings/:id',
  authenticate,              // Verify JWT
  authorize(['client', 'expert', 'admin']),  // Check role
  checkBookingAccess,        // Verify resource ownership
  getBooking
);

// checkBookingAccess Example
async function checkBookingAccess(req, res, next) {
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  const canAccess = (
    booking.client_id.equals(req.user._id) ||
    booking.expert_id.equals(req.user._id) ||
    req.user.role === 'admin'
  );
  
  if (!canAccess) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  req.booking = booking;
  next();
}
```

### 9.3 Input Validation

```javascript
import Joi from 'joi';

// Validation Schema
const createBookingSchema = Joi.object({
  expert_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  service_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  scheduled_time: Joi.date().iso().min('now').required(),
  notes: Joi.string().max(1000).optional()
});

// Validation Middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: error.details.reduce((acc, err) => {
          acc[err.path[0]] = err.message;
          return acc;
        }, {})
      });
    }
    
    req.body = value;  // Use validated & sanitized values
    next();
  };
};

// Usage
router.post('/bookings',
  authenticate,
  validate(createBookingSchema),
  createBooking
);
```

### 9.4 Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// General API Rate Limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Auth Rate Limit (Stricter)
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later'
});

app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
```

### 9.5 Security Headers

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:', 'https://api.stripe.com']
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 10. Deployment Architecture

### 10.1 Production Infrastructure

```
┌──────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                        │
│              (Static Assets, DDoS Protection)             │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTPS
           ┌────────────▼────────────┐
           │   AWS Application       │
           │   Load Balancer (ALB)   │
           └────────────┬────────────┘
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
┌─────▼──────┐   ┌──────▼─────┐   ┌──────▼─────┐
│   ECS      │   │   ECS      │   │   ECS      │
│ Instance 1 │   │ Instance 2 │   │ Instance 3 │
│  (Node.js) │   │  (Node.js) │   │  (Node.js) │
└─────┬──────┘   └──────┬─────┘   └──────┬─────┘
      │                 │                 │
      └─────────────────┼─────────────────┘
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
┌─────▼──────┐   ┌──────▼─────┐   ┌──────▼─────┐
│  MongoDB   │   │   Redis    │   │    S3      │
│   Atlas    │   │ Elasticache│   │  Storage   │
│ (Replica)  │   │  (Cluster) │   │            │
└────────────┘   └────────────┘   └────────────┘
```

### 10.2 Environment Configuration

**Environments:**
1. **Development:** Local machine with Docker Compose
2. **Staging:** AWS ECS, similar to production
3. **Production:** AWS ECS with auto-scaling

**Configuration:**
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  web:
    image: experthub/backend:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 10.3 CI/CD Pipeline

```
┌────────────┐
│   GitHub   │
│  (Code)    │
└─────┬──────┘
      │ Push / PR
      ▼
┌────────────────┐
│ GitHub Actions │
│   (CI/CD)      │
└────┬──────┬────┘
     │      │
     │      ▼
     │  ┌─────────┐
     │  │ Lint    │
     │  │ Test    │
     │  │ Build   │
     │  └────┬────┘
     │       │ Pass
     │       ▼
     │  ┌─────────┐
     │  │  Build  │
     │  │  Docker │
     │  │  Image  │
     │  └────┬────┘
     │       │
     │       ▼
     │  ┌─────────┐
     │  │  Push   │
     │  │   ECR   │
     │  └────┬────┘
     │       │
     └───────┼────────┐
             │        │
             ▼        ▼
     ┌───────────┐ ┌───────────┐
     │  Staging  │ │Production │
     │  Deploy   │ │  Deploy   │
     └───────────┘ └───────────┘
```

**GitHub Actions Workflow:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run linter
        run: npm run lint
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t experthub/backend:${{ github.sha }} .
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push experthub/backend:${{ github.sha }}
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster experthub-prod --service backend --force-new-deployment
```

---

## 11. Scalability Strategy

### 11.1 Horizontal Scaling

**Web Tier:**
- Stateless Node.js instances
- Auto-scaling based on CPU/memory
- Load balancer distributes traffic
- Target: Handle 10,000+ concurrent users

**Database Tier:**
- MongoDB replica set (1 primary, 2 secondaries)
- Read preference: secondaryPreferred
- Sharding strategy (if needed):
  - Shard key: `{ user_id: 'hashed' }` or `{ created_at: 1 }`

**Cache Tier:**
- Redis cluster (3 masters, 3 replicas)
- Cache frequently accessed data:
  - Expert profiles (10 min TTL)
  - User sessions (7 day TTL)
  - API responses (5 min TTL)

### 11.2 Performance Optimization

**Backend:**
1. Database indexes
2. Query optimization
3. Pagination for lists
4. Redis caching
5. Compression (gzip)
6. Connection pooling

**Frontend:**
1. Code splitting
2. Lazy loading
3. Image optimization
4. CDN for static assets
5. Service Worker (PWA)

**Monitoring:**
- Response time metrics
- Error rates
- Database query performance
- Cache hit rates
- Resource utilization

---

## 12. Data Flow Diagrams

### 12.1 Booking Creation Flow

```
┌──────────┐
│  Client  │
└─────┬────┘
      │ 1. Select expert, service, time
      ▼
┌───────────────────┐
│   Frontend        │
│ 2. Validate input │
└─────┬─────────────┘
      │ 3. POST /api/v1/bookings
      │    { expert_id, service_id, scheduled_time }
      ▼
┌───────────────────┐
│   API Gateway     │
│ 4. Authenticate   │
│ 5. Validate input │
└─────┬─────────────┘
      │
      ▼
┌───────────────────┐
│ Booking Service   │
│ 6. Check availability
│ 7. Create booking (status: pending_payment)
│ 8. Hold slot (10 min)
└─────┬─────────────┘
      │
      ▼
┌───────────────────┐
│ Payment Service   │
│ 9. Create Stripe PaymentIntent
│ 10. Return client_secret
└─────┬─────────────┘
      │
      ▼
┌───────────────────┐
│   Frontend        │
│ 11. Show Stripe checkout
│ 12. Client completes payment
└─────┬─────────────┘
      │
      ▼
┌───────────────────┐
│  Stripe Webhook   │
│ 13. payment_intent.succeeded
└─────┬─────────────┘
      │
      ▼
┌───────────────────┐
│ Booking Service   │
│ 14. Update booking (status: confirmed)
│ 15. Create transaction record
│ 16. Send confirmation emails
│ 17. Create conversation
└───────────────────┘
```

### 12.2 AI Matching Flow

```
┌──────────┐
│  Client  │
└─────┬────┘
      │ 1. Enter query:
      │    "Need help with Kubernetes infrastructure"
      ▼
┌───────────────────┐
│   Frontend        │
└─────┬─────────────┘
      │ 2. POST /api/v1/ai/match
      │    { prompt: "..." }
      ▼
┌───────────────────┐
│   AI Service      │
│ 3. Send to OpenAI GPT-4:
│    "Extract skills, budget, urgency"
│ 4. Parse response:
│    { skills: ['kubernetes', 'devops'],
│      budget: null,
│      urgency: 'high' }
└─────┬─────────────┘
      │
      ▼
┌───────────────────┐
│   AI Service      │
│ 5. Generate query embedding (OpenAI)
│ 6. Vector search in MongoDB
│ 7. Rank by: similarity, availability, rating
│ 8. Generate explanations (GPT-4)
└─────┬─────────────┘
      │
      ▼
┌───────────────────┐
│   Frontend        │
│ 9. Display top 5 matches with scores
│ 10. Show explanation for each
└───────────────────┘
```

---

## Conclusion

This architecture document serves as the blueprint for building a production-ready ExpertHub platform. It balances:

- **Security:** Authentication, authorization, input validation, rate limiting
- **Performance:** Caching, indexing, horizontal scaling
- **Reliability:** Error handling, monitoring, backups
- **Maintainability:** Clean code structure, comprehensive tests, documentation

**Next Steps:**
1. Review and approve this architecture
2. Begin Phase 1: Database and Authentication (see PRODUCTION_ROADMAP.md)
3. Set up development environment
4. Start implementation

---

*Architecture Version 2.0*  
*Approved By: [Pending]*  
*Date: January 2025*
