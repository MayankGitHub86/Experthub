/**
 * Payment Controllers
 * 
 * HTTP endpoints for payment operations
 */

import paymentService from './payment.service.js';
import { createPaymentIntentSchema, refundPaymentSchema } from './payment.validation.js';
import Transaction from '../../models/Transaction.js';
import Booking from '../../models/Booking.js';

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

/**
 * @route   GET /api/v1/payments
 * @desc    List all payments with filtering and pagination (admin only)
 * @access  Private (Admin)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * @query   status - Filter by status (pending, completed, failed, refunded)
 * @query   search - Search by PaymentIntent ID, Booking ID, client name, expert name
 * @query   startDate - Filter by date range start (ISO 8601)
 * @query   endDate - Filter by date range end (ISO 8601)
 * @query   sortBy - Sort field (createdAt, completedAt, amount) default: createdAt
 * @query   sortOrder - Sort order (asc, desc) default: desc
 */
export const listPayments = async (req, res, next) => {
  try {
    // Parse query parameters
    let { page = 1, limit = 20, status, search, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    
    // Build query
    const query = {
      type: 'booking_payment' // Only list booking payments, not internal transfers/fees
    };

    // Status filter
    if (status && ['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Search filter - find bookings first if needed
    let bookingIds = null;
    if (search) {
      const searchLower = search.toLowerCase();
      
      // Search for matching payment intent IDs
      const paymentSearch = { $or: [] };
      if (search.match(/^pi_/)) {
        paymentSearch.$or.push({ 'gateway.paymentIntentId': search });
      }
      
      // Search for matching bookings (by ID or number) and their related payments
      const bookings = await Booking.find({
        $or: [
          { _id: { $regex: search, $options: 'i' } },
          { bookingNumber: { $regex: search, $options: 'i' } },
          { 'clientId.firstName': { $regex: search, $options: 'i' } },
          { 'clientId.lastName': { $regex: search, $options: 'i' } },
          { 'expertId.firstName': { $regex: search, $options: 'i' } },
          { 'expertId.lastName': { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      
      bookingIds = bookings.map(b => b._id);
      
      if (paymentSearch.$or.length > 0) {
        query.$or = [
          ...paymentSearch.$or,
          { bookingId: { $in: bookingIds } }
        ];
      } else if (bookingIds.length > 0) {
        query.bookingId = { $in: bookingIds };
      } else {
        // No matches found
        return res.status(200).json({
          success: true,
          data: {
            payments: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          }
        });
      }
    }

    // Count total
    const total = await Transaction.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Validate sorting
    const validSortFields = ['createdAt', 'completedAt', 'amount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute query with sorting, pagination, and population
    const transactions = await Transaction.find(query)
      .sort({ [sortField]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('fromUserId toUserId', 'firstName lastName email role')
      .populate('bookingId', 'bookingNumber scheduledAt clientId expertId')
      .lean();

    // Enrich transactions with booking and user details for display
    const enrichedPayments = transactions.map(txn => {
      const booking = txn.bookingId || {};
      const fromUser = txn.fromUserId || {};
      const toUser = txn.toUserId || {};
      
      return {
        id: txn._id.toString(),
        paymentIntentId: txn.gateway?.paymentIntentId,
        chargeId: txn.gateway?.chargeId,
        refundId: txn.gateway?.refundId,
        bookingId: txn.bookingId?._id.toString() || booking._id,
        bookingNumber: booking.bookingNumber,
        clientId: txn.fromUserId?._id.toString() || fromUser._id,
        clientName: `${fromUser.firstName || 'Unknown'} ${fromUser.lastName || ''}`.trim(),
        clientEmail: fromUser.email,
        expertId: txn.toUserId?._id.toString() || toUser._id,
        expertName: `${toUser.firstName || 'Unknown'} ${toUser.lastName || ''}`.trim(),
        expertEmail: toUser.email,
        amount: txn.amount,
        currency: txn.currency,
        platformFee: txn.fees?.platformFee || 0,
        expertPayout: txn.netAmount,
        status: txn.status,
        refundStatus: txn.refund?.refundedAmount ? (txn.refund.refundedAmount === txn.amount ? 'full' : 'partial') : null,
        refundAmount: txn.refund?.refundedAmount,
        description: txn.description,
        createdAt: txn.createdAt,
        completedAt: txn.completedAt,
        refundedAt: txn.refund?.refundedAt
      };
    });

    res.status(200).json({
      success: true,
      data: {
        payments: enrichedPayments,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
