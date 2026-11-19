import { User, Booking, Transaction } from '../../models/index.js';

/**
 * User / Customer Management Controller (Admin)
 */

export const listUsers = async (req, res, next) => {
  try {
    let { page = 1, limit = 20, role = 'client', search, status } = req.query;
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('firstName lastName email role status profilePicture createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Enrich users with booking statistics
    const userIds = users.map(u => u._id);
    const [bookingStats, settledPayments, refunds] = await Promise.all([Booking.aggregate([
      { $match: { clientId: { $in: userIds } } },
      { $group: {
        _id: '$clientId',
        totalBookings: { $sum: 1 },
        completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      } }
    ]), Transaction.aggregate([
      { $match: { fromUserId: { $in: userIds }, type: 'booking_payment', status: 'completed' } },
      { $group: {
        _id: { userId: '$fromUserId', currency: { $toUpper: { $ifNull: ['$currency', 'USD'] } } },
        amountCents: { $sum: { $add: ['$amount', { $ifNull: ['$fees.platformFee', 0] }] } },
      } }
    ]), Transaction.aggregate([
      { $match: { toUserId: { $in: userIds }, type: 'refund', status: 'completed' } },
      { $group: {
        _id: { userId: '$toUserId', currency: { $toUpper: { $ifNull: ['$currency', 'USD'] } } },
        amount: { $sum: '$amount' },
      } }
    ])]);

    const statsMap = new Map();
    bookingStats.forEach((row) => statsMap.set(row._id.toString(), {
      totalBookings: row.totalBookings,
      completedBookings: row.completedBookings,
      cancelledBookings: row.cancelledBookings,
      settledSpendByCurrency: new Map(),
    }));
    settledPayments.forEach((row) => {
      const key = row._id.userId.toString();
      const current = statsMap.get(key) || { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, settledSpendByCurrency: new Map() };
      const currency = row._id.currency || 'USD';
      current.settledSpendByCurrency.set(currency, row.amountCents / 100);
      statsMap.set(key, current);
    });
    refunds.forEach((row) => {
      const key = row._id.userId.toString();
      const current = statsMap.get(key) || { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, settledSpendByCurrency: new Map() };
      const currency = row._id.currency || 'USD';
      current.settledSpendByCurrency.set(currency, Math.max(0, (current.settledSpendByCurrency.get(currency) || 0) - row.amount));
      statsMap.set(key, current);
    });

    const enrichedUsers = users.map(u => {
      const stats = statsMap.get(u._id.toString()) || { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, settledSpendByCurrency: new Map() };
      const settledSpendByCurrency = Array.from(stats.settledSpendByCurrency, ([currency, amount]) => ({ currency, amount }));
      return {
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Client',
        email: u.email,
        role: u.role,
        status: u.status || 'active',
        profilePicture: u.profilePicture,
        totalBookings: stats.totalBookings,
        completedBookings: stats.completedBookings,
        cancelledBookings: stats.cancelledBookings,
        totalSpent: settledSpendByCurrency.length === 1 ? settledSpendByCurrency[0].amount : null,
        settledSpendByCurrency,
        createdAt: u.createdAt
      };
    });

    res.status(200).json({
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('firstName lastName email role status profilePicture createdAt').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const bookings = await Booking.find({ clientId: id })
      .select('_id bookingNumber scheduledAt status totalAmount pricing.currency payment.paidAt serviceId expertId')
      .populate({ path: 'expertId', select: 'headline userId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate('serviceId', 'title')
      .sort({ scheduledAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        user,
        bookings
      }
    });
  } catch (error) {
    next(error);
  }
};
