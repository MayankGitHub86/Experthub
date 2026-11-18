import { User, Booking } from '../../models/index.js';

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
    const bookingCounts = await Booking.aggregate([
      { $match: { clientId: { $in: userIds } } },
      { $group: { _id: '$clientId', count: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } }
    ]);

    const countMap = new Map();
    bookingCounts.forEach(b => {
      countMap.set(b._id.toString(), { count: b.count, totalSpent: b.totalSpent || 0 });
    });

    const enrichedUsers = users.map(u => {
      const stats = countMap.get(u._id.toString()) || { count: 0, totalSpent: 0 };
      return {
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Client',
        email: u.email,
        role: u.role,
        status: u.status || 'active',
        profilePicture: u.profilePicture,
        totalBookings: stats.count,
        totalSpent: stats.totalSpent,
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
      .populate('expertId', 'title headline')
      .populate('serviceId', 'title pricing')
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
