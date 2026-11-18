# Payment Flow Test Guide

## Test Steps:

### 1. Start Frontend
```bash
cd frontend
npm run dev
```
Open: http://localhost:5173

### 2. Complete Booking Flow
- You should see the landing page
- Click "Explore App" or the app loads in authenticated state
- Click "Customers" tab to see expert marketplace
- Click "Book" on any expert
- BookingModal opens - **CHECK BROWSER CONSOLE FOR LOGS**
- Select a service
- Click "Next" → Select date and time
- Click "Next" → "Create Hold"
- You should see a hold confirmation with countdown
- Click "Confirm Booking"
- You should see "Booking Confirmed!" with "Proceed to Payment" button
- **CHECK BROWSER CONSOLE**: Should show:
  - 🔵 handleProceedPayment called
  - 🟢 App.jsx handleProceedToPayment called with: {bookingData}
  - 🔴 StripeCheckoutModal: Mounted with bookingDetails: {bookingData}

### 3. Verify StripeCheckoutModal Opens
- After clicking "Proceed to Payment", StripeCheckoutModal should appear
- **CHECK BROWSER CONSOLE**: Should show:
  - 🔄 StripeCheckoutModal: Mounting, initializing Stripe...
  - ✅ Stripe initialized successfully
  - 💳 StripeCheckoutModal: Creating payment intent
  - 📞 Calling paymentsAPI.createIntent...
  - ✅ PaymentIntent created: pi_dev_...

### 4. Backend Payment Intent Creation
- Open DevTools Network tab
- Should see POST request to: `http://localhost:3001/api/v1/payments/create-intent`
- Request body should include:
  ```json
  {
    "bookingId": "booking-...",
    "amount": <total_in_cents>,
    "currency": "USD"
  }
  ```
- Response should include:
  ```json
  {
    "success": true,
    "message": "Payment intent created successfully",
    "data": {
      "clientSecret": "pi_dev_secret_...",
      "paymentIntentId": "pi_dev_...",
      "amount": <total_in_cents>,
      "currency": "usd",
      "status": "requires_payment_method"
    }
  }
  ```

## Expected Outcome:

✅ BookingModal displays "Proceed to Payment" button after step 4
✅ Clicking button logs to console: 🔵 handleProceedPayment called
✅ StripeCheckoutModal appears with payment form
✅ Stripe is initialized successfully
✅ PaymentIntent is created from backend
✅ No 401 Unauthorized errors (dev mock token handles auth)

## If Things Don't Work:

1. **"Proceed to Payment" button doesn't appear**
   - Check that you reached step 4 (Booking Confirmed)
   - Check that `confirmedBooking` state is set
   - Check browser console for errors

2. **StripeCheckoutModal doesn't appear after clicking button**
   - Check App.jsx handleProceedToPayment is called
   - Check that checkoutTarget state is being set
   - Verify StripeCheckoutModal is receiving bookingDetails prop

3. **Stripe initialization fails**
   - Check VITE_STRIPE_PUBLISHABLE_KEY in .env
   - Should start with `pk_test_`
   - Check browser console for Stripe errors

4. **PaymentIntent creation fails with 401**
   - Check that dev mock token is being sent: `dev_mock_token_`
   - Check backend authentication middleware logs
   - Ensure backend is in development mode

5. **Network request shows 500 error**
   - Check backend logs in terminal
   - Verify payment service mock data is working
   - Check that bookingId format is correct: `booking-...`
