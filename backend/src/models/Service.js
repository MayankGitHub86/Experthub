import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  // Basic Information
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expert',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },

  // Category & Tags
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'business-consulting',
      'career-coaching',
      'financial-advice',
      'legal-consultation',
      'marketing-strategy',
      'technology-consulting',
      'health-wellness',
      'education-tutoring',
      'creative-services',
      'personal-development',
      'real-estate',
      'other'
    ],
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Pricing
  pricing: {
    type: {
      type: String,
      enum: ['hourly', 'fixed', 'package'],
      required: true,
      default: 'hourly'
    },
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    },
    // For package pricing
    packageDetails: {
      sessionsIncluded: {
        type: Number,
        min: 1
      },
      validityDays: {
        type: Number,
        min: 1
      }
    }
  },

  // Session Details
  duration: {
    type: Number, // in minutes
    required: [true, 'Session duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  deliveryTime: {
    type: Number, // in days for fixed/package services
    min: 1
  },

  // Media
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String, // Cloudinary public ID
    caption: String,
    order: {
      type: Number,
      default: 0
    }
  }],
  videoUrl: {
    type: String,
    trim: true
  },

  // Availability & Booking
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  maxBookingsPerDay: {
    type: Number,
    default: 5,
    min: 1
  },
  bufferTime: {
    type: Number, // minutes between sessions
    default: 15,
    min: 0
  },
  advanceBookingDays: {
    type: Number, // how far in advance can clients book
    default: 30,
    min: 1,
    max: 365
  },
  cancellationPolicy: {
    type: String,
    enum: ['flexible', 'moderate', 'strict'],
    default: 'moderate'
  },
  cancellationHours: {
    type: Number, // minimum hours before session for cancellation
    default: 24,
    min: 0
  },

  // Requirements & Prerequisites
  requirements: {
    preparationNeeded: {
      type: String,
      trim: true,
      maxlength: 500
    },
    documentsNeeded: [{
      type: String,
      trim: true
    }],
    prerequisites: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },

  // FAQ
  faqs: [{
    question: {
      type: String,
      required: true,
      maxlength: 200
    },
    answer: {
      type: String,
      required: true,
      maxlength: 1000
    }
  }],

  // Performance Metrics
  stats: {
    totalBookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number, // average minutes to respond
      default: 0
    },
    lastBookingDate: Date
  },

  // SEO & Visibility
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  searchRank: {
    type: Number,
    default: 0
  },

  // Status & Moderation
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'suspended'],
    default: 'draft',
    index: true
  },
  rejectionReason: String,
  moderationNotes: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for search and filtering
serviceSchema.index({ expertId: 1, isActive: 1 });
serviceSchema.index({ category: 1, isActive: 1, 'stats.averageRating': -1 });
serviceSchema.index({ 'pricing.amount': 1, isActive: 1 });
serviceSchema.index({ featured: 1, isActive: 1, 'stats.averageRating': -1 });
serviceSchema.index({ tags: 1, isActive: 1 });
serviceSchema.index({ createdAt: -1 });

// Text search index
serviceSchema.index({ 
  title: 'text', 
  description: 'text', 
  shortDescription: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    shortDescription: 5,
    tags: 3,
    description: 1
  }
});

// Compound index for marketplace queries
serviceSchema.index({ 
  isActive: 1, 
  status: 1, 
  category: 1, 
  'stats.averageRating': -1,
  'pricing.amount': 1 
});

// Virtual for expert details (populated)
serviceSchema.virtual('expert', {
  ref: 'User',
  localField: 'expertId',
  foreignField: '_id',
  justOne: true
});

// Virtual for reviews
serviceSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'serviceId'
});

// Virtual for bookings
serviceSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'serviceId'
});

// Virtual for completion rate
serviceSchema.virtual('completionRate').get(function() {
  if (this.stats.totalBookings === 0) return 0;
  return ((this.stats.completedBookings / this.stats.totalBookings) * 100).toFixed(1);
});

// Virtual for cancellation rate
serviceSchema.virtual('cancellationRate').get(function() {
  if (this.stats.totalBookings === 0) return 0;
  return ((this.stats.cancelledBookings / this.stats.totalBookings) * 100).toFixed(1);
});

