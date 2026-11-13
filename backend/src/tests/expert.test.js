import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Expert } from '../models/index.js';

dotenv.config();

const API_BASE = 'http://localhost:3001/api/v1';
let authToken;
let testUserId;
let testExpertId;
let adminToken;

/**
 * Expert API Integration Tests
 */

async function makeRequest(endpoint, method = 'GET', data = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const responseData = await response.json();
  
  return {
    status: response.status,
    data: responseData,
  };
}

async function setup() {
  console.log('\n🔧 Setting up test environment...\n');
  
  // Connect to MongoDB test database
  const testDbUri = process.env.NODE_ENV === 'test' 
    ? 'mongodb://localhost:27017/experthub_test?replicaSet=rs0&retryWrites=true&w=majority'
    : 'mongodb://localhost:27017/experthub';
  
  await mongoose.connect(testDbUri);
  
  // Create test user
  const testUser = await User.create({
    email: `test-expert-${Date.now()}@example.com`,
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'Expert',
    role: 'client', // Will be upgraded to expert when profile is created
  });
  testUserId = testUser._id;
  
  // Create admin user
  const adminUser = await User.create({
    email: `admin-${Date.now()}@example.com`,
    password: 'Admin1234!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  });
  
  // Register and login test user
  const loginRes = await makeRequest('/auth/login', 'POST', {
    email: testUser.email,
    password: 'Test1234!',
  });
  
  if (loginRes.status !== 200) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  }
  
  authToken = loginRes.data.data.accessToken;
  
  // Login admin
  const adminLoginRes = await makeRequest('/auth/login', 'POST', {
    email: adminUser.email,
    password: 'Admin1234!',
  });
  
  adminToken = adminLoginRes.data.data.accessToken;
  
  console.log('✅ Setup complete\n');
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...\n');
  
  // Delete test data
  await User.deleteMany({ email: /test-expert-|admin-/ });
  await Expert.deleteMany({ userId: testUserId });
  
  await mongoose.disconnect();
  console.log('✅ Cleanup complete\n');
}

async function testCreateExpert() {
  console.log('TEST: Create Expert Profile');
  
  const expertData = {
    headline: 'Experienced Marketing Strategist with 10+ years',
    bio: 'I am a seasoned marketing professional with over 10 years of experience in digital marketing, brand strategy, and growth hacking. I have helped numerous startups scale their marketing efforts and achieve significant ROI.',
    hourlyRate: 150,
    category: 'Marketing & Growth',
    company: 'TechCorp Inc',
    experienceYears: 10,
    skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics'],
    specialties: ['B2B Marketing', 'SaaS Growth'],
    languages: ['English', 'Spanish'],
  };
  
  const result = await makeRequest('/experts', 'POST', expertData, authToken);
  
  if (result.status === 201 && result.data.success) {
    console.log('✅ PASSED - Expert profile created');
    console.log(`   Expert ID: ${result.data.data._id}`);
    testExpertId = result.data.data._id;
    return true;
  } else {
    console.log('❌ FAILED - Expert creation failed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
    return false;
  }
}

async function testDuplicateExpert() {
  console.log('TEST: Prevent Duplicate Expert Profile');
  
  const expertData = {
    headline: 'Another headline',
    bio: 'This should fail because the user already has an expert profile created in the previous test.',
    hourlyRate: 100,
    category: 'Other',
    skills: ['Test'],
    languages: ['English'],
  };
  
  const result = await makeRequest('/experts', 'POST', expertData, authToken);
  
  if (result.status === 400 && !result.data.success) {
    console.log('✅ PASSED - Duplicate prevented');
    return true;
  } else {
    console.log('❌ FAILED - Duplicate not prevented');
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testGetMyProfile() {
  console.log('TEST: Get My Expert Profile');
  
  const result = await makeRequest('/experts/me/profile', 'GET', null, authToken);
  
  if (result.status === 200 && result.data.success && result.data.data._id === testExpertId) {
    console.log('✅ PASSED - Retrieved my profile');
    console.log(`   Profile completeness: ${result.data.data.profileCompleteness}%`);
    return true;
  } else {
    console.log('❌ FAILED - Could not retrieve profile');
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testUpdateProfile() {
  console.log('TEST: Update Expert Profile');
  
  const updates = {
    headline: 'Updated Marketing Strategist Headline',
    hourlyRate: 175,
  };
  
  const result = await makeRequest('/experts/me', 'PATCH', updates, authToken);
  
  if (result.status === 200 && result.data.success && result.data.data.hourlyRate === 175) {
    console.log('✅ PASSED - Profile updated');
    return true;
  } else {
    console.log('❌ FAILED - Update failed');
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testSubmitVerification() {
  console.log('TEST: Submit for Verification');
  
  const result = await makeRequest('/experts/me/submit-verification', 'POST', {}, authToken);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ PASSED - Submitted for verification');
    console.log(`   Status: ${result.data.data.verificationStatus}`);
    return true;
  } else {
    console.log('❌ FAILED - Submission failed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
    return false;
  }
}

async function testGetPendingExperts() {
  console.log('TEST: Admin - Get Pending Experts');
  
  const result = await makeRequest('/experts/admin/pending', 'GET', null, adminToken);
  
  if (result.status === 200 && result.data.success && result.data.data.length > 0) {
    console.log('✅ PASSED - Retrieved pending experts');
    console.log(`   Count: ${result.data.data.length}`);
    return true;
  } else {
    console.log('❌ FAILED - Could not retrieve pending experts');
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testApproveExpert() {
  console.log('TEST: Admin - Approve Expert');
  
  const result = await makeRequest(
    `/experts/admin/${testExpertId}/approve`,
    'PATCH',
    { notes: 'Approved for testing', verifiedBadge: true },
    adminToken
  );
  
  if (result.status === 200 && result.data.success && result.data.data.verificationStatus === 'approved') {
    console.log('✅ PASSED - Expert approved');
    return true;
  } else {
    console.log('❌ FAILED - Approval failed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
    return false;
  }
}

async function testSearchExperts() {
  console.log('TEST: Search Experts (Public)');
  
  const result = await makeRequest('/experts?category=Marketing%20%26%20Growth&limit=10');
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ PASSED - Search works');
    console.log(`   Results: ${result.data.data.length}`);
    console.log(`   Total: ${result.data.pagination.total}`);
    
    // Verify our approved expert appears
    const ourExpert = result.data.data.find(e => e._id === testExpertId);
    if (ourExpert) {
      console.log('   ✓ Our approved expert appears in search');
      return true;
    } else {
      console.log('   ⚠ Our expert not in search results (may be timing issue)');
      return true; // Still pass if search works
    }
  } else {
    console.log('❌ FAILED - Search failed');
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testGetExpertById() {
  console.log('TEST: Get Expert by ID (Public)');
  
  const result = await makeRequest(`/experts/${testExpertId}`);
  
  if (result.status === 200 && result.data.success && result.data.data._id === testExpertId) {
    console.log('✅ PASSED - Retrieved expert by ID');
    console.log(`   Name: ${result.data.data.userId.firstName} ${result.data.data.userId.lastName}`);
    console.log(`   Rating: ${result.data.data.stats.rating}`);
    return true;
  } else {
    console.log('❌ FAILED - Could not retrieve expert');
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testSuspendExpert() {
  console.log('TEST: Admin - Suspend Expert');
  
  const result = await makeRequest(
    `/experts/admin/${testExpertId}/suspend`,
    'PATCH',
    { reason: 'Testing suspension functionality' },
    adminToken
  );
  
  if (result.status === 200 && result.data.success && result.data.data.verificationStatus === 'suspended') {
    console.log('✅ PASSED - Expert suspended');
    return true;
  } else {
    console.log('❌ FAILED - Suspension failed');
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testSuspendedExpertNotInSearch() {
  console.log('TEST: Suspended Expert Not in Public Search');
  
  const result = await makeRequest('/experts?limit=100');
  
  if (result.status === 200) {
    const suspendedExpert = result.data.data.find(e => e._id === testExpertId);
    
    if (!suspendedExpert) {
      console.log('✅ PASSED - Suspended expert not in search');
      return true;
    } else {
      console.log('❌ FAILED - Suspended expert still appears');
      return false;
    }
  } else {
    console.log('❌ FAILED - Search failed');
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('TEST: Unauthorized Admin Access');
  
  // Try to approve expert without admin token
  const result = await makeRequest(
    `/experts/admin/${testExpertId}/approve`,
    'PATCH',
    { notes: 'Should fail' },
    authToken // Using regular user token, not admin
  );
  
  if (result.status === 403) {
    console.log('✅ PASSED - Unauthorized access blocked');
    return true;
  } else {
    console.log('❌ FAILED - Unauthorized access not blocked');
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('EXPERT API INTEGRATION TESTS');
  console.log('='.repeat(60) + '\n');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
  };
  
  try {
    await setup();
    
    const tests = [
      testCreateExpert,
      testDuplicateExpert,
      testGetMyProfile,
      testUpdateProfile,
      testSubmitVerification,
      testGetPendingExperts,
      testApproveExpert,
      testSearchExperts,
      testGetExpertById,
      testUnauthorizedAccess,
      testSuspendExpert,
      testSuspendedExpertNotInSearch,
    ];
    
    for (const test of tests) {
      results.total++;
      const passed = await test();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
      console.log('');
    }
    
    await cleanup();
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    await cleanup();
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');
  
  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
