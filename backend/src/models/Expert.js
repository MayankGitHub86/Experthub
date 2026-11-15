import mongoose from 'mongoose';

/**
 * Expert Model
 * 
 * Represents expert profiles with verification, services, and availability
 */

const expertSchema = new mongoose.Schema({
  // Reference to User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  
  // Profile Information
  headline: {
    type: String,
    required: [true, 'Headline is required'],
    trim: true,
    maxlength: [200, 'Headline cannot exceed 200 characters'],
  },
  
  bio: {
    type: String,
    required: [true, 'Bio is required'],
    trim: true,
    minlength: [100, 'Bio must be at least 100 characters'],
    maxlength: [2000, 'Bio cannot exceed 2000 characters'],
  },
  
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [10, 'Hourly rate must be at least $10'],
    max: [1000, 'Hourly rate cannot exceed $1000'],
  },
  
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
  },
  
  experienceYears: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    max: [70, 'Experience cannot exceed 70 years'],
  },
  
  // Skills and Specialties
  skills: [{
    type: String,
    trim: true,
  }],
  
  specialties: [{
    type: String,
    trim: true,
  }],
  
  languages: [{
    type: String,
    trim: true,
  }],
  
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Business & Strategy',
      'Marketing & Growth',
      'Product & Design',
      'Technology & Engineering',
      'Finance & Investing',
      'Leadership & HR',
      'Legal & Compliance',
      'Other',
    ],
    index: true,
  },
  
  // Verification
  verificationStatus: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended'],
    default: 'draft',
    required: true,
    index: true,
  },
  
  verificationSubmittedAt: {
    type: Date,
  },
  
  verificationReviewedAt: {
    type: Date,
  },
  
  verificationReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  verificationNotes: {
    type: String,
    maxlength: [500, 'Verification notes cannot exceed 500 characters'],
  },
  
  verifiedBadge: {
    type: Boolean,
    default: false,
  },
  
  // Documents (for verification)
  documents: [{
    type: {
      type: String,
      enum: ['id', 'resume', 'certification', 'portfolio', 'other'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Stripe Integration
  stripeAccountId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  
  stripeOnboardingComplete: {
    type: Boolean,
    default: false,
  },
  
  stripePayoutsEnabled: {
    type: Boolean,
    default: false,
  },
  
  // Stripe Accounts v2 capabilities (checked before payment)
  stripeAccountCapabilities: {
    card_payments: {
      type: String,
      enum: ['active', 'inactive', 'unrequested', 'pending_verification'],
      default: 'unrequested',
    },
    payouts: {
      type: String,
      enum: ['active', 'inactive', 'unrequested', 'pending_verification'],
      default: 'unrequested',
    },
    transfers: {
      type: String,
      enum: ['active', 'inactive', 'unrequested', 'pending_verification'],
      default: 'unrequested',
    },
  },
  
  // Stripe charges enabled (legacy flag, prefer stripeAccountCapabilities.card_payments)
  stripeChargesEnabled: {
    type: Boolean,
    default: false,
  },
  
  // Availability Settings
  availability: {
    timezone: {
      type: String,
      default: 'UTC',
    },
    
    // Weekly recurring schedule
    weeklySchedule: {
      monday: [{
        start: String,    // "09:00"
        end: String,      // "17:00"
      }],
      tuesday: [{
        start: String,
        end: String,
      }],
      wednesday: [{
        start: String,
        end: String,
      }],
      thursday: [{
        start: String,
        end: String,
      }],
      friday: [{
        start: String,
        end: String,
      }],
      saturday: [{
        start: String,
        end: String,
      }],
      sunday: [{
        start: String,
        end: String,
      }],
    },
    
    // Date-specific exceptions
    exceptions: [{
      date: Date,
      available: Boolean,
      slots: [{
        start: String,
        end: String,
      }],
    }],
    
    // Booking settings
    bufferMinutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 120,
    },
    
    minNoticeHours: {
      type: Number,
      default: 2,
      min: 0,
      max: 168, // 1 week
    },
    
    maxAdvanceDays: {
      type: Number,
      default: 90,
      min: 1,
      max: 365,
    },
  },
  
  // Statistics (denormalized for performance)
  stats: {
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    completedSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    cancelledSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },
    
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    responseTime: {
      type: String,
      default: 'Within 24 hours',
    },
  },
  
  // Calendar Integration
  googleCalendar: {
    accessToken: {
      type: String,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  
  // Profile Settings
  profilePublic: {
    type: Boolean,
    default: true,
  },
  
  acceptingBookings: {
    type: Boolean,
    default: true,
  },
  
  // Featured/Promoted
  featured: {
    type: Boolean,
    default: false,
  },
  
  featuredUntil: {
    type: Date,
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Don't expose sensitive calendar tokens
      delete ret.googleCalendar?.accessToken;
      delete ret.googleCalendar?.refreshToken;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
  },
});

// Indexes
expertSchema.index({ userId: 1, verificationStatus: 1 });
expertSchema.index({ category: 1, verificationStatus: 1 });
expertSchema.index({ 'stats.rating': -1, verificationStatus: 1 });
expertSchema.index({ hourlyRate: 1, verificationStatus: 1 });
expertSchema.index({ skills: 1 });
expertSchema.index({ specialties: 1 });
expertSchema.index({ createdAt: -1 });

// Text search index
expertSchema.index({
  headline: 'text',
  bio: 'text',
  skills: 'text',
  specialties: 'text',
  company: 'text',
});

// Virtual for user (populated)
expertSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for services
expertSchema.virtual('services', {
  ref: 'Service',
  localField: '_id',
  foreignField: 'expertId',
});

// Virtual for completion rate
expertSchema.virtual('completionRate').get(function() {
  if (this.stats.totalSessions === 0) return 0;
  return Math.round((this.stats.completedSessions / this.stats.totalSessions) * 100);
});

// Virtual for cancellation rate
expertSchema.virtual('cancellationRate').get(function() {
  if (this.stats.totalSessions === 0) return 0;
  return Math.round((this.stats.cancelledSessions / this.stats.totalSessions) * 100);
});

// Static method to find approved experts
expertSchema.statics.findApproved = function(filter = {}) {
  return this.find({
    ...filter,
    verificationStatus: 'approved',
    profilePublic: true,
    acceptingBookings: true,
  });
};

// Static method to search experts
expertSchema.statics.search = function(query, options = {}) {
  const {
    category,
    minRate,
    maxRate,
    minRating,
    skills,
    page = 1,
    limit = 20,
    sortBy = 'rating',
  } = options;
  
  const filter = {
    verificationStatus: 'approved',
    profilePublic: true,
  };
  
  // Text search
  if (query) {
    filter.$text = { $search: query };
  }
  
  // Category filter
  if (category) {
    filter.category = category;
  }
  
  // Rate range
  if (minRate || maxRate) {
    filter.hourlyRate = {};
    if (minRate) filter.hourlyRate.$gte = minRate;
    if (maxRate) filter.hourlyRate.$lte = maxRate;
  }
  
  // Rating filter
  if (minRating) {
    filter['stats.rating'] = { $gte: minRating };
  }
  
  // Skills filter
  if (skills && skills.length > 0) {
    filter.skills = { $in: skills };
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
  
  return this.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'name email avatar');
};

// Method to update statistics
expertSchema.methods.updateStats = async function(updates) {
  Object.keys(updates).forEach(key => {
    if (this.stats[key] !== undefined) {
      this.stats[key] = updates[key];
    }
  });
  return this.save();
};

// Method to submit for verification
expertSchema.methods.submitForVerification = async function() {
  if (this.verificationStatus !== 'draft') {
    throw new Error('Expert profile already submitted');
  }
  
  this.verificationStatus = 'submitted';
  this.verificationSubmittedAt = Date.now();
  return this.save();
};

const Expert = mongoose.model('Expert', expertSchema);

export default Expert;
