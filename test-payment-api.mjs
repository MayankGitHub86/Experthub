#!/usr/bin/env node

/**
 * Test Payment API Directly
 * Reproduce the exact error from the browser
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';

async function testPaymentAPI() {
  console.log('=== Testing Payment API ===\n');

  try {
    // First, verify backend is responding
    console.log('1. Testing backend health...');
    const health = await axios.get('http://localhost:3001/health', { timeout: 5000 });
    console.log('✓ Backend responsive:', health.data.status);

    // Test CORS preflight (OPTIONS)
    console.log('\n2. Testing CORS preflight...');
    const preflightConfig = {
      method: 'OPTIONS',
      url: `${API_BASE}/payments/create-intent`,
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
      timeout: 5000
    };
    
    const preflight = await axios(preflightConfig).catch(err => {
      console.log('⚠️  Preflight response:', err.response?.status, err.response?.statusText);
      console.log('   Headers:', {
        'Access-Control-Allow-Origin': err.response?.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': err.response?.headers['access-control-allow-methods'],
      });
      return err.response;
    });

    // Test actual POST without auth (will fail, but shows connection)
    console.log('\n3. Testing POST to /payments/create-intent (no auth)...');
    try {
      const response = await axios.post(
        `${API_BASE}/payments/create-intent`,
        {
          bookingId: 'test-id',
          amount: 22885,
          currency: 'USD'
        },
        {
          headers: {
            'Origin': 'http://localhost:5173',
            'Content-Type': 'application/json',
          },
          timeout: 5000,
          withCredentials: true
        }
      );
      console.log('Response:', response.data);
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.log('✗ Connection refused - backend not accepting on 3001');
      } else if (err.code === 'ERR_BAD_RESPONSE') {
        console.log('Response received but with error:');
        console.log('  Status:', err.response?.status);
        console.log('  Data:', err.response?.data);
      } else {
        console.log('Error type:', err.code || err.message);
        console.log('Details:', err.message);
      }
    }

    console.log('\n=== Test Complete ===');
  } catch (err) {
    console.error('Fatal test error:', err.message);
    process.exit(1);
  }
}

testPaymentAPI();
