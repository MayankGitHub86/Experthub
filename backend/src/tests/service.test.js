import mongoose from 'mongoose';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, Expert, Service } from '../models/index.js';

dotenv.config();

const API_BASE = 'http://localhost:3001/api/v1';
let authToken, expertId, serviceId;

async function makeRequest(endpoint, method = 'GET', data = null, token = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (data && (method === 'POST' || method === 'PATCH')) options.body = JSON.stringify(data);
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const responseData = await response.json();
  return { status: response.status, data: responseData };
}

async function setup() {
  console.log('\n🔧 Setting up...\n');
  const testDbUri = process.env.NODE_ENV === 'test' 
    ? 'mongodb://localhost:27017/experthub_test?replicaSet=rs0&retryWrites=true&w=majority'
    : 'mongodb://localhost:27017/experthub';
  
  await mongoose.connect(testDbUri);
  
  const user = await User.create({
    email: `test-service-${Date.now()}@example.com`,
    password: 'Test1234!',
    firstName: 'Service',
    lastName: 'Test',
    role: 'expert',
  });
  
  const expert = await Expert.create({
    userId: user._id,
    headline: 'Test Expert for Services',
    bio: 'Testing service creation with this expert profile that has enough content to pass validation requirements.',
    hourlyRate: 100,
    category: 'Technology & Engineering',
    skills: ['Testing'],
    languages: ['English'],
    verificationStatus: 'approved',
    profilePublic: true,
    acceptingBookings: true,
  });
  expertId = expert._id;
  
  const loginRes = await makeRequest('/auth/login', 'POST', { email: user.email, password: 'Test1234!' });
  authToken = loginRes.data.data.accessToken;
  console.log('✅ Setup complete\n');
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...\n');
  await User.deleteMany({ email: /test-service-/ });
  await Expert.deleteMany({ _id: expertId });
  await Service.deleteMany({ expertId });
  await mongoose.disconnect();
  console.log('✅ Cleanup complete\n');
}

async function testCreateService() {
  console.log('TEST: Create Service');
  
  const serviceData = {
    title: 'Software Architecture Consultation',
    description: 'Get expert guidance on software architecture decisions. I will help you design scalable systems.',
    category: 'technology-consulting',
    tags: ['architecture', 'software', 'consultation'],
    pricing: { type: 'hourly', amount: 150, currency: 'USD' },
    duration: 60,
    maxBookingsPerDay: 5,
    cancellationPolicy: 'moderate',
    cancellationHours: 24,
  };
  
  const result = await makeRequest('/services', 'POST', serviceData, authToken);
  
  if (result.status === 201 && result.data.success) {
    console.log('✅ PASSED - Service created');
    console.log(`   Service ID: ${result.data.data._id}`);
    serviceId = result.data.data._id;
    return true;
  } else {
    console.log('❌ FAILED');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
    return false;
  }
}

async function testGetMyServices() {
  console.log('TEST: Get My Services');
  
  const result = await makeRequest('/services/me/all', 'GET', null, authToken);
  
  if (result.status === 200 && result.data.success && result.data.data.length > 0) {
    console.log('✅ PASSED - Retrieved services');
    console.log(`   Count: ${result.data.data.length}`);
    return true;
  } else {
    console.log('❌ FAILED');
    return false;
  }
}

async function testUpdateService() {
  console.log('TEST: Update Service');
  
  const updates = { title: 'Updated Architecture Consultation', pricing: { type: 'hourly', amount: 175 } };
  const result = await makeRequest(`/services/${serviceId}`, 'PATCH', updates, authToken);
  
  if (result.status === 200 && result.data.success && result.data.data.pricing.amount === 175) {
    console.log('✅ PASSED - Service updated');
    return true;
  } else {
    console.log('❌ FAILED');
    return false;
  }
}

async function testActivateService() {
  console.log('TEST: Activate Service');
  
  const result = await makeRequest(`/services/${serviceId}/activate`, 'PATCH', {}, authToken);
  
  if (result.status === 200 && result.data.success && result.data.data.isActive) {
    console.log('✅ PASSED - Service activated');
    return true;
  } else {
    console.log('❌ FAILED');
    return false;
  }
}

async function testSearchServices() {
  console.log('TEST: Search Services (Public)');
  
  const result = await makeRequest('/services?category=technology-consulting&limit=10');
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ PASSED - Search works');
    console.log(`   Results: ${result.data.data.length}`);
    
    const ourService = result.data.data.find(s => s._id === serviceId);
    if (ourService) {
      console.log('   ✓ Our service appears in search');
    }
    return true;
  } else {
    console.log('❌ FAILED');
    return false;
  }
}

async function testGetServiceById() {
  console.log('TEST: Get Service by ID');
  
  const result = await makeRequest(`/services/${serviceId}`);
  
  if (result.status === 200 && result.data.success && result.data.data._id === serviceId) {
    console.log('✅ PASSED - Retrieved service');
    console.log(`   Title: ${result.data.data.title}`);
    return true;
  } else {
    console.log('❌ FAILED');
    return false;
  }
}

async function testGetExpertServices() {
  console.log('TEST: Get Expert Services');
  
  const result = await makeRequest(`/services/expert/${expertId}`);
  
  if (result.status === 200 && result.data.success && result.data.data.length > 0) {
    console.log('✅ PASSED - Retrieved expert services');
    console.log(`   Count: ${result.data.data.length}`);
    return true;
  } else {
    console.log('❌ FAILED');
    return false;
  }
}

async function testDeactivateService() {
  console.log('TEST: Deactivate Service');
  
  const result = await makeRequest(`/services/${serviceId}/deactivate`, 'PATCH', {}, authToken);
  
  if (result.status === 200 && result.data.success && !result.data.data.isActive) {
    console.log('✅ PASSED - Service deactivated');
    return true;
  } else {
    console.log('❌ FAILED');
    return false;
  }
}

async function testDeactivatedNotInSearch() {
  console.log('TEST: Deactivated Service Not in Public Search');
  
  const result = await makeRequest('/services?limit=100');
  
  if (result.status === 200) {
    const deactivatedService = result.data.data.find(s => s._id === serviceId);
    
    if (!deactivatedService) {
      console.log('✅ PASSED - Deactivated service not in search');
      return true;
    } else {
      console.log('❌ FAILED - Still appears in search');
      return false;
    }
  }
  return false;
}

async function testDeleteService() {
  console.log('TEST: Delete Service');
  
  const result = await makeRequest(`/services/${serviceId}`, 'DELETE', null, authToken);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ PASSED - Service deleted');
    return true;
  } else {
    console.log('❌ FAILED');
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('SERVICE API INTEGRATION TESTS');
  console.log('='.repeat(60) + '\n');
  
  const results = { passed: 0, failed: 0, total: 0 };
  
  try {
    await setup();
    
    const tests = [
      testCreateService,
      testGetMyServices,
      testUpdateService,
      testActivateService,
      testSearchServices,
      testGetServiceById,
      testGetExpertServices,
      testDeactivateService,
      testDeactivatedNotInSearch,
      testDeleteService,
    ];
    
    for (const test of tests) {
      results.total++;
      const passed = await test();
      if (passed) results.passed++; else results.failed++;
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
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
