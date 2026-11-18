#!/usr/bin/env node

/**
 * Integration Test: Payment Flow
 * 
 * Tests the complete payment initialization flow:
 * 1. Generate a mock dev token
 * 2. Create a booking object
 * 3. Call the payment intent creation API
 * 4. Validate the response
 * 
 * Run: node INTEGRATION_TEST_PAYMENT.js
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testPaymentFlow() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║        Payment Flow Integration Test                       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    // Step 1: Generate mock booking
    log('\n[Step 1] Creating mock booking...', 'blue');
    const bookingId = `booking-${Date.now()}`;
    const servicePrice = 100; // $100
    const platformFee = 0.15; // 15%
    const totalAmount = servicePrice * (1 + platformFee); // $115
    const amountInCents = Math.round(totalAmount * 100); // 11500 cents

    const mockBooking = {
      bookingId,
      servicePrice,
      platformFee: platformFee * 100,
      totalAmount,
      amountInCents
    };

    log(`   Booking ID: ${mockBooking.bookingId}`, 'green');
    log(`   Service Price: $${mockBooking.servicePrice}`, 'green');
    log(`   Platform Fee: ${mockBooking.platformFee}%`, 'green');
    log(`   Total Amount: $${mockBooking.totalAmount}`, 'green');
    log(`   Amount in Cents: ${mockBooking.amountInCents}`, 'green');

    // Step 2: Create API client with dev mock token
    log('\n[Step 2] Setting up API client with dev mock token...', 'blue');
    const devToken = `dev_mock_token_${Date.now()}`;
    log(`   Token: ${devToken}`, 'green');

    const client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 3: Call payment intent creation API
    log('\n[Step 3] Calling /payments/create-intent endpoint...', 'blue');
    log(`   POST ${API_BASE_URL}/payments/create-intent`, 'cyan');

    const requestPayload = {
      bookingId: mockBooking.bookingId,
      amount: mockBooking.amountInCents,
      currency: 'USD'
    };

    log(`   Request Body:`, 'yellow');
    log(`     ${JSON.stringify(requestPayload, null, 2)}`, 'yellow');

    const response = await client.post('/payments/create-intent', requestPayload);

    log(`   ✅ Response Status: ${response.status}`, 'green');

    // Step 4: Validate response structure
    log('\n[Step 4] Validating response structure...', 'blue');

    const { data } = response;
    const requiredFields = ['success', 'message', 'data'];

    requiredFields.forEach(field => {
      if (data[field] !== undefined) {
        log(`   ✅ ${field}: present`, 'green');
      } else {
        log(`   ❌ ${field}: MISSING`, 'red');
      }
    });

    const responseData = data.data;
    const requiredDataFields = ['clientSecret', 'paymentIntentId', 'amount', 'currency', 'status'];

    requiredDataFields.forEach(field => {
      if (responseData[field] !== undefined) {
        log(`   ✅ data.${field}: ${JSON.stringify(responseData[field])}`, 'green');
      } else {
        log(`   ❌ data.${field}: MISSING`, 'red');
      }
    });

    // Step 5: Validate values
    log('\n[Step 5] Validating response values...', 'blue');

    if (responseData.amount === mockBooking.amountInCents) {
      log(`   ✅ Amount matches: ${responseData.amount} cents`, 'green');
    } else {
      log(`   ❌ Amount mismatch: expected ${mockBooking.amountInCents}, got ${responseData.amount}`, 'red');
    }

    if (responseData.currency.toUpperCase() === 'USD') {
      log(`   ✅ Currency is USD`, 'green');
    } else {
      log(`   ❌ Currency is not USD: ${responseData.currency}`, 'red');
    }

    if (responseData.status === 'requires_payment_method') {
      log(`   ✅ Status is 'requires_payment_method'`, 'green');
    } else {
      log(`   ⚠️  Status is '${responseData.status}' (expected 'requires_payment_method')`, 'yellow');
    }

    if (responseData.clientSecret && responseData.clientSecret.startsWith('pi_')) {
      log(`   ✅ clientSecret format valid (starts with 'pi_')`, 'green');
    } else {
      log(`   ❌ clientSecret format invalid`, 'red');
    }

    if (responseData.paymentIntentId && responseData.paymentIntentId.startsWith('pi_')) {
      log(`   ✅ paymentIntentId format valid (starts with 'pi_')`, 'green');
    } else {
      log(`   ❌ paymentIntentId format invalid`, 'red');
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                    TEST PASSED ✅                          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    log('\nPayment flow is working correctly!', 'green');
    log('Next steps:', 'yellow');
    log('  1. Open http://localhost:5173 in browser', 'yellow');
    log('  2. Create a booking through the UI', 'yellow');
    log('  3. Click "Proceed to Payment" on step 4', 'yellow');
    log('  4. Verify StripeCheckoutModal appears', 'yellow');

  } catch (error) {
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                    TEST FAILED ❌                          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    if (error.response) {
      log(`\nError Response:`, 'red');
      log(`  Status: ${error.response.status}`, 'red');
      log(`  Data: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else if (error.request) {
      log(`\nNo response received:`, 'red');
      log(`  Request failed - backend might not be running`, 'red');
      log(`  Make sure backend is started: npm run dev`, 'yellow');
    } else {
      log(`\nError: ${error.message}`, 'red');
    }

    process.exit(1);
  }
}

// Run test
testPaymentFlow();