// Virtual for price per hour (normalized)
serviceSchema.virtual('pricePerHour').get(function() {
  if (this.pricing.type === 'hourly') {
    return this.pricing.amount;
  } else if (this.pricing.type === 'fixed') {
    return ((this.pricing.amount / this.duration) * 60).toFixed(2);
  } else if (this.pricing.type === 'package') {
    const totalMinutes = this.duration * (this.pricing.packageDetails?.sessionsIncluded || 1);
    return ((this.pricing.amount / totalMinutes) * 60).toFixed(2);
  }
  return 0;
});

// Pre-save middleware
serviceSchema.pre('save', function(next) {
  // Generate short description from description if not provided
  if (!this.shortDescription && this.description) {
    this.shortDescription = this.description.substring(0, 197) + '...';
  }

  // Sort images by order
  if (this.images && this.images.length > 0) {
    this.images.sort((a, b) => a.order - b.order);
  }
});

// Static method: Find active services
serviceSchema.statics.findActiveServices = function(filters = {}) {
  return this.find({ 
    isActive: true, 
    status: 'approved',
    ...filters 
  })
    .populate('expertId', 'userId headline hourlyRate stats.averageRating stats.totalBookings')
    .populate('expertId.userId', 'firstName lastName profilePicture')
    .sort({ featured: -1, 'stats.averageRating': -1, createdAt: -1 });
};

// Static method: Search services
serviceSchema.statics.searchServices = function(query, filters = {}) {
  const searchQuery = {
    $text: { $search: query },
    isActive: true,
    status: 'approved',
    ...filters
  };

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, 'stats.averageRating': -1 })
    .populate('expertId', 'userId headline hourlyRate stats.averageRating stats.totalBookings')
    .populate('expertId.userId', 'firstName lastName profilePicture');
};

// Static method: Get featured services
serviceSchema.statics.getFeaturedServices = function(limit = 10) {
  return this.find({ 
    isActive: true, 
    status: 'approved', 
    featured: true 
  })
    .sort({ 'stats.averageRating': -1, 'stats.totalBookings': -1 })
    .limit(limit)
    .populate('expertId', 'userId headline hourlyRate stats.averageRating stats.totalBookings')
    .populate('expertId.userId', 'firstName lastName profilePicture');
};

// Static method: Get services by category
serviceSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ 
    isActive: true, 
    status: 'approved', 
    category 
  })
    .sort({ featured: -1, 'stats.averageRating': -1 })
    .limit(limit)
    .populate('expertId', 'userId headline hourlyRate stats.averageRating stats.totalBookings')
    .populate('expertId.userId', 'firstName lastName profilePicture');
};

// Instance method: Check if expert can handle booking
serviceSchema.methods.canAcceptBooking = async function(date) {
  const Booking = mongoose.model('Booking');
  
  // Check if service is active
  if (!this.isActive || this.status !== 'approved') {
    return { allowed: false, reason: 'Service is not available' };
  }

  // Check advance booking limit
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + this.advanceBookingDays);
  if (date > maxDate) {
    return { allowed: false, reason: `Cannot book more than ${this.advanceBookingDays} days in advance` };
  }

  // Check daily booking limit
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookingsToday = await Booking.countDocuments({
    serviceId: this._id,
    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed', 'in_progress'] }
  });

  if (bookingsToday >= this.maxBookingsPerDay) {
    return { allowed: false, reason: 'Maximum daily bookings reached' };
  }

  return { allowed: true };
};

// Instance method: Update statistics
serviceSchema.methods.updateStats = async function() {
  const Booking = mongoose.model('Booking');
  const Review = mongoose.model('Review');

  const bookings = await Booking.find({ serviceId: this._id });
  const reviews = await Review.find({ serviceId: this._id, status: 'approved' });

  this.stats.totalBookings = bookings.length;
  this.stats.completedBookings = bookings.filter(b => b.status === 'completed').length;
  this.stats.cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.stats.averageRating = (totalRating / reviews.length).toFixed(2);
    this.stats.totalReviews = reviews.length;
  }

  const completedBookings = bookings.filter(b => b.status === 'completed');
  if (completedBookings.length > 0) {
    this.stats.totalRevenue = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    this.stats.lastBookingDate = completedBookings[completedBookings.length - 1].scheduledAt;
  }

  await this.save();
  return this;
};

// Instance method: Increment view count
serviceSchema.methods.incrementViews = function() {
  this.viewCount += 1;
  return this.save({ validateBeforeSave: false });
};

const Service = mongoose.model('Service', serviceSchema);

export default Service;

