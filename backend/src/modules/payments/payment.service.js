/**
 * Payment Service
 * 
 * Manages Stripe payment operations including:
 * - Creating payment intents for bookings
 * - Handling refunds
 * - Processing webhook events
 * - Calculating commissions
 */

import stripe from 'stripe';
import config from '../../config/environment.js';
import CommissionCalculator from './commission.calculator.js';
import { AppError } from '../../middleware/errorHandler.js';
import Transaction from '../../models/Transaction.js';
import Booking from '../../models/Booking.js';
import Expert from '../../models/Expert.js';
import User from '../../models/User.js';
import { logger } from '../../utils/logger.js';
import StripeAdapter from '../../utils/stripe.adapter.js';

const stripeClient = new stripe(config.stripe.secretKey);

class PaymentService {
  constructor(stripeAdapter = null) {
    // Allow dependency injection for testing
    this.adapter = stripeAdapter || new StripeAdapter(stripeClient);
  }
  /**
   * Create a Stripe PaymentIntent for a booking
   * 
   * Destination charge model:
   * - Charge full amount to platform account
   * - Application fee: 15% (platform commission)
   * - Transfer: 85% to expert's connected account
   * 
   * @param {string} bookingId - Booking MongoDB ID
   * @param {string} clientId - Client MongoDB ID
   * @param {number} amountCents - Amount in cents
   * @param {string} currency - Currency code (USD, EUR, etc.)
   * @returns {object} Stripe PaymentIntent
   * @throws AppError if booking invalid, expert not ready, etc.
   */
  async createPaymentIntent(bookingId, clientId, amountCents, currency = 'USD') {
    // Fetch and validate booking
    const booking = await Booking.findById(bookingId)
      .populate('serviceId')
      .populate('expertId')
      .populate('clientId');

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Verify client is the one paying
    if (booking.clientId._id.toString() !== clientId) {
      throw new AppError('Client mismatch: only the booking client can pay', 403);
    }

    // Verify booking is in correct state for payment
    if (booking.status !== 'confirmed') {
      throw new AppError(
        `Cannot create payment for booking in state: ${booking.status}. Expected: confirmed`,
        400
      );
    }

    // Verify amount matches booking
    // Note: booking.totalAmount is in currency units (e.g., $100.50 USD)
    // We convert to cents: $100.50 * 100 = 10050 cents
    const expectedAmountCents = booking.totalAmount * 100;
    if (amountCents !== expectedAmountCents) {
      throw new AppError(
        `Amount mismatch. Expected: ${expectedAmountCents} cents (${booking.totalAmount} ${currency}), got: ${amountCents} cents`,
        400
      );
    }

    // Verify expert is approved
    const expert = await Expert.findById(booking.expertId);
    if (!expert) {
      throw new AppError('Expert profile not found', 404);
    }

    if (expert.verificationStatus !== 'approved') {
      throw new AppError(
        'Expert is not approved for receiving payments. Payment cannot be processed.',
        403
      );
    }

    // Verify expert has Stripe account
    if (!expert.stripeAccountId) {
      throw new AppError(
        'Expert has not connected their Stripe account. Payment cannot be processed.',
        400
      );
    }

    // Verify expert has card_payments capability enabled (Stripe Accounts v2)
    // This ensures they can receive funds via destination charges
    if (!expert.stripeChargesEnabled) {
      throw new AppError(
        'Expert account is not ready to receive payments. Card payments capability not verified.',
        400
      );
    }

    // For v2: Verify merchant.card_payments capability explicitly
    // (Note: This requires syncing with Stripe; currently only checked via stripeChargesEnabled flag)
    if (!expert.stripeAccountCapabilities || !expert.stripeAccountCapabilities.card_payments) {
      throw new AppError(
        'Expert Stripe account has not enabled card payment capability. Please verify your Stripe account.',
        400
      );
    }

    // Calculate commission split
    const split = CommissionCalculator.calculateSplit(amountCents, currency);

    // Prepare metadata for Stripe and future reconciliation
    const metadata = {
      bookingId: bookingId.toString(),
      clientId: clientId.toString(),
      expertId: booking.expertId._id.toString(),
      serviceId: booking.serviceId._id.toString(),
      platformCommission: split.platformCommission.toString(),
      expertShare: split.expertShare.toString(),
      bookingNumber: booking.bookingNumber || 'pending'
    };

    try {
      // Create payment intent with destination charge using adapter
      // Stripe will:
      // 1. Charge the full amount to platform account
      // 2. Take application fee (15%)
      // 3. Transfer remainder (85%) to expert's connected account
      const paymentIntent = await this.adapter.createPaymentIntent({
        amount: amountCents,
        currency: currency.toLowerCase(),
        
        // Destination charge: transfer to expert's connected account
        transfer_data: {
          destination: expert.stripeAccountId
        },
        
        // Platform application fee: 15%
        application_fee_amount: split.platformCommission,
        
        // Payment method types
        payment_method_types: ['card'],
        
        // Confirm payment in test: can use test cards
        confirm: false,
        return_url: `${config.baseUrl}/bookings/${bookingId}`,
        
        // Metadata for reconciliation
        metadata,
        
        // Idempotency key: prevent duplicate charges on retry
        idempotency_key: `booking_${bookingId}_${Date.now()}`,
        
        // Description for Stripe dashboard
        description: `ExpertHub Booking: ${booking.bookingNumber || bookingId}`,
        
        // Customer: optional, can be used for recurring charges
        customer: await this._getOrCreateStripeCustomer(booking.clientId),
        
        // Statement descriptor for credit card statement
        statement_descriptor: 'EXPERTHUB CONSULTATION'
      });

      logger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        bookingId,
        amount: amountCents,
        expertId: expert._id
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to create payment intent', {
        bookingId,
        error: error.message,
        stripeErrorCode: error.code
      });
      throw new AppError(
        `Failed to create payment: ${error.message}`,
        error.statusCode || 500
      );
    }
  }

  /**
   * Confirm payment from webhook (after client payment)
   * 
   * Called by webhook handler when Stripe confirms payment_intent.succeeded.
   * Processes within a MongoDB transaction for atomicity when session is provided.
   * 
   * @param {object} paymentIntent - Stripe PaymentIntent object
   * @param {ClientSession} session - Optional MongoDB session for transactional operations
   * @returns {object} Updated Transaction and Booking
   */
  async confirmPaymentFromWebhook(paymentIntent, session) {
    const { id: paymentIntentId, metadata, amount, currency, charges } = paymentIntent;

    if (!metadata || !metadata.bookingId) {
      throw new AppError('Payment intent missing metadata with bookingId', 400);
    }

    const { bookingId, clientId, expertId } = metadata;

    // Verify payment is succeeded
    if (paymentIntent.status !== 'succeeded') {
      throw new AppError(
        `Cannot confirm payment with status: ${paymentIntent.status}`,
        400
      );
    }

    // Verify charges array exists and has data
    if (!charges || !charges.data || charges.data.length === 0) {
      throw new AppError('No charges found in payment intent', 400);
    }

    const charge = charges.data[0];
    const chargeId = charge.id;

    // Fetch booking (optionally within transaction)
    let bookingQuery = Booking.findById(bookingId);
    if (session) {
      bookingQuery = bookingQuery.session(session);
    }
    const booking = await bookingQuery;
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Verify booking is in appropriate state (not already paid)
    if (booking.payment?.paidAt) {
      // For true duplicates (same chargeId), this is expected - return existing transaction
      // Check if this is actually a duplicate by matching charge ID
      if (booking.payment.stripeChargeId === chargeId) {
        logger.warn('Duplicate webhook: booking already paid with same charge ID', {
          bookingId,
          paymentIntentId,
          chargeId,
          paidAt: booking.payment.paidAt
        });
        // Return existing transaction
        const existingTransaction = await Transaction.findById(booking.payment.transactionId);
        return {
          transaction: existingTransaction.toObject(),
          booking: booking.toObject(),
          isDuplicate: true
        };
      }

      // If different charge ID but booking already paid, this is an error
      logger.error('Attempted to pay already-paid booking with different charge', {
        bookingId,
        paymentIntentId,
        previousChargeId: booking.payment.stripeChargeId,
        newChargeId: chargeId
      });
      throw new AppError('Booking payment already confirmed', 400);
    }

    // Verify booking status allows payment confirmation
    if (!['payment_pending', 'confirmed'].includes(booking.status)) {
      logger.warn('Payment confirmed for booking in unexpected state', {
        bookingId,
        status: booking.status,
        paymentIntentId
      });
      // Continue anyway; booking may be in other valid states
    }

    // Verify amount matches
    const expectedAmountCents = booking.totalAmount * 100;
    if (amount !== expectedAmountCents) {
      throw new AppError(
        `Payment amount mismatch. Expected: ${expectedAmountCents} cents (${booking.totalAmount} ${currency}), got: ${amount} cents`,
        400
      );
    }

    // Verify currency matches
    if (currency.toUpperCase() !== booking.pricing.currency) {
      throw new AppError(
        `Currency mismatch. Expected: ${booking.pricing.currency}, got: ${currency.toUpperCase()}`,
        400
      );
    }

    // Calculate commission split
    const split = CommissionCalculator.calculateSplit(amount, currency.toUpperCase());

    // Create Transaction record (optionally within transaction)
    const transactionData = [{
      // Parties
      fromUserId: clientId,
      toUserId: expertId,
      
      // Related entities
      bookingId,
      
      // Transaction type
      type: 'booking_payment',
      
      // Amount details
      amount: split.expertShare, // Expert receives 85%
      currency: currency.toUpperCase(),
      netAmount: split.expertShare,
      
      // Fee breakdown
      fees: {
        platformFee: split.platformCommission,
        paymentProcessingFee: charge.amount_captured - charge.net, // Stripe fee
        tax: 0
      },
      
      // Status
      status: 'completed',
      
      // Gateway details
      gateway: {
        provider: 'stripe',
        transactionId: charge.id,
        paymentIntentId,
        chargeId: charge.id,
        paymentMethod: {
          type: charge.payment_method_details.type,
          brand: charge.payment_method_details.card?.brand,
          last4: charge.payment_method_details.card?.last4,
          expiryMonth: charge.payment_method_details.card?.exp_month,
          expiryYear: charge.payment_method_details.card?.exp_year
        }
      },
      
      // Description
      description: `Payment for booking ${booking.bookingNumber || bookingId}`,
      internalNotes: `Platform commission: ${split.platformCommission} cents, Stripe fee: ${charge.amount_captured - charge.net}`,
      
      // Dates
      initiatedAt: new Date(paymentIntent.created * 1000),
      completedAt: new Date()
    }];

    const transactionOptions = session ? { session } : {};
    const transaction = (await Transaction.create(transactionData, transactionOptions))[0];

    // Update booking with payment info
    booking.payment.transactionId = transaction._id;
    booking.payment.stripePaymentIntentId = paymentIntentId;
    booking.payment.stripeChargeId = charge.id;
    booking.payment.paymentMethod = 'card';
    booking.payment.paidAt = new Date();
    booking.status = 'paid';
    
    // Add to status history
    booking.statusHistory.push({
      status: 'paid',
      timestamp: new Date(),
      reason: 'Payment confirmed by Stripe webhook'
    });

    const saveOptions = session ? { session } : {};
    await booking.save(saveOptions);

    logger.info('Payment confirmed', {
      transactionId: transaction._id,
      bookingId,
      paymentIntentId,
      amount
    });

    return {
      transaction: transaction.toObject(),
      booking: booking.toObject()
    };
  }

  /**
   * Refund a payment
   * 
   * For destination charges:
   * - Refund reverses the charge
   * - Automatic reversal of transfer to expert (if within time limit)
   * - Stripe handles the complexity
   * 
   * @param {string} bookingId - Booking ID
   * @param {number} amountCents - Refund amount (null = full refund)
   * @param {string} reason - Refund reason
   * @returns {object} Updated Transaction and Booking
   */
  async refundPayment(bookingId, amountCents = null, reason = 'Customer requested') {
    // Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate('payment.transactionId');

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if booking has a payment
    if (!booking.payment || !booking.payment.stripeChargeId) {
      throw new AppError('Booking has no payment to refund', 400);
    }

    // Check if already refunded
    if (booking.payment.refundedAt) {
      throw new AppError('Booking has already been refunded', 400);
    }

    const chargeId = booking.payment.stripeChargeId;
    const refundAmount = amountCents || booking.totalAmount * 100; // Default: full refund

    try {
      // Create refund via Stripe
      const refund = await stripeClient.refunds.create({
        charge: chargeId,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          bookingId: bookingId.toString(),
          reason
        }
      });

      logger.info('Refund processed', {
        refundId: refund.id,
        chargeId,
        bookingId,
        amount: refundAmount
      });

      // Update booking
      booking.payment.refundedAt = new Date();
      booking.payment.refundAmount = refundAmount / 100;
      booking.payment.refundReason = reason;
      booking.status = 'refunded';

      booking.statusHistory.push({
        status: 'refunded',
        timestamp: new Date(),
        reason: `Refunded ${refundAmount / 100} ${booking.pricing.currency}`
      });

      await booking.save();

      // Create refund transaction record
      const refundTransaction = await Transaction.create({
        fromUserId: booking.expertId,
        toUserId: booking.clientId,
        bookingId,
        type: 'refund',
        amount: refundAmount / 100,
        currency: booking.pricing.currency,
        netAmount: refundAmount / 100,
        status: 'completed',
        gateway: {
          provider: 'stripe',
          transactionId: refund.id,
          refundId: refund.id,
          chargeId: chargeId
        },
        description: `Refund for booking ${booking.bookingNumber || bookingId}`,
        internalNotes: `Reason: ${reason}`,
        completedAt: new Date()
      });

      return {
        refund: refund,
        booking: booking.toObject(),
        transaction: refundTransaction.toObject()
      };
    } catch (error) {
      logger.error('Failed to process refund', {
        bookingId,
        chargeId,
        error: error.message
      });
      throw new AppError(`Failed to process refund: ${error.message}`, 400);
    }
  }

  /**
   * Get or create Stripe Customer for user
   * 
   * @param {object} user - User object with email, name
   * @returns {string} Stripe customer ID
   */
  async _getOrCreateStripeCustomer(user) {
    try {
      // Search for existing customer
      const customers = await stripeClient.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        return customers.data[0].id;
      }

      // Create new customer
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString()
        }
      });

      return customer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer', {
        userId: user._id,
        error: error.message
      });
      // Return null if customer creation fails - payment will still work
      return null;
    }
  }

  /**
   * Get payment status
   * 
   * @param {string} paymentIntentId - Stripe PaymentIntent ID
   * @returns {object} Payment status details
   */
  async getPaymentStatus(paymentIntentId) {
    try {
      const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret,
        requiresAction: paymentIntent.status === 'requires_action',
        succeeded: paymentIntent.status === 'succeeded'
      };
    } catch (error) {
      logger.error('Failed to retrieve payment status', {
        paymentIntentId,
        error: error.message
      });
      throw new AppError(`Failed to retrieve payment status: ${error.message}`, 400);
    }
  }
}

export default new PaymentService();

// Also export the class for testing with dependency injection
export { PaymentService };
