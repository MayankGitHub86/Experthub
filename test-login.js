// Simple test script to verify login flow works correctly
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testLoginFlow() {
  console.log('=== Testing Login Flow ===\n');

  // Step 1: Register a test user
  console.log('1. Registering test user...');
  const registerRes = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testlogin@example.com',
      password: 'TestLogin123',
      firstName: 'Test',
      lastName: 'Login',
      role: 'client'
    })
  });
  const registerData = await registerRes.json();
  console.log('Register response:', registerData.status, '\n');

  // Step 2: Login with the user
  console.log('2. Logging in...');
  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testlogin@example.com',
      password: 'TestLogin123'
    })
  });
  const loginData = await loginRes.json();
  console.log('Login response status:', loginData.status);
  
  if (loginData.status === 'success' && loginData.data) {
    console.log('✓ User:', loginData.data.user.email);
    console.log('✓ Has accessToken:', !!loginData.data.accessToken);
    console.log('✓ Has refreshToken:', !!loginData.data.refreshToken);
    console.log('\n=== Test PASSED ===');
  } else {
    console.log('✗ Login failed:', loginData);
  }
}

testLoginFlow().catch(err => console.error('Error:', err));
