# Phase 3C: Booking API Contract Analysis

**Date**: November 14, 2026  
**Status**: Contract Definition  
**Purpose**: Document actual backend booking API for frontend integration

---

## 1. Authentication Verification (Phase 2 Results)

### Authentication Flow - VERIFIED ✅

**Login Endpoint**: `POST /api/v1/auth/login`
- Request: `{ email, password }`
- Response: `{ status: 'success', data: { user, accessToken, refreshToken } }`
- JWT stored in localStorage

**Token Refresh Endpoint**: `POST /api/v1/auth/refresh-token`
- Request: `{ refreshToken }` (from localStorage or body)
- Response: `{ status: 'success', data: { accessToken } }`
- Frontend client implements:
  - Request interceptor: Adds `Authorization: Bearer <token>` header
  - Response interceptor: Handles 401 with token refresh queue
  - Queues concurrent requests during refresh to prevent race conditions

**Logout Endpoint**: `POST /api/v1/auth/logout` (protected)
- Clears cookies server-side
- Frontend also clears localStorage

**Contract Match**: ✅ Frontend client matches backend API exactly

**Configuration**:
- Server port: 3001
- Base URL: `http://localhost:3001/api/v1`
- CORS: Credentials enabled
- JWT expiry: 15 minutes (from .env)
- Refresh expiry: 7 days (from .env)

---

## 2. Booking API Contract (Phase 5A)

### Base Route
- Path: `/api/v1/bookings`
- Auth: All routes require JWT via `authenticate` middleware
- Response format: `{ success: true, message: "...", data: {...} }`

### 2.1 Create Hold (Atomic Reservation)

**Endpoint**: `POST /api/v1/bookings/holds`  
**Authentication**: Required ✅  
**Status Code**: 201 Created

**Request Body**:
```json
{
  "expertId": "ObjectId (MongoDB _id)",
  "serviceId": "ObjectId (MongoDB _id)",
  "startTime": "ISO 8601 datetime (must be >= now)",
  "timezone": "UTC (default)"
}
```

**Response Success (201)**:
```json
{
  "success": true,
  "message": "Time slot reserved",
  "data": {
    "_id": "ObjectId",
    "expertId": "ObjectId",
    "serviceId": "ObjectId",
    "clientId": "ObjectId (req.user.id)",
    "startTime": "ISO 8601",
    "endTime": "ISO 8601 (calculated from service duration)",
    "status": "active",
    "expiresAt": "ISO 8601 (now + 15 minutes)",
    "createdAt": "ISO 8601"
  },
  "expiresAt": "ISO 8601"
}
```

**Response Error (400)**:
```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["expertId is required", ...]
}
```

**Response Error (409) - Slot Unavailable**:
```json
{
  "success": false,
  "message": "TIME_SLOT_UNAVAILABLE",
  "error": "This time slot is already held or booked"
}
```

**Business Rules** (Enforced by Backend):
- Hold duration: 15 minutes (hardcoded, not configurable from frontend)
- Unique index prevents concurrent holds on same slot (database constraint)
- TTL index auto-deletes expired holds after 15 minutes
- Service duration determines `endTime` from `startTime`

---

### 2.2 Confirm Booking

**Endpoint**: `POST /api/v1/bookings/confirm` OR `POST /api/v1/bookings`  
**Authentication**: Required ✅  
**Status Code**: 201 Created

**Request Body**:
```json
{
  "holdId": "ObjectId (from hold creation)",
  "clientNotes": "string (optional, max 1000 chars)"
}
```

**Response Success (201)**:
```json
{
  "success": true,
  "message": "Booking confirmed",
  "data": {
    "_id": "ObjectId",
    "clientId": "ObjectId",
    "expertId": "ObjectId",
    "serviceId": "ObjectId",
    "scheduledAt": "ISO 8601",
    "duration": 60,
    "endTime": "ISO 8601",
    "timezone": "UTC",
    "status": "payment_pending",
    "statusHistory": [{
      "status": "pending",
      "changedBy": "ObjectId",
      "reason": "Initial creation",
      "timestamp": "ISO 8601"
    }],
    "pricing": {
      "baseAmount": 150.00,
      "platformFee": 0,
      "taxAmount": 0,
      "discountAmount": 0,
      "totalAmount": 150.00
    },
    "createdAt": "ISO 8601"
  }
}
```

**Response Error (400)**:
- Hold not found
- Hold expired
- Hold already confirmed
- Invalid holdId format

**Critical**: Booking status is `payment_pending`, NOT `confirmed`. Frontend must respect this status.

---

### 2.3 Get User Bookings

