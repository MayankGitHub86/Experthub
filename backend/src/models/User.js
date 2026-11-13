import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Model
 * 
 * Represents all users in the system (clients, experts, admins)
 * Handles authentication, password hashing, and user management
 */

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    index: true,
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include password in queries by default
  },
  
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  
  profilePicture: {
    type: String,
    default: null,
  },
  
  role: {
    type: String,
    enum: ['client', 'expert', 'admin', 'support'],
    default: 'client',
    required: true,
    index: true,
  },
  

  
  // Email Verification
  emailVerified: {
    type: Boolean,
    default: false,
  },
  
  verificationToken: {
    type: String,
    select: false,
  },
  
  verificationTokenExpires: {
    type: Date,
    select: false,
  },
  
  // Password Reset
  resetPasswordToken: {
    type: String,
    select: false,
  },
  
  resetPasswordExpires: {
    type: Date,
    select: false,
  },
  
  // OAuth
  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },
  
  oauthProvider: {
    type: String,
    enum: ['google', 'github', null],
    default: null,
  },
  
  // Profile
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
  },
  
  timezone: {
    type: String,
    default: 'UTC',
  },
  
  language: {
    type: String,
    default: 'en',
  },
  
  phone: {
    type: String,
    trim: true,
  },
  
  // Notification Preferences
  notifications: {
    email: {
      type: Boolean,
      default: true,
    },
    sms: {
      type: Boolean,
      default: false,
    },
    push: {
      type: Boolean,
      default: true,
    },
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
    index: true,
  },
  
  suspendedReason: {
    type: String,
  },
  
  suspendedAt: {
    type: Date,
  },
  
  deletedAt: {
    type: Date,
  },
  
  // Activity
  lastLogin: {
    type: Date,
  },
  
  loginAttempts: {
    type: Number,
    default: 0,
  },
  
  lockUntil: {
    type: Date,
  },
  
  // Metadata
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
      delete ret.password;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
  },
});

// Indexes
userSchema.index({ email: 1, status: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If lock has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + (2 * 60 * 60 * 1000) }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Static method to find by email (including password)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// Static method to find active users
userSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, status: 'active' });
};

const User = mongoose.model('User', userSchema);

export default User;
