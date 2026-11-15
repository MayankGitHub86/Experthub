/**
 * Payment Controllers
 * 
 * HTTP endpoints for payment operations
 */

import paymentService from './payment.service.js';
import { createPaymentIntentSchema, refundPaymentSchema } from './payment.validation.js';

/**
 * @route   POST /api/v1/payments/create-intent
 * @desc    Create payment intent for booking
 * @access  Private (Client making payment)
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    // Validate request
    const { error, value } = createPaymentIntentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const { bookingId, amount, currency } = value;
    const clientId = req.user.id;

    // Create payment intent
    const paymentIntent = await paymentService.createPaymentIntent(
      bookingId,
      clientId,
      amount,
      currency
    );

    // Update booking status to payment_pending
    // (Note: This should happen BEFORE showing payment UI to client)

    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/payments/:paymentIntentId/status
 * @desc    Get payment status
 * @access  Private (Client or expert)
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.params;

    const status = await paymentService.getPaymentStatus(paymentIntentId);

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/payments/:bookingId/refund
 * @desc    Refund a payment
 * @access  Private (Admin or expert if eligible)
 */
export const refundPayment = async (req, res, next) => {
  try {
    // Validate request
    const { error, value } = refundPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const { bookingId } = req.params;
    const { amount, reason } = value;

    // Check authorization: admin can refund anything, expert can refund own bookings
    if (req.user.role !== 'admin') {
      // Non-admin: cannot refund
      return res.status(403).json({
        success: false,
        message: 'Only admins can process refunds'
      });
    }

    // Process refund
    const result = await paymentService.refundPayment(
      bookingId,
      amount ? amount * 100 : null, // Convert dollars to cents
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: result.refund.id,
        amount: result.refund.amount / 100,
        status: result.refund.status,
        booking: result.booking,
        transaction: result.transaction
      }
    });
  } catch (error) {
    next(error);
  }
};