**Endpoint**: `GET /api/v1/bookings/me` OR `GET /api/v1/bookings`  
**Authentication**: Required ✅  
**Status Code**: 200 OK

**Query Parameters**:
- `status`: Filter by status (optional)
- `page`: Pagination (default 1)
- `limit`: Items per page (default 20)

**Response Success (200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "clientId": "ObjectId",
      "expertId": { "_id": "...", "firstName": "...", "lastName": "..." },
      "serviceId": { "_id": "...", "title": "React Consulting" },
      "scheduledAt": "ISO 8601",
      "duration": 60,
      "status": "payment_pending",
      "pricing": { "totalAmount": 150.00 },
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

**Note**: Response includes populated expert and service details (eager-loaded).

---

### 2.4 Get Booking By ID

**Endpoint**: `GET /api/v1/bookings/:id`  
**Authentication**: Required ✅  
**Status Code**: 200 OK

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "clientId": "ObjectId",
    "expertId": "ObjectId",
    "serviceId": "ObjectId",
    "scheduledAt": "ISO 8601",
    "duration": 60,
    "status": "payment_pending",
    "pricing": { ... },
    ...
  }
}
```

---

### 2.5 Cancel Booking

**Endpoint**: `PATCH /api/v1/bookings/:id/cancel` OR `DELETE /api/v1/bookings/:id`  
**Authentication**: Required ✅  
**Status Code**: 200 OK

**Request Body**:
```json
{
  "reason": "string (required, max 500 chars)"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Booking cancelled",
  "data": {
    "_id": "ObjectId",
    "status": "cancelled",
    "statusHistory": [
      ...,
      { "status": "cancelled", "reason": "Client request", ... }
    ]
  },
  "refundInfo": {
    "eligibleForRefund": true,
    "refundAmount": 150.00,
    "reason": "Full refund - cancelled within 24 hours"
  }
}
```

**Business Rules**:
- Cancellation requires reason (enforced by validation schema)
- Refund info included in response
- Status transitions to "cancelled" with reason in history

---

### 2.6 Reschedule Booking

**Endpoint**: `PATCH /api/v1/bookings/:id/reschedule`  
**Authentication**: Required ✅  
**Status Code**: 200 OK

**Request Body**:
```json
{
  "newStartTime": "ISO 8601 (>= now)",
  "reason": "string (optional, max 500 chars)"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Booking rescheduled",
  "data": {
    "_id": "ObjectId",
    "scheduledAt": "new ISO 8601",
    "endTime": "new ISO 8601",
    "status": "payment_pending",
    "statusHistory": [...]
  }
}
```

**Business Rules**:
- New time must be >= now
- Original booking is released (hold cancelled)
- New hold must not conflict with expert availability
- If new hold creation fails, original booking reverted (atomic)

---

### 2.7 Complete Booking

**Endpoint**: `POST /api/v1/bookings/:id/complete`  
**Authentication**: Required ✅  
**Status Code**: 200 OK

**Request Body**: None

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Booking marked as completed",
  "data": {
    "_id": "ObjectId",
    "status": "completed",
    "statusHistory": [
      ...,
      { "status": "completed", "timestamp": "ISO 8601" }
    ]
  }
}
```

**Note**: Typically called by the system after the booking time has passed or the session has ended.

---

## 3. Booking Models: Key Fields

### Booking Document (MongoDB)
```
_id: ObjectId
clientId: ObjectId (ref: User)
expertId: ObjectId (ref: User)
serviceId: ObjectId (ref: Service)
scheduledAt: Date (ISO 8601)
duration: Number (minutes)
endTime: Date (scheduledAt + duration)
timezone: String (UTC)
status: "pending" | "confirmed" | "payment_pending" | "paid" | "in_progress" | "completed" | "cancelled" | "refunded" | "disputed" | "no_show"
statusHistory: [ { status, changedBy, reason, timestamp } ]
pricing: {
  baseAmount: Number,
  platformFee: Number,
  taxAmount: Number,
  discountAmount: Number,
  totalAmount: Number
}
notes: String (optional)
createdAt: Date
updatedAt: Date
```

### BookingHold Document (MongoDB)
```
_id: ObjectId
expertId: ObjectId
serviceId: ObjectId
clientId: ObjectId
startTime: Date (ISO 8601)
endTime: Date (ISO 8601)
expiresAt: Date (now + 15 minutes, TTL)
bookingId: ObjectId (null until confirmed)
status: "active" | "confirmed" | "expired" | "released"
createdAt: Date
```

