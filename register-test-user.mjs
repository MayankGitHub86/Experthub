#!/usr/bin/env node

import axios from 'axios';

const API_BASE = 'http://localhost:3001';

async function register() {
  const email = `payment-test-${Date.now()}@test.com`;
  const password = 'TestPassword123!';
  
  try {
    console.log(`📝 Registering test user: ${email}`);
    
    const response = await axios.post(`${API_BASE}/api/v1/auth/register`, {
      email,
      password,
      firstName: 'Payment',
      lastName: 'Tester',
      role: 'client',
    });
    
    if (response.data.success) {
      console.log('✅ User registered!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   User ID: ${response.data.data.user._id}`);
      
      // Now login
      const loginResponse = await axios.post(`${API_BASE}/api/v1/auth/login`, {
        email,
        password,
      });
      
      if (loginResponse.data.success) {
        console.log('\n✅ Login successful!');
        console.log(`   Token: ${loginResponse.data.data.token.substring(0, 20)}...`);
        return { email, password, token: loginResponse.data.data.token, userId: response.data.data.user._id };
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
  
  return null;
}

const result = await register();
if (result) {
  console.log('\n✨ Test user ready for payment testing');
  console.log(`export TEST_CLIENT_EMAIL="${result.email}"`);
  console.log(`export TEST_CLIENT_PASSWORD="${result.password}"`);
  console.log(`export TEST_CLIENT_TOKEN="${result.token}"`);
  console.log(`export TEST_CLIENT_ID="${result.userId}"`);
}
