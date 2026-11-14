#!/usr/bin/env node
/**
 * Real MongoDB Transaction Tests Against rs0
 * 
 * Tests actual multi-document transaction support with:
 * - Session creation
 * - Transaction commit
 * - Transaction rollback
 * - Document persistence verification
 */

import mongoose from 'mongoose';

// Connection to test replica set
const TEST_URI = 'mongodb://127.0.0.1:27018/experthub_test?directConnection=true&retryWrites=true&w=majority';

let testResults = [];

async function test(name, fn) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📝 Test: ${name}`);
  console.log('━'.repeat(60));
  
  try {
    await fn();
    console.log('✅ PASSED');
    testResults.push({ name, status: 'PASS' });
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    testResults.push({ name, status: 'FAIL', error: error.message });
  }
}

async function connectToTestDatabase() {
  console.log('\n🔌 Connecting to test database...');
  
  const options = {
    serverSelectionTimeoutMS: 10000,
    directConnection: true,
  };

  await mongoose.connect(TEST_URI, options);
  console.log(`✓ Connected to database: ${mongoose.connection.name}`);
  console.log(`  Host: ${mongoose.connection.host}`);
}

async function cleanupTestDatabase() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const db = mongoose.connection.getClient().db('experthub_test');
    
    // Drop test collections
    const collections = ['test_docs_a', 'test_docs_b', 'test_transactions'];
    
    for (const collName of collections) {
      try {
        await db.collection(collName).drop();
        console.log(`  ✓ Dropped collection: ${collName}`);
      } catch (e) {
        // Collection doesn't exist yet, that's fine
      }
    }
  } catch (error) {
    console.log(`  ⚠ Cleanup warning: ${error.message}`);
  }
}

async function testSuccessfulTransaction() {
  const db = mongoose.connection.getClient().db('experthub_test');
  const collA = db.collection('test_docs_a');
  const collB = db.collection('test_docs_b');

  // Clean collections
  await collA.deleteMany({});
  await collB.deleteMany({});

  const session = await mongoose.startSession();
  console.log('✓ Session created');

  try {
    session.startTransaction();
    console.log('✓ Transaction started');

    // Insert into first collection
    const docA = { _id: 'test-a-1', type: 'A', value: 100 };
    await collA.insertOne(docA, { session });
    console.log(`✓ Inserted into collection A: ${JSON.stringify(docA)}`);

    // Insert into second collection
    const docB = { _id: 'test-b-1', type: 'B', refToA: 'test-a-1', value: 200 };
    await collB.insertOne(docB, { session });
    console.log(`✓ Inserted into collection B: ${JSON.stringify(docB)}`);

    // Commit transaction
    await session.commitTransaction();
    console.log('✓ Transaction committed');

    // Verify outside transaction
    const foundA = await collA.findOne({ _id: 'test-a-1' });
    const foundB = await collB.findOne({ _id: 'test-b-1' });

    if (!foundA) throw new Error('Document A not persisted!');
    if (!foundB) throw new Error('Document B not persisted!');

    console.log('✓ Both documents persisted and visible after commit');
    console.log(`  A: ${JSON.stringify(foundA)}`);
    console.log(`  B: ${JSON.stringify(foundB)}`);

  } finally {
    await session.endSession();
  }
}

async function testRollbackTransaction() {
  const db = mongoose.connection.getClient().db('experthub_test');
  const collA = db.collection('test_docs_a');
  const collB = db.collection('test_docs_b');

  // Clean collections
  await collA.deleteMany({});
  await collB.deleteMany({});

  const session = await mongoose.startSession();
  console.log('✓ Session created');

  try {
    session.startTransaction();
    console.log('✓ Transaction started');

    // Insert documents
    const docA = { _id: 'test-a-2', type: 'A', value: 300 };
    await collA.insertOne(docA, { session });
    console.log(`✓ Inserted into collection A: ${JSON.stringify(docA)}`);

    const docB = { _id: 'test-b-2', type: 'B', refToA: 'test-a-2', value: 400 };
    await collB.insertOne(docB, { session });
    console.log(`✓ Inserted into collection B: ${JSON.stringify(docB)}`);

    // Deliberately abort transaction
    await session.abortTransaction();
    console.log('✓ Transaction aborted (intentional)');

  } finally {
    await session.endSession();
  }

  // Verify documents are NOT persisted
  const foundA = await collA.findOne({ _id: 'test-a-2' });
  const foundB = await collB.findOne({ _id: 'test-b-2' });

  if (foundA) throw new Error('Document A should not exist after rollback!');
  if (foundB) throw new Error('Document B should not exist after rollback!');

  console.log('✓ No documents persisted after rollback (correct behavior)');
}

async function testPartialFailureRollback() {
  const db = mongoose.connection.getClient().db('experthub_test');
  const collA = db.collection('test_docs_a');
  const collB = db.collection('test_docs_b');

  // Clean collections
  await collA.deleteMany({});
  await collB.deleteMany({});

  const session = await mongoose.startSession();
  console.log('✓ Session created');

  try {
    session.startTransaction();
    console.log('✓ Transaction started');

    // Insert first document successfully
    const docA = { _id: 'test-a-3', type: 'A', value: 500 };
    await collA.insertOne(docA, { session });
    console.log(`✓ Inserted into collection A: ${JSON.stringify(docA)}`);

    // Try to insert duplicate (will fail)
    const dupDocA = { _id: 'test-a-3', type: 'A', value: 999 };
    try {
      await collA.insertOne(dupDocA, { session });
      console.log('✓ Inserted duplicate (unexpected - should have failed)');
    } catch (dupError) {
      console.log(`✓ Duplicate insert failed (expected): ${dupError.message.substring(0, 50)}`);
      throw dupError; // Re-throw to trigger rollback
    }

  } catch (error) {
    await session.abortTransaction();
    console.log(`✓ Transaction aborted due to error: ${error.message.substring(0, 50)}`);
  } finally {
    await session.endSession();
  }

  // Verify first document is also NOT persisted
  const foundA = await collA.findOne({ _id: 'test-a-3' });
  if (foundA) throw new Error('Document A should be rolled back too!');

  console.log('✓ All writes rolled back when transaction failed (correct behavior)');
}

async function testConcurrentTransactions() {
  const db = mongoose.connection.getClient().db('experthub_test');
  const collA = db.collection('test_docs_a');

  // Clean collection
  await collA.deleteMany({});

  console.log('Starting two concurrent transactions...');

  const session1 = await mongoose.startSession();
  const session2 = await mongoose.startSession();

  try {
    // Session 1: Start transaction and insert
    session1.startTransaction();
    await collA.insertOne({ _id: 'concurrent-1', value: 1 }, { session: session1 });
    console.log('✓ Session 1: Inserted document');

    // Session 2: Start transaction and insert different doc
    session2.startTransaction();
    await collA.insertOne({ _id: 'concurrent-2', value: 2 }, { session: session2 });
    console.log('✓ Session 2: Inserted document');

    // Commit both
    await session1.commitTransaction();
    console.log('✓ Session 1: Transaction committed');

    await session2.commitTransaction();
    console.log('✓ Session 2: Transaction committed');

  } finally {
    await session1.endSession();
    await session2.endSession();
  }

  // Verify both documents exist
  const count = await collA.countDocuments({});
  if (count !== 2) throw new Error(`Expected 2 documents, found ${count}`);

  const doc1 = await collA.findOne({ _id: 'concurrent-1' });
  const doc2 = await collA.findOne({ _id: 'concurrent-2' });

  console.log(`✓ Both concurrent transactions committed successfully`);
  console.log(`  Document 1: ${JSON.stringify(doc1)}`);
  console.log(`  Document 2: ${JSON.stringify(doc2)}`);
}

async function testWriteConflictDetection() {
  const db = mongoose.connection.getClient().db('experthub_test');
  const collA = db.collection('test_docs_a');

  // Clean collection
  await collA.deleteMany({});
  
  // Insert initial document
  await collA.insertOne({ _id: 'conflict-1', value: 0 });
  console.log('✓ Initial document inserted');

  const session1 = await mongoose.startSession();
  const session2 = await mongoose.startSession();

  let session2DidFail = false;

  try {
    // Session 1: Start transaction
    session1.startTransaction();
    await collA.updateOne({ _id: 'conflict-1' }, { $set: { value: 100 } }, { session: session1 });
    console.log('✓ Session 1: Updated document in transaction');

    // Session 2: Also try to update (will conflict)
    session2.startTransaction();
    try {
      await collA.updateOne({ _id: 'conflict-1' }, { $set: { value: 200 } }, { session: session2 });
      console.log('✓ Session 2: Updated document (concurrent with Session 1)');
    } catch (conflictError) {
      console.log(`✓ Session 2: Write conflict detected (expected): ${conflictError.codeName || conflictError.message.substring(0, 40)}`);
      session2DidFail = true;
      await session2.abortTransaction();
    }

    // Commit session 1
    await session1.commitTransaction();
    console.log('✓ Session 1: Committed successfully');

  } finally {
    try {
      await session1.endSession();
    } catch (e) {
      // Already closed
    }
    try {
      await session2.endSession();
    } catch (e) {
      // Already closed
    }
  }

  // Verify final value (should be Session 1's value since it committed first)
  const final = await collA.findOne({ _id: 'conflict-1' });
  if (final.value !== 100) throw new Error(`Expected value 100, got ${final.value}`);

  if (!session2DidFail) {
    throw new Error('Session 2 should have detected a write conflict');
  }

  console.log(`✓ Write conflict detection and serialization working correctly`);
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    MongoDB Replica Set Transaction Verification Tests     ║');
  console.log('║               Testing rs0 on port 27018                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Connect
    await connectToTestDatabase();
    
    // Cleanup before tests
    await cleanupTestDatabase();

    // Run tests
    await test('Successful Transaction - Commit', testSuccessfulTransaction);
    await test('Failed Transaction - Rollback', testRollbackTransaction);
    await test('Partial Failure - Complete Rollback', testPartialFailureRollback);
    await test('Concurrent Transactions', testConcurrentTransactions);
    await test('Write Conflict Detection', testWriteConflictDetection);

    // Cleanup after tests
    await cleanupTestDatabase();

    // Close connection
    await mongoose.connection.close();
    console.log('\n✓ Connection closed');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  testResults.forEach((result, idx) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${idx + 1}] ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`       Error: ${result.error}`);
    }
  });

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const total = testResults.length;

  console.log(`\n📊 Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! Transactions are working correctly.\n');
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed.\n`);
    process.exit(1);
  }
}

main();
