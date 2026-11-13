import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Transaction Identifier
  transactionNumber: {
    type: String,
    unique: true,
    index: true
  },

  // Parties
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Related Entities
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    index: true
  },

  // Transaction Type
  type: {
    type: String,
    enum: [
      'booking_payment',      // Client pays for booking
      'expert_payout',        // Platform pays expert
      'refund',              // Refund to client
      'platform_fee',        // Platform commission
      'withdrawal',          // Expert withdraws earnings
      'deposit',             // Add funds to wallet
      'adjustment',          // Manual adjustment
      'bonus',              // Bonus/promotion credit
      'penalty'             // Penalty deduction
    ],
    required: true,
    index: true
  },

  // Amount Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },

  // Fee Breakdown
  fees: {
    platformFee: {
      type: Number,
      default: 0
    },
    paymentProcessingFee: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    }
  },

  // Net Amount (amount after fees)
  netAmount: {
    type: Number,
    required: true
  },

  // Status
  status: {
    type: String,
    enum: [
      'pending',           // Initiated but not processed
      'processing',        // Being processed
      'completed',         // Successfully completed
      'failed',           // Failed
      'cancelled',        // Cancelled
      'on_hold',          // On hold for review
      'disputed',         // Under dispute
      'refunded'          // Refunded
    ],
    default: 'pending',
    required: true,
    index: true
  },

  // Payment Gateway Details
  gateway: {
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer', 'wallet', 'manual', 'other'],
      default: 'stripe'
    },
    transactionId: String,        // Gateway transaction ID
    paymentIntentId: String,      // Stripe Payment Intent
    chargeId: String,             // Stripe Charge ID
    transferId: String,           // Stripe Transfer ID
    payoutId: String,             // Stripe Payout ID
    refundId: String,             // Stripe Refund ID
    paymentMethod: {
      type: {
        type: String,
        enum: ['card', 'bank_account', 'wallet', 'cash', 'other']
      },
      last4: String,
      brand: String,
      expiryMonth: Number,
      expiryYear: Number
    }
  },

  // Description
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  internalNotes: {
    type: String,
    maxlength: 1000
  },

  // Dates
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  refundedAt: Date,

  // Failure Details
  failureReason: String,
  failureCode: String,

  // Refund Details
  refund: {
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    reason: String,
    refundedAmount: Number,
    refundedAt: Date
  },

  // Balance Impact
  balanceImpact: {
    fromUserBefore: Number,
    fromUserAfter: Number,
    toUserBefore: Number,
    toUserAfter: Number
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile_app', 'api', 'admin', 'system']
    },
    idempotencyKey: String  // Prevent duplicate transactions
  },

  // Reconciliation
  reconciliation: {
    isReconciled: {
      type: Boolean,
      default: false
    },
    reconciledAt: Date,
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    discrepancy: Number,
    notes: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
transactionSchema.index({ transactionNumber: 1 }, { unique: true });
transactionSchema.index({ fromUserId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ toUserId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ type: 1, status: 1, createdAt: -1 });
transactionSchema.index({ 'gateway.transactionId': 1 });
transactionSchema.index({ 'gateway.paymentIntentId': 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ 'metadata.idempotencyKey': 1 }, { sparse: true });

// Compound indexes for reporting
transactionSchema.index({ 
  type: 1, 
  status: 1, 
  completedAt: -1 
});

transactionSchema.index({ 
  toUserId: 1, 
  type: 1, 
  status: 1 
});

// Virtual for from user
transactionSchema.virtual('fromUser', {
  ref: 'User',
  localField: 'fromUserId',
  foreignField: '_id',
  justOne: true
});

// Virtual for to user
transactionSchema.virtual('toUser', {
  ref: 'User',
  localField: 'toUserId',
  foreignField: '_id',
  justOne: true
});

// Virtual for booking
transactionSchema.virtual('booking', {
  ref: 'Booking',
  localField: 'bookingId',
  foreignField: '_id',
  justOne: true
});

// Virtual for total fees
transactionSchema.virtual('totalFees').get(function() {
  return this.fees.platformFee + this.fees.paymentProcessingFee + this.fees.tax;
});

// Virtual for is refundable
transactionSchema.virtual('isRefundable').get(function() {
  return this.status === 'completed' && 
         this.type === 'booking_payment' && 
         !this.refund.refundedAt;
});

// Pre-save middleware
transactionSchema.pre('save', async function(next) {
  // Generate transaction number
  if (this.isNew && !this.transactionNumber) {
    const count = await mongoose.model('Transaction').countDocuments();
    this.transactionNumber = `TXN${Date.now()}-${String(count + 1).padStart(8, '0')}`;
  }

  // Calculate net amount
  if (this.isModified('amount') || this.isModified('fees')) {
    this.netAmount = this.amount - this.totalFees;
  }

  // Set completed date
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Set failed date
  if (this.isModified('status') && this.status === 'failed' && !this.failedAt) {
    this.failedAt = new Date();
  }

  next();
});

// Static method: Create booking payment transaction
transactionSchema.statics.createBookingPayment = async function(data) {
  const {
    fromUserId,
    toUserId,
    bookingId,
    amount,
    currency = 'USD',
    platformFeePercentage = 15,
    paymentIntentId,
    paymentMethod
  } = data;

  const platformFee = (amount * platformFeePercentage) / 100;
  const paymentProcessingFee = (amount * 2.9) / 100 + 0.30; // Stripe fees
  const netAmount = amount - platformFee - paymentProcessingFee;

  const transaction = new this({
    fromUserId,
    toUserId,
    bookingId,
    type: 'booking_payment',
    amount,
    currency,
    fees: {
      platformFee,
      paymentProcessingFee,
      tax: 0
    },
    netAmount,
    description: `Payment for booking ${bookingId}`,
    gateway: {
      provider: 'stripe',
      paymentIntentId,
      paymentMethod
    },
    status: 'pending'
  });

  await transaction.save();
  return transaction;
};

// Static method: Create expert payout transaction
transactionSchema.statics.createExpertPayout = async function(data) {
  const {
    toUserId,
    amount,
    currency = 'USD',
    transferId,
    description
  } = data;

  const transaction = new this({
    toUserId,
    type: 'expert_payout',
    amount,
    currency,
    netAmount: amount,
    description: description || `Payout to expert`,
    gateway: {
      provider: 'stripe',
      transferId
    },
    status: 'pending'
  });

  await transaction.save();
  return transaction;
};

// Static method: Create refund transaction
transactionSchema.statics.createRefund = async function(originalTransactionId, amount, reason) {
  const originalTxn = await this.findById(originalTransactionId);
  
  if (!originalTxn) {
    throw new Error('Original transaction not found');
  }

  if (originalTxn.status !== 'completed') {
    throw new Error('Can only refund completed transactions');
  }

  const refundAmount = amount || originalTxn.amount;

  const transaction = new this({
    fromUserId: originalTxn.toUserId,
    toUserId: originalTxn.fromUserId,
    bookingId: originalTxn.bookingId,
    type: 'refund',
    amount: refundAmount,
    currency: originalTxn.currency,
    netAmount: refundAmount,
    description: `Refund for transaction ${originalTxn.transactionNumber}`,
    refund: {
      originalTransactionId,
      reason,
      refundedAmount: refundAmount,
      refundedAt: new Date()
    },
    status: 'pending'
  });

  await transaction.save();
  return transaction;
};

// Static method: Get user transactions
transactionSchema.statics.getUserTransactions = function(userId, options = {}) {
  const {
    type = null,
    status = null,
    limit = 50,
    skip = 0,
    startDate = null,
    endDate = null
  } = options;

  const query = {
    $or: [{ fromUserId: userId }, { toUserId: userId }]
  };

  if (type) {
    query.type = type;
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('fromUserId toUserId', 'firstName lastName email')
    .populate('bookingId', 'bookingNumber scheduledAt');
};

// Static method: Get user balance
transactionSchema.statics.getUserBalance = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        $or: [{ fromUserId: mongoose.Types.ObjectId(userId) }, { toUserId: mongoose.Types.ObjectId(userId) }],
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalReceived: {
          $sum: {
            $cond: [{ $eq: ['$toUserId', mongoose.Types.ObjectId(userId)] }, '$netAmount', 0]
          }
        },
        totalSent: {
          $sum: {
            $cond: [{ $eq: ['$fromUserId', mongoose.Types.ObjectId(userId)] }, '$amount', 0]
          }
        }
      }
    }
  ]);

  if (result.length === 0) {
    return { balance: 0, totalReceived: 0, totalSent: 0 };
  }

  const { totalReceived, totalSent } = result[0];
  return {
    balance: totalReceived - totalSent,
    totalReceived,
    totalSent
  };
};

