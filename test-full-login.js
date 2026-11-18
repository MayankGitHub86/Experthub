// Full end-to-end login test
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3001/api/v1';
const UNIQUE_ID = Date.now();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFullLoginFlow() {
  console.log('=== Full E2E Login Test ===\n');

  const testUser = {
    email: `e2e-test-${UNIQUE_ID}@example.com`,
    password: 'E2ETestPassword123',
    firstName: 'E2E',
    lastName: 'Test',
    role: 'client'
  };

  try {
    // Step 1: Register
    console.log('Step 1: Registering new user...');
    const registerRes = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: testUser.role
      })
    });
    
    const registerData = await registerRes.json();
    if (registerData.status !== 'success') {
      console.log('✗ Registration failed:', registerData.message);
      return;
    }
    console.log('✓ Registration successful\n');

    // Step 2: Login
    console.log('Step 2: Logging in with registered user...');
    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    const loginData = await loginRes.json();
    if (loginData.status !== 'success') {
      console.log('✗ Login failed:', loginData.message);
      return;
    }

    const { user, accessToken, refreshToken } = loginData.data;

    // Verify response structure
    console.log('✓ Login successful');
    console.log(`  - User: ${user.email}`);
    console.log(`  - Access Token: ${accessToken.substring(0, 20)}...`);
    console.log(`  - Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'MISSING'}`);
    
    if (!refreshToken) {
      console.log('\n✗ ERROR: refreshToken is missing from login response!');
      return;
    }

    // Step 3: Use access token to get user profile
    console.log('\nStep 3: Verifying access token works...');
    const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const meData = await meRes.json();
    if (meData.status !== 'success') {
      console.log('✗ GET /auth/me failed:', meData.message);
      return;
    }
    
    const profileUser = meData.data.user;
    console.log('✓ Access token is valid');
    console.log(`  - Authenticated user: ${profileUser.email}`);
    console.log(`  - Role: ${profileUser.role}`);

    // Step 4: Verify refresh token endpoint exists
    console.log('\nStep 4: Verifying refresh token endpoint...');
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const refreshData = await refreshRes.json();
    if (refreshData.status !== 'success') {
      console.log('✗ Token refresh failed:', refreshData.message);
      return;
    }
    
    const newAccessToken = refreshData.data.accessToken;
    console.log('✓ Token refresh works');
    console.log(`  - New Access Token: ${newAccessToken.substring(0, 20)}...`);

    console.log('\n=== All Tests PASSED ✓ ===');
    console.log('\nSummary:');
    console.log('1. ✓ User registration works');
    console.log('2. ✓ Login returns user, accessToken, and refreshToken');
    console.log('3. ✓ Access token allows authenticated requests');
    console.log('4. ✓ Refresh token can generate new access tokens');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFullLoginFlow();
