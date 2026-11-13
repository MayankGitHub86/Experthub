import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  // Parties
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Related Entities
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true, // One review per booking
    index: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },

  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Rating must be a whole number'
    }
  },

  // Detailed Ratings
  detailedRatings: {
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    expertise: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    valueForMoney: {
      type: Number,
      min: 1,
      max: 5
    },
    wouldRecommend: {
      type: Boolean,
      default: true
    }
  },

  // Review Content
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },

  // Expert Response
  response: {
    content: {
      type: String,
      trim: true,
      maxlength: [1000, 'Response cannot exceed 1000 characters']
    },
    respondedAt: Date
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged', 'hidden'],
    default: 'pending',
    index: true
  },

  // Moderation
  moderation: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    rejectionReason: String,
    flagReason: String,
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flaggedAt: Date,
    notes: String
  },

  // Helpfulness
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  notHelpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // Verification
  verified: {
    type: Boolean,
    default: true // Verified if tied to completed booking
  },

  // Images (optional)
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String,
    caption: String
  }],

  // Visibility
  isPublic: {
    type: Boolean,
    default: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },

  // Edit tracking
  edited: {
    type: Boolean,
    default: false
  },
  lastEditedAt: Date,

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    languageDetected: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ expertId: 1, status: 1, rating: -1 });
reviewSchema.index({ serviceId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ reviewerId: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1 }, { unique: true });
reviewSchema.index({ rating: 1, status: 1 });
reviewSchema.index({ 'helpful.count': -1, status: 1 });

// Text search
reviewSchema.index({ 
  title: 'text', 
  comment: 'text' 
}, {
  weights: {
    title: 5,
    comment: 1
  }
});

// Compound index for expert reviews page
reviewSchema.index({ 
  expertId: 1, 
  status: 1, 
  createdAt: -1 
});

// Virtual for reviewer details
reviewSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewerId',
  foreignField: '_id',
  justOne: true
});

// Virtual for expert details
reviewSchema.virtual('expert', {
  ref: 'User',
  localField: 'expertId',
  foreignField: '_id',
  justOne: true
});

// Virtual for booking details
reviewSchema.virtual('booking', {
  ref: 'Booking',
  localField: 'bookingId',
  foreignField: '_id',
  justOne: true
});

// Virtual for service details
reviewSchema.virtual('service', {
  ref: 'Service',
  localField: 'serviceId',
  foreignField: '_id',
  justOne: true
});

// Virtual for helpfulness ratio
reviewSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpful.count + this.notHelpful.count;
  if (total === 0) return 0;
  return ((this.helpful.count / total) * 100).toFixed(1);
});

// Virtual for average detailed rating
reviewSchema.virtual('averageDetailedRating').get(function() {
  if (!this.detailedRatings) return null;
  
  const ratings = [
    this.detailedRatings.communication,
    this.detailedRatings.expertise,
    this.detailedRatings.professionalism,
    this.detailedRatings.valueForMoney
  ].filter(r => r !== undefined && r !== null);

  if (ratings.length === 0) return null;
  
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return (sum / ratings.length).toFixed(2);
});

// Pre-save middleware
reviewSchema.pre('save', async function(next) {
  // Calculate sentiment based on rating
  if (this.isModified('rating')) {
    if (this.rating >= 4) {
      this.metadata.sentiment = 'positive';
    } else if (this.rating === 3) {
      this.metadata.sentiment = 'neutral';
    } else {
      this.metadata.sentiment = 'negative';
    }
  }

  // Auto-approve reviews from verified bookings
  if (this.isNew && this.verified) {
    this.status = 'approved';
  }

  next();
});

// Post-save middleware: Update expert and service ratings
reviewSchema.post('save', async function(doc) {
  if (doc.status === 'approved') {
    // Update expert average rating
    const User = mongoose.model('User');
    const expert = await User.findById(doc.expertId);
    if (expert && expert.expert) {
      await expert.updateExpertRating();
    }

    // Update service average rating
    const Service = mongoose.model('Service');
    const service = await Service.findById(doc.serviceId);
    if (service) {
      await service.updateStats();
    }
  }
});

// Post-remove middleware: Update ratings after deletion
reviewSchema.post('remove', async function(doc) {
  // Update expert average rating
  const User = mongoose.model('User');
  const expert = await User.findById(doc.expertId);
  if (expert && expert.expert) {
    await expert.updateExpertRating();
  }

  // Update service average rating
  const Service = mongoose.model('Service');
  const service = await Service.findById(doc.serviceId);
  if (service) {
    await service.updateStats();
  }
});

// Static method: Get reviews for expert
reviewSchema.statics.getExpertReviews = function(expertId, options = {}) {
  const {
    status = 'approved',
    limit = 20,
    skip = 0,
    sortBy = 'createdAt',
    sortOrder = -1,
    minRating = null,
    maxRating = null
  } = options;

  const query = { expertId, status };

  if (minRating !== null) {
    query.rating = { ...query.rating, $gte: minRating };
  }

  if (maxRating !== null) {
    query.rating = { ...query.rating, $lte: maxRating };
  }

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .populate('reviewerId', 'firstName lastName profilePicture')
    .populate('serviceId', 'title');
};