// Static method: Get earnings report for expert
transactionSchema.statics.getExpertEarnings = async function(expertId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        toUserId: mongoose.Types.ObjectId(expertId),
        type: { $in: ['booking_payment', 'expert_payout'] },
        status: 'completed',
        completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$netAmount' },
        totalBookings: { $sum: 1 },
        averageEarning: { $avg: '$netAmount' },
        totalFees: { $sum: { $add: ['$fees.platformFee', '$fees.paymentProcessingFee'] } }
      }
    }
  ]);

  return result.length > 0 ? result[0] : {
    totalEarnings: 0,
    totalBookings: 0,
    averageEarning: 0,
    totalFees: 0
  };
};

// Static method: Get platform revenue report
transactionSchema.statics.getPlatformRevenue = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        type: 'platform_fee',
        status: 'completed',
        completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  return result.length > 0 ? result[0] : {
    totalRevenue: 0,
    transactionCount: 0
  };
};

// Instance method: Mark as completed
transactionSchema.methods.markCompleted = async function(gatewayData = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  
  if (gatewayData.chargeId) {
    this.gateway.chargeId = gatewayData.chargeId;
  }
  
  if (gatewayData.transferId) {
    this.gateway.transferId = gatewayData.transferId;
  }

  await this.save();
  return this;
};

// Instance method: Mark as failed
transactionSchema.methods.markFailed = async function(reason, code) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  this.failureCode = code;

  await this.save();
  return this;
};

// Instance method: Process refund
transactionSchema.methods.processRefund = async function(refundId) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.gateway.refundId = refundId;

  await this.save();
  return this;
};

// Instance method: Reconcile transaction
transactionSchema.methods.reconcile = async function(userId, notes = '', discrepancy = 0) {
  this.reconciliation.isReconciled = true;
  this.reconciliation.reconciledAt = new Date();
  this.reconciliation.reconciledBy = userId;
  this.reconciliation.notes = notes;
  this.reconciliation.discrepancy = discrepancy;

  await this.save();
  return this;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;

