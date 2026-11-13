# MongoDB Transactions for Booking Service - Implementation Plan

## Current State Analysis

### Existing Implementation
- `ReservationUnit.insertMany(units, {ordered: true})` for atomic insertion
- Separate BookingHold creation before ReservationUnit creation
- No MongoDB session/transaction wrapper
- TTL index for eventual cleanup, but not enforced during conflict checks

### Critical Issues to Address

1. **Partial Persistence Risk**: Although `ordered: true` stops processing after first conflict, earlier documents in the batch may already be persisted
2. **Hold-Unit Mismatch**: If BookingHold creation succeeds but ReservationUnit creation partially fails, we have orphaned holds
3. **No Transactional Guarantee**: No rollback mechanism if any step fails
4. **Expiration Race**: Simultaneous confirmation and expiration can lead to invalid states

## Solution: Implement MongoDB Sessions & Transactions

### Topology Requirements

**Development (Current)**:
- Standalone MongoDB: Will NOT support multi-document transactions
- **Workaround**: Use ordered insert with explicit cleanup on failure

**Staging/Production**:
- MongoDB Replica Set (minimum): Full transaction support
- MongoDB Sharded Cluster: Full transaction support

### Implementation Strategy

#### Phase 1: Session-Aware Bookings (Works with Standalone)
1. Wrap critical operations with explicit session handling
2. Implement aggressive cleanup on conflicts
3. Use idempotency tokens to prevent duplicate holds
4. Verify state consistency after each operation

#### Phase 2: Transaction Support (Requires Replica Set)
1. Detect if MongoDB supports transactions (replica set check)
2. If supported: Wrap all booking operations in transaction
3. If not supported: Fall back to Phase 1 with enhanced logging

### Database Connection Changes

```javascript
// In database.js: Add transaction capability detection
async function ensureTransactionSupport() {
  const admin = mongoose.connection.getClient().db('admin');
  const replicaStatus = await admin.admin().replSetGetStatus().catch(() => null);
  const isReplicaSet = !!replicaStatus;
  
  if (!isReplicaSet) {
    logger.warn('MongoDB is standalone. Transactions not available. Using ordered inserts with rollback.');
  }
  
  return isReplicaSet;
}
```

### Booking Service Transaction Wrapper

```javascript
async function withBookingTransaction(bookingFn) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const result = await bookingFn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
```

### Updated CreateHold Implementation

```javascript
async createHold(clientId, expertId, serviceId, startTime, timezone = 'UTC') {
  // Generate idempotency key for deduplication
  const idempotencyKey = `${clientId}-${expertId}-${serviceId}-${startTime}`;
  
  // Check if we already have a recent hold for this key
  const existingHold = await BookingHold.findOne({
    clientId,
    expertId,
    serviceId,
    startTime,
    createdAt: { $gt: new Date(Date.now() - 60000) } // Within last 60 seconds
  });
  
  if (existingHold) {
    return existingHold; // Idempotent return
  }
  
  return await withBookingTransaction(async (session) => {
    // All operations use the same session
    const hold = await BookingHold.create([{
      expertId,
      startTime,
      endTime,
      clientId,
      serviceId,
      expiresAt,
      status: 'active',
    }], { session });
    
    // Reserve units in same transaction
    const reservationResult = await ReservationUnit.createReservation(
      expertId,
      hold[0]._id,
      startTime,
      duration,
      bufferMinutes,
      expiresAt,
      session  // Pass session to insertMany
    );
    
    if (!reservationResult.success) {
      throw new AppError('Slot conflict', 409);
    }
    
    return hold[0];
  });
}
```

## Implementation Steps

### Step 1: Update ReservationUnit.createReservation()
- Add optional `session` parameter
- Pass session to `insertMany()` call
- Handle E11000 with detailed error reporting

### Step 2: Update ReservationUnit.confirmReservation()
- Add optional `session` parameter
- Pass session to all database operations

### Step 3: Update ReservationUnit.releaseReservation()
- Add optional `session` parameter
- Pass session to updates

### Step 4: Update BookingService.createHold()
- Implement `withBookingTransaction()` wrapper
- Add idempotency key handling
- Pass session through all operations
- Explicit error handling and cleanup

### Step 5: Update BookingService.confirmBooking()
- Verify hold hasn't expired (within transaction)
- Create booking with session
- Convert units from 'held' to 'confirmed' with session
- Only return success after transaction commits

### Step 6: Database Connection
- Add transaction capability detection
- Log transaction support status on startup
- Provide configuration option to force no-transaction mode

## Testing Strategy

### Unit Tests
1. Successful transaction commit
2. Transaction rollback on conflict
3. Orphaned unit detection after failure
4. Idempotency key deduplication

### Integration Tests
1. 20 concurrent identical requests → 1 succeeds, 19 fail
2. Concurrent conflict detection
3. Partial failure recovery
4. Expired hold cleanup
5. Race conditions between confirm and expiration

### Database Verification
```javascript
// After each test, verify database state:
const orphanedUnits = await ReservationUnit.find({
  holdId: { $in: allTestHoldIds },
  status: 'held'
});
assert(orphanedUnits.length === 0, 'Found orphaned units');
```

## Rollout Plan

### Environment 1: Development (Standalone MongoDB)
- Implement Session-Aware Phase 1
- Enhanced cleanup and error logging
- Warning logs about transaction limitations

### Environment 2: Staging (Replica Set)
- Deploy full transaction support
- Run extended concurrency tests
- Monitor transaction performance

### Environment 3: Production
- Require MongoDB Replica Set in deployment checklist
- Full transaction support
- Regular backups and recovery testing

## Known Limitations

### Current Standalone MongoDB
- `ordered: true` insert stops on first error but doesn't rollback earlier inserts
- **Mitigation**: Explicit cleanup on E11000 error, verify no orphans remain

### Transaction Support
- Transactions only on replica sets (minimum 3 nodes for production)
- **Configuration requirement**: Must be documented and enforced

### Hold Expiration
- TTL index runs asynchronously (1-minute clock)
- **Mitigation**: Application-level expiration checks before confirmation

## Success Criteria

✓ No orphaned reservation units after failed bookings
✓ 20 concurrent requests → exactly 1 succeeds
✓ All partial-overlap scenarios rejected
✓ Confirmed bookings cannot be released by hold expiration
✓ Database consistency verified after every test
✓ Transaction support properly detected and logged
✓ All tests pass on both standalone and replica set MongoDB
