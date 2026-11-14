# MongoDB Replica Set Configuration for ExpertHub

## Why Replica Set?

ExpertHub's booking engine requires **ACID transactions** for atomic reservation allocation. MongoDB transactions require a replica set (or sharded cluster).

- **Single-node replica set**: Sufficient for development and single-server deployments
- **Multi-node replica set**: For production high availability
- **Standalone mode**: NOT supported for booking operations

---

## Development Setup (Windows)

### Step 1: Stop the Current MongoDB Instance

If MongoDB is running as a service:

```powershell
net stop MongoDB
```

Or if running as a standalone process, close the terminal window.

### Step 2: Reconfigure MongoDB with Replica Set Support

**Option A: Using Windows Service (Recommended)**

1. Find the MongoDB service configuration:
   ```powershell
   sc query MongoDB
   ```

2. Edit the registry key or service startup parameters to include `--replSet rs0`:
   ```powershell
   # Edit: HKLM\SYSTEM\CurrentControlSet\Services\MongoDB
   # In the ImagePath, append: --replSet rs0
   ```

   Or modify the config file at: `C:\Program Files\MongoDB\Server\<VERSION>\mongod.cfg`
   
   Add this line:
   ```yaml
   replication:
     replSetName: rs0
   ```

3. Restart the MongoDB service:
   ```powershell
   net start MongoDB
   ```

**Option B: Manual Start (No Service)**

1. Stop any existing MongoDB instances.

2. Start MongoDB with replica set:
   ```bash
   mongod --replSet rs0 --dbpath "C:\data\db"
   ```

### Step 3: Initialize the Replica Set

Once MongoDB is running with `--replSet rs0`, run the initialization script:

```bash
cd backend
node init-replica-set.js
```

This script:
- Connects to MongoDB
- Checks if replica set is already initialized
- Initializes single-node replica set `rs0` if needed
- Waits for the member to become PRIMARY
- Confirms successful setup

**Expected output:**
```
Connected to MongoDB
Replica Set Status:
{
  set: 'rs0',
  myState: 1,
  members: [ ... ],
  ... PRIMARY member state ...
}
Replica set is ready!
```

### Step 4: Verify the Setup

```bash
node check-mongodb-status.js
```

Should output:
```
Connected to MongoDB
Replica Set Status:
{
  "set": "rs0",
  "myState": 1,  # 1 = PRIMARY
  ...
}
```

---

## Production Setup (Linux/Docker)

### Docker Compose Example

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    command: mongod --replSet rs0 --bind_ip localhost,mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo_data:
```

Start:
```bash
docker-compose up -d
```

Initialize replica set inside the container:
```bash
docker-compose exec mongodb mongosh --eval "rs.initiate({
  _id: 'rs0',
  members: [{_id: 0, host: 'localhost:27017'}]
})"
```

### Manual Linux Setup

```bash
# Start MongoDB with replica set
mongod --replSet rs0 --dbpath /var/lib/mongodb

# In another terminal, initialize replica set
mongosh --eval "rs.initiate({
  _id: 'rs0',
  members: [{_id: 0, host: 'localhost:27017'}]
})"
```

---

## Connection String Format

**Development (Single-node replica set):**
```
mongodb://localhost:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority
```

**Production (With authentication):**
```
mongodb://admin:password@mongodb:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority
```

**Standalone (NOT supported for booking):**
```
mongodb://localhost:27017/experthub
```

---

## Verification Commands

### Check if replSet is enabled

```bash
node check-mongodb-status.js
```

### Check replica set status

```bash
mongosh --eval "rs.status()"
```

### Initialize if not yet initialized

```bash
mongosh --eval "rs.initiate({
  _id: 'rs0',
  members: [{_id: 0, host: 'localhost:27017'}]
})"
```

### Wait for PRIMARY state

```bash
mongosh --eval "
let count = 0;
while (count < 60) {
  const status = rs.status();
  if (status.members && status.members[0].state === 1) {
    print('PRIMARY state confirmed');
    break;
  }
  print('Waiting for PRIMARY... (attempt ' + (count+1) + ')');
  sleep(1000);
  count++;
}
"
```

---

## Troubleshooting

### Error: "This node was not started with replication enabled"

**Cause**: MongoDB is running standalone, not with `--replSet rs0`

**Solution**:
1. Stop MongoDB
2. Restart with `--replSet rs0` flag
3. Run init-replica-set.js

### Error: "The node already has an oplog, but it does not have a replset config"

**Cause**: Previous standalone mongod created an oplog but no replica set config

**Solution**:
1. Delete the existing MongoDB data directory
2. Delete `/data/db` (or configured dbpath)
3. Restart MongoDB with `--replSet rs0`
4. Initialize the replica set

### Error: "connect ECONNREFUSED 127.0.0.1:27017"

**Cause**: MongoDB is not running

**Solution**:
1. Start MongoDB: `mongod --replSet rs0`
2. Wait 5-10 seconds for it to start
3. Run the check script

### Transactions still failing with "retryable writes not supported"

**Cause**: Connection string doesn't include replica set parameter

**Solution**:
- Ensure connection string includes: `?replicaSet=rs0`
- Check `.env` file: `MONGODB_URI=mongodb://...?replicaSet=rs0&retryWrites=true&w=majority`

---

## Backend Configuration

The backend automatically:
- Detects replica set availability
- Enables transactions if supported
- Falls back with explicit error if not configured
- Retries on transient WriteConflict errors
- Rolls back partial operations on failure

**Do NOT disable transactions.** If booking operations fail due to missing replica set, fix the infrastructure, don't bypass the safety mechanisms.

---

## Testing Transactional Bookings

Once replica set is confirmed PRIMARY:

```bash
cd backend
node seed-experts.js
node seed-services.js
node test-booking-workflow.js
```

Expected output:
```
✓ [1] Registering test user...
✓ [2] Logging in...
✓ [3] Fetching experts list...
✓ [4] Fetching expert services...
✓ [5] Fetching availability...
✓ [6] Creating booking hold...
✓ [7] Confirming booking...
✓ [8] Fetching my bookings...
✅ COMPLETE BOOKING WORKFLOW TEST PASSED
```

---

## Important Notes

1. **Development**: Single-node replica set is fine
2. **Production**: Use multi-node replica set for HA
3. **Never use standalone MongoDB** for booking operations
4. **Transaction rollback** prevents orphaned reservation units
5. **Unique indexes** on ReservationUnits prevent double-booking even if application crashes mid-transaction

---

## Environment Variables

Ensure `.env` contains:

```env
MONGODB_URI=mongodb://localhost:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority
NODE_ENV=development
```

For production, use authentication:

```env
MONGODB_URI=mongodb://user:pass@mongo.example.com:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority
NODE_ENV=production
```

