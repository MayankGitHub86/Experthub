# ExpertHub Startup Instructions

**CRITICAL**: The booking engine requires MongoDB replica set support for atomic transactions.

## Step 1: Configure MongoDB Replica Set

### Windows with MongoDB Service (Recommended)

```powershell
# 1. Stop current MongoDB service
net stop MongoDB

# 2. Edit MongoDB config file
# Path: C:\Program Files\MongoDB\Server\6.0\mongod.cfg
# Add this line to the file:
#
# replication:
#   replSetName: rs0

# 3. Start MongoDB service
net start MongoDB

# 4. Initialize replica set
cd backend
node init-replica-set.js
```

The initialization script will:
- Wait for MongoDB to start with replica set support
- Initialize single-node replica set `rs0`
- Wait for PRIMARY member election
- Confirm transaction capability

### Linux / macOS

```bash
# 1. Start MongoDB with replica set
mongod --replSet rs0 --dbpath /path/to/data &

# 2. In another terminal, initialize replica set
cd backend
node init-replica-set.js
```

### Docker

```bash
docker-compose up -d  # See docs/MONGODB_SETUP.md for compose file
node backend/init-replica-set.js
```

**Verify**:
```bash
node backend/check-mongodb-status.js
# Should show: "set": "rs0", "myState": 1 (PRIMARY)
```

---

## Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## Step 3: Seed Test Data

```bash
cd backend

# Create test experts and services
node seed-experts.js
node seed-services.js

# Verify seeding
echo "Test data created"
```

---

## Step 4: Start Backend

```bash
cd backend
npm run dev

# Expected output:
# ✅ MongoDB connected successfully
# ✅ Server running on port 3001
```

---

## Step 5: Start Frontend

In another terminal:

```bash
cd frontend
npm run dev

# Expected output:
# ➜  Local:   http://localhost:5173/
```

---

## Step 6: Verify Booking Transactions

Run comprehensive transaction tests:

```bash
cd backend

# Full transaction test suite (requires backend running)
node test-booking-transactions.js

# Expected output:
# ✅ TEST 1 PASSED: Hold creation is atomic
# ✅ TEST 2 PASSED: Hold confirmation is atomic
# ✅ TEST 3 PASSED: Concurrent conflicts handled safely
# ✅ TEST 4 PASSED: Cancellation properly releases resources
# ✅ TEST 5 PASSED: Hold expiry prevents stale bookings
# ✅ ALL TRANSACTION TESTS PASSED
```

---

## Step 7: Test Complete Booking Workflow

```bash
cd frontend

# E2E booking workflow test
node test-booking-workflow.js

# Expected output:
# ✓ [1] Registering test user...
# ✓ [2] Logging in...
# ✓ [3] Fetching experts list...
# ✓ [4] Fetching expert services...
# ✓ [5] Fetching availability...
# ✓ [6] Creating booking hold...
# ✓ [7] Confirming booking...
# ✓ [8] Fetching my bookings...
# ✅ COMPLETE BOOKING WORKFLOW TEST PASSED
```

---

## Open Application

Visit: **http://localhost:5173/**

1. Register a new account
2. Browse expert marketplace
3. Select an expert → "Book Now"
4. Select service → date → time
5. Confirm booking
6. View in "My Bookings"

---

## Troubleshooting

### MongoDB Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
- MongoDB is not running
- Start MongoDB with: `mongod --replSet rs0`
- Wait 5-10 seconds for startup

### Replica Set Not Initialized
```
Error: This node was not running with --replSet flag
```
- Stop MongoDB
- Restart with: `mongod --replSet rs0`
- Run: `node backend/init-replica-set.js`

### Transaction Errors
```
Error: This node was not started with replication enabled
```
- Your MongoDB is running in standalone mode
- See Step 1: Configure MongoDB Replica Set
- After restarting, run init script again

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change in `frontend/vite.config.js`

---

## Key Configuration

**Backend** (`backend/.env`):
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173
```

**Why `replicaSet=rs0`?**
- Enables MongoDB transactions
- Required for atomic booking operations
- Prevents double-booking and orphaned reservations

---

## What's Protected

✅ Atomic hold creation  
✅ Atomic booking confirmation  
✅ Atomic cancellation with refunds  
✅ Concurrent booking conflict detection  
✅ Hold expiry with automatic cleanup  
✅ Transaction rollback on failure  
✅ No orphaned reservation units  

---

## Development vs Production

**Development** (Current):
- Single-node replica set
- Sufficient for testing
- All ACID guarantees

**Production**:
- Multi-node replica set (HA)
- With authentication
- Regular backups
- Monitoring
- See `docs/MONGODB_SETUP.md`

---

## Important

**Do NOT:**
- ❌ Use standalone MongoDB
- ❌ Disable replica set connection
- ❌ Skip transaction initialization
- ❌ Use `retryWrites=false` without understanding consequences

**Do:**
- ✅ Initialize replica set before first booking
- ✅ Verify PRIMARY status
- ✅ Run transaction tests
- ✅ Check logs for errors
- ✅ Follow upgrade guide for production

---

For detailed MongoDB setup: `docs/MONGODB_SETUP.md`
For booking architecture: `docs/PHASE_3C_COMPLETION_REPORT.md`

