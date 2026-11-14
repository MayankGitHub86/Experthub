# Quick Start: MongoDB Transactions Testing (Development Only)

## 1. Start Temporary MongoDB rs0 (Terminal 1)

```powershell
$mongoDir = "$env:LOCALAPPDATA\Experthub\mongo-rs0-test"
& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" `
  --replSet rs0 `
  --port 27018 `
  --dbpath $mongoDir `
  --bind_ip localhost
```

**Expected Output**:
```
2026-11-15T...s":"I","msg":"Listening on","attr":{"address":"127.0.0.1:27018"}}
2026-11-15T...s":"I","msg":"Waiting for connections","attr":{"port":27018}}
```

Keep this terminal open.

## 2. Initialize Replica Set (Terminal 2)

```bash
cd backend
node init-rs0-direct.js
```

**Expected Output**:
```
✓ Connected to MongoDB
✓ Ping successful
✓ rs.initiate() executed
✅✅✅ Replica set rs0 is ready for transactions! ✅✅✅
```

## 3. Run Transaction Tests (Terminal 2)

### MongoDB Transaction Tests
```bash
node test-transactions-real.js
```

**Expected**: 5/5 PASS
- ✅ Successful Transaction - Commit
- ✅ Failed Transaction - Rollback
- ✅ Partial Failure - Complete Rollback
- ✅ Concurrent Transactions
- ✅ Write Conflict Detection

### Booking Safety Tests
```bash
node test-booking-safety.js
```

**Expected**: 5/5 PASS
- ✅ Successful Booking Creation
- ✅ Concurrent Slot Booking Attempt
- ✅ Booking Cancellation
- ✅ Hold Expiration Handling
- ✅ Confirmed Reservation Protection

## 4. Start Backend (Terminal 2 or 3)

```bash
npm run dev
```

**Expected**:
```
✅ MongoDB connected successfully
  host: localhost
  database: experthub
```

## Architecture

```
Your Application
        ↓
   mongoose
        ↓
Backend Code (booking.service.js)
        ↓
   MongoDB Driver
        ↓
    TCP 127.0.0.1:27018
        ↓
   MongoDB Process (--replSet rs0)
        ↓
   Replica Set rs0 (single-node PRIMARY)
```

## Key Features Verified ✅

- Multi-document transactions (atomicity)
- Commit on success, rollback on error
- Concurrent transaction isolation
- Write conflict detection and handling
- Automatic retry logic
- Session cleanup and safety

## Important Notes

- **Port 27018** — Temporary test instance, NOT production
- **Port 27017** — Original MongoDB unchanged
- **directConnection=true** — Required in connection string (single-node replica set)
- **retryWrites=true** — Enables retryable writes for transactions
- **w=majority** — Write concern (acknowledged)

## Cleanup (Optional)

To remove test database files:
```powershell
Remove-Item -Path "$env:LOCALAPPDATA\Experthub\mongo-rs0-test" -Recurse -Force
```

Does NOT affect production MongoDB or any other data.

## Troubleshooting

### Connection Timeout
- Verify MongoDB is running (Terminal 1)
- Check port 27018: `netstat -ano | Select-String 27018`
- Verify data directory is writable

### Replica Set Initialization Failed
- MongoDB must be running with `--replSet rs0`
- Check mongod process output for errors
- Restart and try again

### Tests Failing
- Ensure MongoDB is running and initialized
- Check test database name: `experthub_test`
- Verify transactions are supported: `session.startTransaction()` succeeds

## Next Steps

1. Verify all 10 tests pass
2. Product team reviews booking system
3. Proceed to Phase 4 (Payments)

See `Phase 3 Complete` artifact for full verification report.
