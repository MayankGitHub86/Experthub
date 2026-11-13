# MODEL VERIFICATION REPORT

**Date:** January 13, 2026  
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## CRITICAL ISSUE: MODULE SYSTEM MISMATCH

### Problem
The project uses **ES6 modules** (`"type": "module"` in package.json), but newly created models use **CommonJS** (`require`/`module.exports`).

### Impact
- Server will fail to import new models
- Import errors will occur
- Models are not actually usable

### Models Affected
- Booking.js ❌
- Conversation.js ❌
- Message.js ❌
- Review.js ❌
- Service.js ❌
- Transaction.js ❌
- index.js ❌

### Existing Models (Correct ES6)
- User.js ✅
- Expert.js ✅

### Required Action
Convert all new models from CommonJS to ES6 module syntax.

---

## USER MODEL ANALYSIS

**File:** `backend/src/models/User.js`  
**Status:** ✅ EXISTS (Created in Phase 1)

### Fields Present
- email (unique, indexed)
- password (hashed, bcrypt)
- name
- role (client, expert, admin, support)
- avatar
- emailVerified
- verificationToken
- resetPasswordToken
- googleId (OAuth)
- bio
- timezone
- language
- phone
- notifications (email, sms, push)
- status (active, suspended, deleted)
- lastLogin
- loginAttempts
- lockUntil

### Methods
- `comparePassword()`
- `incLoginAttempts()`
- `resetLoginAttempts()`
- `findByEmail()` (static)
- `findActive()` (static)

### Issues
❌ **Missing fields referenced by Expert model:**
- firstName, lastName (Expert model expects these)
- profilePicture (Expert model populates this)

❌ **Inconsistency:** User has `name` field but Expert virtuals expect `firstName` and `lastName`

### Recommendation
Update User model to split `name` into `firstName` and `lastName` OR update Expert model references.

---

## EXPERT MODEL ANALYSIS

**File:** `backend/src/models/Expert.js`  
**Status:** ✅ EXISTS (Created earlier)

### Core Fields
- userId (ref User, unique)
- headline
- bio (100-2000 chars)
- hourlyRate ($10-$1000)
- company
- experienceYears
- skills[]
- specialties[]
- languages[]
- category

### Verification
- verificationStatus (draft, submitted, under_review, approved, rejected, suspended)
- verificationSubmittedAt
- verificationReviewedAt
- verificationReviewedBy
- verificationNotes
- verifiedBadge
- documents[]

### Stripe
- stripeAccountId
- stripeOnboardingComplete
- stripePayoutsEnabled

### Issues Found
❌ **No availability management** - The model mentions "availability" in documentation but doesn't actually implement it
❌ **Missing stats fields** - References to `'stats.averageRating'` in indexes but no stats field exists
❌ **No isActive field** - Indexes reference `isActive` but field doesn't exist

### Missing from Phase 2 Expert Model
The newly created Expert.js (Phase 2) has extensive features that the existing Expert.js lacks:
- Performance statistics
- Availability schedules
- Calendar integration
- Search optimization
- Rating management

### Recommendation
The existing Expert.js needs significant expansion OR we need to verify which version is correct.

---

## DUPLICATE MODEL ISSUE

### Problem
There appear to be TWO Expert.js files or versions:
1. **Existing** - Simple profile with verification (9,361 bytes, created 18:05)
2. **Phase 2** - Comprehensive with availability, stats, calendar (reported as created)

### Resolution Needed
- Determine which Expert model to use
- Merge features if necessary
- Ensure consistency

---

## NEW MODELS TO BE CONVERTED

### Service.js
**Size:** 11,387 bytes  
**Status:** ⚠️ CommonJS (needs conversion)

**Critical Review:**
- ✅ Schema looks comprehensive
- ✅ Pricing models (hourly, fixed, package)
- ✅ Category enum matches requirements
- ✅ Cancellation policies
- ✅ Double-booking prevention helpers
- ❌ **100+ indexes claim**: Only ~10 actual indexes (reasonable)
- ❌ Module syntax needs fixing

**Justified Indexes:**
- expertId + isActive ✅
- category + isActive + rating ✅
- pricing.amount + isActive ✅
- Text search on title/description ✅
- featured + isActive ✅

**Recommendation:** Convert to ES6, keep indexes as-is.

---

### Booking.js
**Size:** 14,071 bytes  
**Status:** ⚠️ CommonJS (needs conversion)

