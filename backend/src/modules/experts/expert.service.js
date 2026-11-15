import { Expert } from '../../models/index.js';
import { User } from '../../models/index.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Expert Service
 * Business logic for expert profile management
 */

class ExpertService {
  /**
   * Create expert profile
   */
  async createExpert(userId, expertData) {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Only allow client role to create expert profile (application workflow)
    // If user is already expert, they're trying to create a second profile
    if (user.role === 'expert') {
      throw new AppError('User already has an expert profile', 400);
    }
    
    // Don't allow admin to create expert profiles for themselves
    if (user.role === 'admin') {
      throw new AppError('Admin users cannot create expert profiles', 400);
    }
    
    // Check if expert profile already exists
    const existingExpert = await Expert.findOne({ userId });
    if (existingExpert) {
      throw new AppError('Expert profile already exists', 400);
    }
    
    // Create expert profile
    const expert = await Expert.create({
      userId,
      ...expertData,
      verificationStatus: 'draft',
      stats: {
        totalEarnings: 0,
        totalSessions: 0,
        completedSessions: 0,
        cancelledSessions: 0,
        rating: 0,
        reviewCount: 0,
      },
    });
    
    // Promote user role from client to expert
    user.role = 'expert';
    await user.save();
    
    // Populate user data
    await expert.populate('userId', 'firstName lastName email profilePicture');
    
    return expert;
  }
  
  /**
   * Get expert by ID
   */
  async getExpertById(expertId, includePrivate = false) {
    const query = Expert.findById(expertId).populate('userId', 'firstName lastName email profilePicture timezone');
    
    if (!includePrivate) {
      // Public view - only show approved and public profiles
      query.where({
        verificationStatus: 'approved',
        profilePublic: true,
      });
    }
    
    const expert = await query;
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    return expert;
  }
  
  /**
   * Get expert by user ID
   */
  async getExpertByUserId(userId) {
    const expert = await Expert.findOne({ userId }).populate('userId', 'firstName lastName email profilePicture');
    if (!expert) {
      throw new AppError('Expert profile not found', 404);
    }
    return expert;
  }
  
  /**
   * Update expert profile
   */
  async updateExpert(expertId, userId, updates) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    // Verify ownership
    if (expert.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized to update this profile', 403);
    }
    
    // Don't allow updating verification status directly
    delete updates.verificationStatus;
    delete updates.verificationReviewedBy;
    delete updates.verificationReviewedAt;
    delete updates.stats;
    delete updates.stripeAccountId;
    
    // Update fields
    Object.assign(expert, updates);
    await expert.save();
    
