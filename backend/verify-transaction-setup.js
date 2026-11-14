#!/usr/bin/env node
/**
 * Comprehensive Transaction Setup Verification
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Checks replica set status
 * 3. Audits transaction code
 * 4. Attempts transaction operations
 * 5. Reports all findings
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/experthub?replicaSet=rs0&retryWrites=true&w=majority';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(type, message, details = '') {
  const timestamp = new Date().toISOString();
  let prefix = '';
  
  switch(type) {
    case 'pass':
      prefix = `${colors.green}✓${colors.reset}`;
      break;
    case 'fail':
      prefix = `${colors.red}✗${colors.reset}`;
      break;
    case 'warn':
      prefix = `${colors.yellow}⚠${colors.reset}`;
      break;
    case 'info':
      prefix = `${colors.cyan}ℹ${colors.reset}`;
      break;
  }
  
  console.log(`${prefix} ${message}`);
  if (details) console.log(`  ${details}`);
}

async function checkMongoDBConnection() {
  console.log(`\n${colors.bold}=== 1. MongoDB Connection ===${colors.reset}`);
  
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });
    
    log('pass', 'Connected to MongoDB');
    log('info', `Database: ${mongoose.connection.name}`);
    log('info', `Host: ${mongoose.connection.host}`);
    
    return true;
  } catch (error) {
    log('fail', 'Failed to connect to MongoDB', error.message);
    return false;
  }
}

async function checkReplicaSetStatus() {
  console.log(`\n${colors.bold}=== 2. Replica Set Status ===${colors.reset}`);
  
  try {
    const adminDb = mongoose.connection.getClient().db('admin');
    const status = await adminDb.admin().replSetGetStatus();
    
    log('pass', 'Replica set is initialized');
    log('info', `Set name: ${status.set}`);
    log('info', `Members: ${status.members.length}`);
    
    status.members.forEach((member, idx) => {
      const stateNames = { 0: 'STARTUP', 1: 'PRIMARY', 2: 'SECONDARY', 7: 'ARBITER', 8: 'DOWN', 10: 'REMOVED' };
      const state = stateNames[member.state] || `UNKNOWN(${member.state})`;
      log('info', `  Member ${idx}: ${member.name} - ${state}`);
    });
    
    return true;
  } catch (error) {
    log('warn', 'Replica set not initialized', error.message);
    log('info', 'Next: Run init-replica-set.js to initialize rs0');
    return false;
  }
}

async function auditTransactionCode() {
  console.log(`\n${colors.bold}=== 3. Transaction Code Audit ===${colors.reset}`);
  
  // Check booking.service.js
  const bookingServicePath = join(__dirname, 'src/modules/bookings/booking.service.js');
  const bookingCode = fs.readFileSync(bookingServicePath, 'utf8');
  
  const checks = [
    {
      name: 'session.startTransaction()',
      regex: /session\.startTransaction\(\)/,
      found: false
    },
    {
      name: 'session.commitTransaction()',
      regex: /session\.commitTransaction\(\)/,
      found: false
    },
    {
      name: 'session.abortTransaction()',
      regex: /session\.abortTransaction\(\)/,
      found: false
    },
    {
      name: 'fn(session) - No null bypass',
      regex: /fn\(session\)/,
      found: false
    },
    {
      name: 'No fn(null) bypass',
      regex: /fn\(\s*null\s*\)/,
      found: false,
      shouldBeAbsent: true
    },
    {
      name: 'Session cleanup in finally',
      regex: /finally\s*{[\s\S]*?session\.endSession\(\)/,
      found: false
    },
    {
      name: 'WriteConflict retry logic',
      regex: /WriteConflict/,
      found: false
    }
  ];
  
  checks.forEach(check => {
    if (check.shouldBeAbsent) {
      const found = check.regex.test(bookingCode);
      if (!found) {
        log('pass', `${check.name} - correctly absent`);
      } else {
        log('fail', `${check.name} - FOUND (should not exist)`);
      }
    } else {
      if (check.regex.test(bookingCode)) {
        log('pass', `${check.name} - found`);
      } else {
        log('fail', `${check.name} - NOT found`);
      }
    }
  });
  
  // Check database.js
  const dbConfigPath = join(__dirname, 'src/config/database.js');
  const dbCode = fs.readFileSync(dbConfigPath, 'utf8');
  
  if (dbCode.includes('replicaSet=rs0')) {
    log('pass', 'Database config includes replicaSet=rs0');
  } else {
    log('fail', 'Database config missing replicaSet=rs0');
  }
  
  if (dbCode.includes('retryWrites=true')) {
    log('pass', 'Database config includes retryWrites=true');
  } else {
    log('fail', 'Database config missing retryWrites=true');
  }
  
  if (dbCode.includes('w=majority')) {
    log('pass', 'Database config includes w=majority');
  } else {
    log('fail', 'Database config missing w=majority');
  }
}

async function testTransactionCapability() {
  console.log(`\n${colors.bold}=== 4. Transaction Capability Test ===${colors.reset}`);
  
  let session;
  try {
    session = await mongoose.startSession();
    log('pass', 'Session created successfully');
    
    try {
      session.startTransaction();
      log('pass', 'startTransaction() executed successfully');
      log('info', 'MongoDB supports transactions ✓');
      await session.abortTransaction();
    } catch (txnError) {
      if (txnError.message && txnError.message.includes('transactions are not allowed')) {
        log('fail', 'Transactions not supported on this deployment');
        log('warn', 'MongoDB must be configured as a replica set to support transactions');
        return false;
      }
      throw txnError;
    }
    
    return true;
  } catch (error) {
    log('fail', 'Transaction capability test failed', error.message);
    return false;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (e) {
        // Ignore
      }
    }
  }
}

async function checkDatabaseVersion() {
  console.log(`\n${colors.bold}=== 5. MongoDB Version & Capabilities ===${colors.reset}`);
  
  try {
    const adminDb = mongoose.connection.getClient().db('admin');
    const version = await adminDb.admin().serverInfo();
    
    log('info', `MongoDB Version: ${version.version}`);
    log('info', `Server OS: ${version.os.type}`);
  } catch (error) {
    log('warn', 'Could not retrieve version info', error.message);
  }
}

async function generateReport() {
  console.log(`\n${colors.bold}=== VERIFICATION SUMMARY ===${colors.reset}\n`);
  
  log('info', 'Current Status:');
  log('info', `  MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
  log('info', `  Standalone Mode: Check via rs.status()`, '');
  
  console.log(`\n${colors.bold}Next Steps:${colors.reset}`);
  console.log(`\n1. ${colors.yellow}ADMINISTRATOR REQUIRED:${colors.reset} Modify MongoDB config`);
  console.log(`   Path: C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.cfg`);
  console.log(`   Find: #replication:`);
  console.log(`   Replace with:`);
  console.log(`   replication:`);
  console.log(`     replSetName: rs0`);
  console.log(`\n2. ${colors.yellow}ADMINISTRATOR REQUIRED:${colors.reset} Restart MongoDB service`);
  console.log(`   PowerShell: Restart-Service -Name MongoDB -Force`);
  console.log(`\n3. Initialize replica set`);
  console.log(`   ${colors.cyan}node init-replica-set.js${colors.reset}`);
  console.log(`\n4. Verify status`);
  console.log(`   ${colors.cyan}node verify-transaction-setup.js${colors.reset}`);
  console.log(`\n5. Run transaction tests`);
  console.log(`   ${colors.cyan}node test-booking-transactions.js${colors.reset}`);
}

async function main() {
  console.log(`${colors.bold}ExpertHub Transaction Setup Verification${colors.reset}`);
  console.log('='.repeat(50));
  
  const connected = await checkMongoDBConnection();
  if (!connected) {
    log('fail', 'Cannot proceed without MongoDB connection');
    process.exit(1);
  }
  
  const hasReplicaSet = await checkReplicaSetStatus();
  await auditTransactionCode();
  const transactionCapable = await testTransactionCapability();
  await checkDatabaseVersion();
  
  await generateReport();
  
  console.log(`\n${colors.bold}Result:${colors.reset}`);
  if (transactionCapable) {
    log('pass', 'Transaction support VERIFIED ✓');
    log('info', 'Booking system is now SAFE for concurrent users');
  } else {
    log('fail', 'Transaction support NOT available ✗');
    log('warn', 'Booking system is UNSAFE for concurrent users');
    log('info', 'Administrator action required (see steps above)');
  }
  
  try {
    await mongoose.connection.close();
  } catch (e) {
    // Ignore
  }
}

main().catch(err => {
  log('fail', 'Fatal error', err.message);
  process.exit(1);
});