// Static method: Get reviews for service
reviewSchema.statics.getServiceReviews = function(serviceId, limit = 20) {
  return this.find({ serviceId, status: 'approved' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reviewerId', 'firstName lastName profilePicture');
};

// Static method: Calculate expert rating breakdown
reviewSchema.statics.getExpertRatingBreakdown = async function(expertId) {
  const breakdown = await this.aggregate([
    { $match: { expertId: mongoose.Types.ObjectId(expertId), status: 'approved' } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  const total = breakdown.reduce((sum, item) => sum + item.count, 0);

  const result = {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0,
    total,
    breakdown: {}
  };

  breakdown.forEach(item => {
    result[item._id] = item.count;
    result.breakdown[item._id] = {
      count: item.count,
      percentage: ((item.count / total) * 100).toFixed(1)
    };
  });

  return result;
};

// Static method: Get recent reviews across platform
reviewSchema.statics.getRecentReviews = function(limit = 10) {
  return this.find({ status: 'approved', isPublic: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reviewerId', 'firstName lastName profilePicture')
    .populate('expertId', 'firstName lastName expert.title')
    .populate('serviceId', 'title');
};

// Static method: Get top-rated reviews
reviewSchema.statics.getTopRatedReviews = function(limit = 10) {
  return this.find({ status: 'approved', isPublic: true })
    .sort({ rating: -1, 'helpful.count': -1, createdAt: -1 })
    .limit(limit)
    .populate('reviewerId', 'firstName lastName profilePicture')
    .populate('expertId', 'firstName lastName expert.title')
    .populate('serviceId', 'title');
};

// Static method: Search reviews
reviewSchema.statics.searchReviews = function(searchTerm, expertId = null) {
  const query = {
    status: 'approved',
    $text: { $search: searchTerm }
  };

  if (expertId) {
    query.expertId = expertId;
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(20)
    .populate('reviewerId', 'firstName lastName profilePicture')
    .populate('serviceId', 'title');
};

// Instance method: Mark as helpful
reviewSchema.methods.markHelpful = async function(userId, isHelpful = true) {
  if (isHelpful) {
    // Remove from not helpful if exists
    this.notHelpful.users = this.notHelpful.users.filter(
      id => id.toString() !== userId.toString()
    );
    if (this.notHelpful.count > 0) {
      this.notHelpful.count--;
    }

    // Add to helpful if not already there
    if (!this.helpful.users.includes(userId)) {
      this.helpful.users.push(userId);
      this.helpful.count++;
    }
  } else {
    // Remove from helpful if exists
    this.helpful.users = this.helpful.users.filter(
      id => id.toString() !== userId.toString()
    );
    if (this.helpful.count > 0) {
      this.helpful.count--;
    }

    // Add to not helpful if not already there
    if (!this.notHelpful.users.includes(userId)) {
      this.notHelpful.users.push(userId);
      this.notHelpful.count++;
    }
  }

  await this.save();
  return this;
};

// Instance method: Add expert response
reviewSchema.methods.addResponse = async function(content, expertId) {
  if (this.expertId.toString() !== expertId.toString()) {
    throw new Error('Only the reviewed expert can respond');
  }

  if (this.response && this.response.content) {
    throw new Error('Response already exists');
  }

  this.response = {
    content,
    respondedAt: new Date()
  };

  await this.save();
  return this;
};

// Instance method: Flag review
reviewSchema.methods.flag = async function(userId, reason) {
  this.status = 'flagged';
  this.moderation.flaggedBy = userId;
  this.moderation.flagReason = reason;
  this.moderation.flaggedAt = new Date();

  await this.save();
  return this;
};

// Instance method: Approve review
reviewSchema.methods.approve = async function(moderatorId, notes = '') {
  this.status = 'approved';
  this.moderation.reviewedBy = moderatorId;
  this.moderation.reviewedAt = new Date();
  this.moderation.notes = notes;

  await this.save();
  return this;
};

// Instance method: Reject review
reviewSchema.methods.reject = async function(moderatorId, reason) {
  this.status = 'rejected';
  this.moderation.reviewedBy = moderatorId;
  this.moderation.reviewedAt = new Date();
  this.moderation.rejectionReason = reason;

  await this.save();
  return this;
};

// Instance method: Hide review
reviewSchema.methods.hide = async function() {
  this.status = 'hidden';
  await this.save();
  return this;
};

// Instance method: Edit review
reviewSchema.methods.editReview = async function(updates) {
  const allowedUpdates = ['title', 'comment', 'rating', 'detailedRatings'];
  
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      this[key] = updates[key];
    }
  });

  this.edited = true;
  this.lastEditedAt = new Date();

  await this.save();
  return this;
};

const Review = mongoose.model('Review', reviewSchema);

export default Review;