### Service Document (MongoDB)
```
_id: ObjectId
expertId: ObjectId (ref: Expert)
title: String
description: String
shortDescription: String
category: String
tags: [String]
pricing: {
  type: "hourly" | "fixed" | "package",
  amount: Number,
  currency: "USD" | ...,
  packageDetails: { sessionsIncluded, validityDays }
}
duration: Number (minutes, for fixed/hourly)
availability: { ... }
status: "active" | "inactive"
createdAt: Date
```

---

## 4. Availability API (For Service Selection)

### Get Availability for Expert

**Endpoint**: `GET /api/v1/availability/expert/:expertId?date=YYYY-MM-DD`  
**Authentication**: Not required (public)  
**Status Code**: 200 OK

**Response Success (200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "expertId": "ObjectId",
      "date": "2026-11-15",
      "startTime": "09:00",
      "endTime": "17:00",
      "status": "available",
      "slotDuration": 60,
      "availableSlots": [
        { "start": "09:00", "end": "10:00", "available": true },
        { "start": "10:00", "end": "11:00", "available": false },
        ...
      ]
    }
  ]
}
```

---

## 5. Services API (For Expert Details)

### Get Services for Expert

**Endpoint**: `GET /api/v1/services/expert/:expertId`  
**Authentication**: Not required (public)  
**Status Code**: 200 OK

**Response Success (200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "title": "1-hour React Consulting",
      "description": "Expert guidance on React architecture and best practices",
      "duration": 60,
      "pricing": {
        "type": "hourly",
        "amount": 150,
        "currency": "USD"
      },
      "status": "active"
    }
  ]
}
```

---

## 6. Experts Marketplace API (Already Integrated in Phase 3B)

### Get All Experts

**Endpoint**: `GET /api/v1/experts`  
**Response**: Array of expert profiles with basic details

---

## 7. Error Handling: Common Response Codes

| Code | Scenario | Response |
|------|----------|----------|
| 200 | Success | `{ success: true, data: {...} }` |
| 201 | Resource created | `{ success: true, data: {...} }` |
| 400 | Validation error | `{ success: false, errors: [...] }` |
| 401 | Unauthorized (no token) | `{ message: "Authentication required" }` |
| 403 | Forbidden (wrong role) | `{ message: "Insufficient permissions" }` |
| 404 | Not found | `{ message: "Booking not found" }` |
| 409 | Conflict (slot unavailable) | `{ success: false, error: "TIME_SLOT_UNAVAILABLE" }` |
| 500 | Server error | `{ message: "Internal server error" }` |

---

## 8. Implementation Notes for Frontend

### Do NOT Implement:
- ❌ Stripe payment processing
- ❌ Payment webhooks
- ❌ Payout calculations
- ❌ Invoice generation
- ❌ Refund processing (backend handles this)

### DO Implement:
- ✅ Hold creation with 15-minute expiry display
- ✅ Booking confirmation flow
- ✅ Status display with respect to `payment_pending` state
- ✅ Booking history and cancellation
- ✅ Error handling for slot conflicts
- ✅ Availability loading from backend
- ✅ Service selection from backend data

### State Transitions to Respect:
```
pending → payment_pending → paid → in_progress → completed
   ↓             ↓            ↓
 cancelled (any state) → refunded
```

The frontend should NOT skip `payment_pending` status or label a `payment_pending` booking as "confirmed" without payment.

---

## 9. Testing Contracts

### Booking Workflow (Happy Path):
1. User selects expert (from marketplace)
2. Load expert's services: `GET /api/v1/services/expert/:expertId`
3. Load availability: `GET /api/v1/availability/expert/:expertId?date=...`
4. User selects service + time slot
5. Create hold: `POST /api/v1/bookings/holds`
6. Display 15-minute countdown
7. User confirms: `POST /api/v1/bookings/confirm`
8. Booking status = `payment_pending` (not "confirmed")
9. Display booking in history: `GET /api/v1/bookings/me`

### Conflict Handling:
1. Two users try to hold same slot simultaneously
2. First one succeeds: Hold created
3. Second one receives: 409 Conflict + `TIME_SLOT_UNAVAILABLE`
4. Frontend displays: "This slot is no longer available"

### Expiry Handling:
1. User creates hold: expires in 15 minutes
2. Countdown displayed
3. User takes too long (> 15 min)
4. User clicks confirm
5. Backend rejects: "Hold has expired"
6. Frontend displays: "Slot expired, please create a new hold"

---

## Git Status
- Local commits ahead: 4
- Last booking-related commit: `890ba5b` (booking concurrency test fixes)
- Previous authentication commits: `4cc9cc2` (JWT implementation verified ✅)

---

**Contract Analysis Complete**  
**Ready for Phase 5B: Frontend Booking API Wrapper Creation**