**Critical Review:**
- ✅ State machine with 10 states
- ✅ Status history tracking
- ✅ Pricing breakdown
- ✅ Payment integration prep
- ✅ Cancellation logic
- ✅ Double-booking prevention static method
- ❌ **Missing atomic reservation mechanism**
- ❌ **No hold/lock table**
- ❌ Module syntax needs fixing

**Double-Booking Prevention Analysis:**
The `checkDoubleBooking()` static method is a READ operation, not atomic.

**Problem:**
```javascript
// Not atomic!
const conflict = await Booking.checkDoubleBooking(expertId, date, duration);
if (!conflict) {
  await booking.save(); // Race condition here!
}
```

**Solution Required:**
Implement one of:
1. Separate Hold/Reservation collection with unique index
2. MongoDB transactions (requires replica set)
3. Optimistic locking with version field
4. Database-level constraint

**Recommendation:** Add separate BookingHold model with TTL and unique compound index.

---

### Conversation.js
**Size:** 10,357 bytes  
**Status:** ⚠️ CommonJS (needs conversion)

**Critical Review:**
- ✅ Multi-party participants
- ✅ Unread counts per user
- ✅ Last message caching (good optimization)
- ❌ **Typing indicators stored in DB** - Should be in-memory/Redis
- ❌ Module syntax needs fixing

**Typing Indicators Issue:**
Storing real-time typing status in MongoDB is inefficient.

**Current Implementation:**
```javascript
typingUsers: [{
  userId: ObjectId,
  startedAt: Date
}]
```

**Problem:**
- Extra database writes for transient data
- Increased latency
- Not actually real-time

**Recommendation:**
- Remove `typingUsers` from schema
- Handle via Socket.io in-memory
- Use Redis if persistence needed across servers

---

### Message.js
**Size:** 11,527 bytes  
**Status:** ⚠️ CommonJS (needs conversion)

**Critical Review:**
- ✅ Attachments support
- ✅ Read receipts
- ✅ Reactions
- ✅ Edit history
- ✅ Soft delete
- ✅ Threading (replyTo)
- ❌ Module syntax needs fixing

**Indexes:** Reasonable, all justified by queries.

**Recommendation:** Convert to ES6, schema is solid.

---

### Review.js
**Size:** 13,017 bytes  
**Status:** ⚠️ CommonJS (needs conversion)

**Critical Review:**
- ✅ 1-5 star rating
- ✅ Detailed sub-ratings
- ✅ One review per booking (unique constraint)
- ✅ Helpfulness voting
- ✅ Moderation workflow
- ✅ Expert response capability
- ❌ Module syntax needs fixing

**Post-Save Hook Concern:**
```javascript
reviewSchema.post('save', async function(doc) {
  // Updates Expert rating
  await expert.updateExpertRating();
});
```

**Issue:** This method doesn't exist in current Expert model.

**Recommendation:** 
- Convert to ES6
- Create `updateExpertRating()` method in Expert model
- Consider moving rating calculation to a service layer

---

### Transaction.js
**Size:** 13,647 bytes  
**Status:** ⚠️ CommonJS (needs conversion)

**Critical Review:**
- ✅ Comprehensive transaction types
- ✅ Fee breakdown
- ✅ Status management
- ✅ Stripe integration fields
- ✅ Idempotency key support
- ✅ Balance calculation methods
- ❌ Module syntax needs fixing
- ❌ **Payment integration mixed with domain model**

**Concern:**
Stripe-specific logic (payment intents, charges) is tightly coupled to Transaction model.

**Recommendation:**
- Convert to ES6
- Keep Stripe IDs in model (acceptable)
- Move Stripe API calls to separate payment service
- Transaction model should store results, not handle Stripe SDK calls

---

## MISSING MODELS

### Availability Model
**Status:** ❌ MISSING

The Expert model doesn't implement availability management.

**Required Features:**
- Weekly recurring schedule
- Date exceptions
- Blocked time slots
- Buffer times
- Minimum booking notice
- Maximum advance booking
- Time zone handling

**Recommendation:** Create separate Availability model or embed in Expert.

### BookingHold Model
**Status:** ❌ MISSING (Critical for atomic booking)

**Purpose:** Temporary reservation to prevent double-booking race conditions.

**Required Schema:**
```javascript
{
  expertId: ObjectId,
  startTime: Date,
  endTime: Date,
  clientId: ObjectId,
  expiresAt: Date, // TTL index
  bookingId: ObjectId // null until confirmed
}
```

**Unique Index:** `{ expertId: 1, startTime: 1, endTime: 1 }` with overlap prevention.

---

## INDEX ANALYSIS

### "100+ Indexes" Claim
**Actual Count:** ~35-40 indexes across all models

**Assessment:** Reasonable, not excessive.

