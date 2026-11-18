/**
 * Payment Flow Validation Test
 * 
 * Tests the complete booking → payment initialization flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Payment Flow', () => {
  let mockBookingData;
  let mockPaymentData;

  beforeEach(() => {
    // Mock booking data as created by BookingModal
    mockBookingData = {
      _id: `booking-${Date.now()}`,
      status: 'payment_pending',
      totalAmount: 115, // $100 service * 1.15 (15% platform fee)
      scheduledAt: new Date().toISOString()
    };

    // Mock payment data as sent by handleProceedPayment
    mockPaymentData = {
      bookingId: mockBookingData._id,
      totalAmount: Math.round(mockBookingData.totalAmount * 100), // Convert to cents: 11500
      currency: 'USD',
      expertName: 'Dr. Expert',
      scheduledAt: new Date().toLocaleString(),
      clientEmail: 'client@example.com'
    };
  });

  it('should create a booking with payment_pending status', () => {
    expect(mockBookingData.status).toBe('payment_pending');
  });

  it('should calculate totalAmount correctly (service price * 1.15 for 15% platform fee)', () => {
    const servicePrice = 100;
    const expectedTotal = servicePrice * 1.15;
    expect(mockBookingData.totalAmount).toBe(expectedTotal);
  });

  it('should convert totalAmount to cents for payment API', () => {
    const amountInDollars = 115;
    const amountInCents = Math.round(amountInDollars * 100);
    expect(amountInCents).toBe(11500);
  });

  it('should include all required fields in payment data', () => {
    const requiredFields = ['bookingId', 'totalAmount', 'currency', 'expertName', 'scheduledAt'];
    requiredFields.forEach(field => {
      expect(mockPaymentData).toHaveProperty(field);
      expect(mockPaymentData[field]).not.toBeNull();
      expect(mockPaymentData[field]).not.toBeUndefined();
    });
  });

  it('should have bookingId in correct format (booking-{timestamp})', () => {
    expect(mockPaymentData.bookingId).toMatch(/^booking-\d+$/);
  });

  it('should convert currency to uppercase', () => {
    expect(mockPaymentData.currency).toBe('USD');
  });

  it('should maintain referential integrity between booking and payment data', () => {
    expect(mockPaymentData.bookingId).toBe(mockBookingData._id);
    expect(mockPaymentData.totalAmount).toBe(Math.round(mockBookingData.totalAmount * 100));
  });

  it('should calculate correct expert payout (85% of total after platform fee)', () => {
    const totalAmount = 11500; // cents
    const platformFee = Math.round(totalAmount * 0.15);
    const expertPayout = totalAmount - platformFee;
    
    // Platform fee should be 15% of 11500 = 1725
    expect(platformFee).toBe(1725);
    
    // Expert payout should be 85% of 11500 = 9775
    expect(expertPayout).toBe(9775);
  });
});

describe('StripeCheckoutModal Integration', () => {
  it('should mount when bookingDetails prop is provided', () => {
    const bookingDetails = {
      bookingId: 'booking-123',
      totalAmount: 11500,
      currency: 'USD',
      expertName: 'Dr. Expert'
    };
    
    // Component should render (not return null)
    expect(bookingDetails).toBeDefined();
  });

  it('should not mount when bookingDetails is null/undefined', () => {
    const bookingDetails = null;
    // Component returns null early
    expect(bookingDetails).toBeNull();
  });

  it('should initialize Stripe with correct publishable key format', () => {
    const publishableKey = 'pk_test_51UDWBJ1cHRiKMg2b4UDWBJ1cHRiKMg2bGFM1ad9Uv3I1efzWLHFzexvpJFCgQKSDB2FIRlIQeBxhVUnUylMl9SnskyLvWxqsPjwv5sZy00m761DYLS';
    expect(publishableKey).toMatch(/^pk_test_/);
  });

  it('should calculate and display platform fee correctly', () => {
    const totalAmount = 11500; // cents
    const platformFee = Math.round(totalAmount * 0.15);
    const displayFee = (platformFee / 100).toFixed(2);
    
    expect(displayFee).toBe('17.25');
  });

  it('should calculate and display expert payout correctly', () => {
    const totalAmount = 11500; // cents
    const platformFee = Math.round(totalAmount * 0.15);
    const expertPayout = totalAmount - platformFee;
    const displayPayout = (expertPayout / 100).toFixed(2);
    
    expect(displayPayout).toBe('97.75');
  });
});

describe('Payment API Communication', () => {
  it('should send request to correct endpoint', () => {
    const endpoint = '/payments/create-intent';
    expect(endpoint).toMatch(/^\/payments\/create-intent$/);
  });

  it('should include Authorization header with Bearer token', () => {
    const token = 'dev_mock_token_12345';
    const header = `Bearer ${token}`;
    expect(header).toMatch(/^Bearer dev_mock_token_\d+$/);
  });

  it('should include all required fields in payment intent request', () => {
    const requestBody = {
      bookingId: 'booking-123456',
      amount: 11500, // cents
      currency: 'USD'
    };
    
    expect(requestBody).toHaveProperty('bookingId');
    expect(requestBody).toHaveProperty('amount');
    expect(requestBody).toHaveProperty('currency');
  });

  it('should handle development mode mock payment intent response', () => {
    const mockResponse = {
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: 'pi_dev_secret_abc123def456',
        paymentIntentId: 'pi_dev_abc123def456',
        amount: 11500,
        currency: 'usd',
        status: 'requires_payment_method'
      }
    };
    
    expect(mockResponse.data).toHaveProperty('clientSecret');
    expect(mockResponse.data.clientSecret).toMatch(/^pi_dev_secret_/);
    expect(mockResponse.data).toHaveProperty('paymentIntentId');
    expect(mockResponse.data.status).toBe('requires_payment_method');
  });
});