    await expert.populate('userId', 'firstName lastName email profilePicture');
    return expert;
  }
  
  /**
   * Submit expert profile for verification
   */
  async submitForVerification(expertId, userId) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    // Verify ownership
    if (expert.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    // Check if profile is complete enough for verification
    const completeness = this.calculateProfileCompleteness(expert);
    if (completeness < 70) {
      throw new AppError('Profile must be at least 70% complete to submit for verification', 400);
    }
    
    if (expert.verificationStatus !== 'draft' && expert.verificationStatus !== 'rejected') {
      throw new AppError('Expert profile already submitted or approved', 400);
    }
    
    expert.verificationStatus = 'submitted';
    expert.verificationSubmittedAt = new Date();
    await expert.save();
    
    return expert;
  }
  
  /**
   * Search and filter experts
   */
  async searchExperts(filters) {
    const {
      query = '',
      category,
      minRate,
      maxRate,
      minRating,
      skills,
      page = 1,
      limit = 20,
      sortBy = 'rating',
    } = filters;
    
    const mongoQuery = {
      verificationStatus: 'approved',
      profilePublic: true,
      acceptingBookings: true,
    };
    
    // Text search
    if (query) {
      mongoQuery.$text = { $search: query };
    }
    
    // Category filter
    if (category) {
      mongoQuery.category = category;
    }
    
    // Rate range
    if (minRate !== undefined || maxRate !== undefined) {
      mongoQuery.hourlyRate = {};
      if (minRate !== undefined) mongoQuery.hourlyRate.$gte = minRate;
      if (maxRate !== undefined) mongoQuery.hourlyRate.$lte = maxRate;
    }
    
    // Rating filter
    if (minRating !== undefined) {
      mongoQuery['stats.rating'] = { $gte: minRating };
    }
    
    // Skills filter
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      mongoQuery.skills = { $in: skillsArray };
    }
    
    // Sorting
    const sortOptions = {
      rating: { 'stats.rating': -1, 'stats.reviewCount': -1 },
      price_low: { hourlyRate: 1 },
      price_high: { hourlyRate: -1 },
      reviews: { 'stats.reviewCount': -1 },
      newest: { createdAt: -1 },
    };
    
    const sort = sortOptions[sortBy] || sortOptions.rating;
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [experts, total] = await Promise.all([
      Expert.find(mongoQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName profilePicture'),
      Expert.countDocuments(mongoQuery),
    ]);
    
    return {
      experts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Get experts pending verification (Admin only)
   */
  async getPendingExperts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [experts, total] = await Promise.all([
      Expert.find({ verificationStatus: 'submitted' })
        .sort({ verificationSubmittedAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email profilePicture'),
      Expert.countDocuments({ verificationStatus: 'submitted' }),
    ]);
    
    return {
      experts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Approve expert (Admin only)
   */
  async approveExpert(expertId, adminId, notes, verifiedBadge = true) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (expert.verificationStatus !== 'submitted' && expert.verificationStatus !== 'under_review') {
      throw new AppError('Expert is not pending verification', 400);
    }
    
    expert.verificationStatus = 'approved';
    expert.verificationReviewedAt = new Date();
    expert.verificationReviewedBy = adminId;
    expert.verificationNotes = notes || '';
    expert.verifiedBadge = verifiedBadge;
    expert.profilePublic = true;
    expert.acceptingBookings = true;
    
    await expert.save();
    await expert.populate('userId', 'firstName lastName email');
    
    return expert;
  }
  
  /**
   * Reject expert (Admin only)
   */
  async rejectExpert(expertId, adminId, notes) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (expert.verificationStatus !== 'submitted' && expert.verificationStatus !== 'under_review') {
      throw new AppError('Expert is not pending verification', 400);
    }
    
    expert.verificationStatus = 'rejected';
    expert.verificationReviewedAt = new Date();
    expert.verificationReviewedBy = adminId;
    expert.verificationNotes = notes;
    expert.profilePublic = false;
    
    await expert.save();
    await expert.populate('userId', 'firstName lastName email');
    
    return expert;
  }
  
  /**
   * Suspend expert (Admin only)
   */
  async suspendExpert(expertId, adminId, reason) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (expert.verificationStatus === 'suspended') {
      throw new AppError('Expert is already suspended', 400);
    }
    
    expert.verificationStatus = 'suspended';
    expert.verificationNotes = reason;
    expert.profilePublic = false;
    expert.acceptingBookings = false;
    
    await expert.save();
    
    // Also suspend the user account
    const user = await User.findById(expert.userId);
    if (user) {
      user.status = 'suspended';
      user.suspendedReason = reason;
      user.suspendedAt = new Date();
      await user.save();
    }
    
    await expert.populate('userId', 'firstName lastName email');
    return expert;
  }
  
  /**
   * Reactivate suspended expert (Admin only)
   */
  async reactivateExpert(expertId, adminId) {
    const expert = await Expert.findById(expertId);
    
    if (!expert) {
      throw new AppError('Expert not found', 404);
    }
    
    if (expert.verificationStatus !== 'suspended') {
      throw new AppError('Expert is not suspended', 400);
    }
    
    expert.verificationStatus = 'approved';
    expert.profilePublic = true;
    expert.acceptingBookings = true;
    expert.verificationNotes = '';
    
    await expert.save();
    
    // Also reactivate the user account
    const user = await User.findById(expert.userId);
    if (user && user.status === 'suspended') {
      user.status = 'active';
      user.suspendedReason = null;
      user.suspendedAt = null;
      await user.save();
    }
    
    await expert.populate('userId', 'firstName lastName email');
    return expert;
  }
  
  /**
   * Calculate profile completeness percentage
   */
  calculateProfileCompleteness(expert) {
    const fields = [
      expert.headline,
      expert.bio,
      expert.hourlyRate,
      expert.category,
      expert.skills && expert.skills.length > 0,
      expert.languages && expert.languages.length > 0,
      expert.experienceYears !== null && expert.experienceYears !== undefined,
      expert.company,
      expert.specialties && expert.specialties.length > 0,
      expert.availability && expert.availability.timezone,
    ];
    
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  }
  
  /**
   * Get featured experts
   */
  async getFeaturedExperts(limit = 10) {
    const experts = await Expert.find({
      verificationStatus: 'approved',
      profilePublic: true,
      acceptingBookings: true,
      featured: true,
      featuredUntil: { $gt: new Date() },
    })
      .sort({ 'stats.rating': -1, 'stats.reviewCount': -1 })
      .limit(limit)
      .populate('userId', 'firstName lastName profilePicture');
    
    return experts;
  }
  
  /**
   * Get top-rated experts
   */
  async getTopRatedExperts(limit = 10) {
    const experts = await Expert.find({
      verificationStatus: 'approved',
      profilePublic: true,
      acceptingBookings: true,
      'stats.reviewCount': { $gte: 5 }, // At least 5 reviews
    })
      .sort({ 'stats.rating': -1, 'stats.reviewCount': -1 })
      .limit(limit)
      .populate('userId', 'firstName lastName profilePicture');
    
    return experts;
  }
}

export default new ExpertService();