### Justified Indexes
Most indexes support actual query patterns:
- Foreign key lookups (userId, expertId, bookingId)
- Status + date range queries
- Search filters (category + status + rating)
- Text search indexes
- Unique constraints

### Potentially Redundant
- Some compound indexes may cover single-field queries
- MongoDB can use index prefixes

**Recommendation:** Keep current indexes, monitor with `explain()` in production.

---

## BUSINESS LOGIC PLACEMENT

### Issues Found

1. **Model Methods Too Complex**
   - Review.post('save') triggers external updates
   - Booking state machine in model (acceptable)
   - Transaction creation methods in model (move to service)

2. **Missing Service Layer**
   - No booking.service.js
   - No expert.service.js
   - No availability.service.js

3. **Cross-Model Updates**
   - Review updating Expert stats
   - Message updating Conversation
   - Potential for cascading failures

**Recommendation:**
Create service layer:
- `booking.service.js` - Booking workflow
- `expert.service.js` - Expert verification, stats
- `availability.service.js` - Slot management
- `payment.service.js` - Stripe integration
- `review.service.js` - Review submission, stats updates

---

## SECURITY CONCERNS

### Authentication Model Issues
✅ User model has proper password hashing
✅ Account locking after failed attempts
✅ Password reset tokens

### Authorization Gaps
❌ No explicit permission checking methods
❌ Models don't validate ownership
❌ Controllers must handle all authz (risky)

### Data Validation
✅ Schema validation comprehensive
✅ Enums for status fields
✅ Min/max constraints

**Recommendation:** Add authorization helper methods to models.

---

## SOFT DELETE IMPLEMENTATION

### User Model
✅ Has `status: 'deleted'` field
✅ Has `deletedAt` timestamp
❌ No query helpers to exclude deleted users

### Message Model
✅ Has `deleted` boolean
✅ Has `deletedFor` array (per-user deletion)
❌ Queries must explicitly filter deleted messages

### Other Models
⚠️ No soft delete in Service, Booking, Review

**Recommendation:**
- Add global query middleware to exclude deleted records
- Or use soft-delete plugin
- Be consistent across all models

---

## ERROR HANDLING

### Current State
✅ Validation errors throw automatically (Mongoose)
❌ No custom AppError classes in models
❌ Error messages not i18n ready

### Missing
- Duplicate key error handling
- Validation error transformation
- Graceful failure on reference lookups

**Recommendation:** Create error handling middleware in service layer.

---

## TIMESTAMPS

✅ All models have `timestamps: true`
✅ Consistent createdAt/updatedAt

---

## RELATIONSHIPS AND REFERENCES

### Circular Dependencies
⚠️ Potential issue:
- Review references User, Expert, Booking, Service
- Booking references Service, User (client & expert)
- Service references User (expert)

**Risk:** Import cycles if not careful

**Mitigation:** Use string references in `ref:` fields (already done ✅)

---

## FINAL ASSESSMENT

### Blocker Issues (Must Fix)
1. ❌ **CommonJS → ES6 conversion required**
2. ❌ **User model field inconsistency** (name vs firstName/lastName)
3. ❌ **Missing BookingHold model** (atomic reservation)
4. ❌ **Missing Availability model/implementation**
5. ❌ **Typing indicators in DB** (move to Socket.io)

### High Priority (Should Fix)
6. ⚠️ Expert model missing stats fields referenced in indexes
7. ⚠️ No service layer architecture
8. ⚠️ Review post-save hook references non-existent method
9. ⚠️ No soft-delete query helpers

### Medium Priority (Consider)
10. 🔔 Payment logic mixed in Transaction model
11. 🔔 Authorization helpers needed
12. 🔔 Duplicate Expert model versions

---

## RECOMMENDATIONS

### Immediate Actions
1. **Convert all new models to ES6**
2. **Fix User model field names**
3. **Create BookingHold model**
4. **Create Availability model**
5. **Remove typing indicators from Conversation schema**
6. **Add missing fields to Expert model**
7. **Create service layer architecture**

### Before Proceeding
- All models must load without errors
- Restart server and verify imports
- Run basic CRUD tests on each model
- Verify indexes are created in MongoDB

---

## CONCLUSION

The models have solid schema design but critical implementation issues:
- Module system mismatch prevents usage
- Missing atomic reservation mechanism
- Incomplete Expert model
- No service layer

**Status:** 🔴 **NOT PRODUCTION READY**

**Next Steps:** Fix blockers before proceeding with API implementation.

---

**Verified By:** Kiro AI  
**Date:** January 13, 2026
