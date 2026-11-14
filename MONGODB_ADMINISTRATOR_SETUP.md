# MongoDB Replica Set Setup — Administrator PowerShell Required

## REQUIRED PERMISSIONS

These operations require an **Administrator PowerShell** terminal.

**You cannot proceed without administrative rights.**

---

## STEP 1: Backup Current MongoDB Configuration

Run in **Administrator PowerShell**:

```powershell
# Create backup of current configuration
Copy-Item `
  "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg" `
  "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg.backup_$(Get-Date -Format yyyyMMdd_HHmmss)"

Write-Output "✓ Configuration backed up"
```

---

## STEP 2: Update MongoDB Configuration for Replica Set

Run in **Administrator PowerShell**:

```powershell
# Read current configuration
$configPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"
$config = Get-Content $configPath -Raw

# Ensure replication section exists (uncomment if needed)
if ($config -notmatch "^replication:") {
    $config = $config -replace "^#replication:", "replication:"
}

# Update the replication section
$newConfig = $config -replace "^replication:.*", "replication:`n  replSetName: rs0"

# Write back
Set-Content -Path $configPath -Value $newConfig -Encoding UTF8

Write-Output "✓ Configuration updated"
Write-Output "`nNew replication setting:"
Select-String "replication:" $configPath -Context 2
```

---

## STEP 3: Restart MongoDB Service

Run in **Administrator PowerShell**:

```powershell
# Stop the service
Restart-Service -Name MongoDB -Force

# Wait for restart
Start-Sleep -Seconds 5

# Verify service is running
$service = Get-Service MongoDB
if ($service.Status -eq "Running") {
    Write-Output "✓ MongoDB service restarted successfully"
    Write-Output "  State: $($service.Status)"
} else {
    Write-Output "❌ MongoDB service failed to start"
    Write-Output "  State: $($service.Status)"
    exit 1
}
```

---

## STEP 4: Initialize Replica Set

After MongoDB service is running, run from project directory:

```bash
# This can run in normal (non-admin) PowerShell
cd backend
node init-replica-set.js
```

Expected output:
```
Connected to MongoDB
Replica Set Status:
{
  "set": "rs0",
  "myState": 1,    # 1 = PRIMARY
  "members": [
    {
      "_id": 0,
      "host": "127.0.0.1:27017",
      "state": 1,   # 1 = PRIMARY
      "stateStr": "PRIMARY"
    }
  ]
}
✓ Replica set is ready!
```

---

## STEP 5: Verify Configuration

After initialization, verify in normal PowerShell:

```bash
cd backend
node check-mongodb-status.js
```

Expected output:
```
Connected to MongoDB
Replica Set Status:
{
  "set": "rs0",
  "myState": 1,
  ...
  "members": [ { "state": 1, "stateStr": "PRIMARY" ... } ]
}
```

---

## STEP 6: Verify Backend Connection

```bash
cd backend
npm run dev

# Should show:
# ✅ MongoDB connected successfully
# Server running on port 3001
```

---

## Current MongoDB Configuration

**Service:** MongoDB  
**State:** Running  
**Binary:** C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe  
**Config File:** C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg  
**Data Path:** C:\Program Files\MongoDB\Server\8.2\data  
**Log File:** C:\Program Files\MongoDB\Server\8.2\log\mongod.log  
**Port:** 27017  
**Bind IP:** 127.0.0.1  

---

## IMPORTANT

- **The configuration changes WILL NOT take effect until the service is restarted.**
- **Service restart requires Administrator PowerShell.**
- **Do NOT delete `C:\Program Files\MongoDB\Server\8.2\data` — that's your database.**
- **Do NOT close MongoDB while tests are running.**
- **The entire configuration file will be preserved except for the replication section.**

---

## Troubleshooting

### Error: "Access Denied" when editing config

- You're not in Administrator PowerShell
- Right-click PowerShell → "Run as Administrator"
- Retry the commands

### Error: "Service restart failed"

- Verify MongoDB isn't locked by an application
- Check Event Viewer for MongoDB service errors
- Ensure `mongod.exe` isn't running twice

### Error: "not running with --replSet"

- MongoDB service didn't restart with new config
- Retry Step 3 in Administrator PowerShell
- Verify `mongod.cfg` has `replication: replSetName: rs0`

---

## After Setup

Once replica set is confirmed PRIMARY:

```bash
cd backend
npm run dev                          # Start backend
node test-booking-transactions.js    # Verify transactions work
```

Then in another terminal:

```bash
cd frontend
npm run dev                          # Start frontend
```

Open http://localhost:5173 and test booking workflow.

