import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User Model
 * Warehouse Management System user schema with security features
 * Supports role-based access control and account lock protection
 */

const userRoles = Object.freeze({
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: {
        values: Object.values(userRoles),
        message: "Role must be Admin, Manager, or Staff",
      },
      default: userRoles.STAFF,
      required: [true, "Role is required"],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false, // Don't include refresh token in queries by default
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// Compound index for email and role lookups
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ email: 1, isDeleted: 1 }); // Compound index for email queries excluding deleted

// ==================== PASSWORD HASHING ====================

/**
 * Hash password before saving
 * Runs before user document is saved
 */
userSchema.pre("save", async function (next) {
  // Only hash password if it's been modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Hash password with cost factor of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ==================== INSTANCE METHODS ====================

/**
 * Compare password with hashed password
 * Prevents timing attacks using bcrypt compare
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if passwords match
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if account is locked
 * @returns {boolean} - True if account is currently locked
 */
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Increment login attempts
 * Locks account after 5 failed attempts for 30 minutes
 * @returns {Promise<void>}
 */
userSchema.methods.incLoginAttempts = async function () {
  // If previous lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = {
      lockUntil: Date.now() + 30 * 60 * 1000, // 30 minutes
    };
  }

  return await this.updateOne(updates);
};

/**
 * Reset login attempts
 * Called after successful login
 * @returns {Promise<void>}
 */
userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

/**
 * Hash refresh token before saving
 * @param {string} token - Refresh token to hash
 * @returns {Promise<string>} - Hashed token
 */
userSchema.methods.hashRefreshToken = async function (token) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(token, salt);
};

/**
 * Compare refresh token with stored hashed token
 * @param {string} candidateToken - Token to compare
 * @returns {Promise<boolean>} - True if tokens match
 */
userSchema.methods.compareRefreshToken = async function (candidateToken) {
  if (!this.refreshToken) {
    return false;
  }
  return await bcrypt.compare(candidateToken, this.refreshToken);
};

// ==================== JSON OUTPUT ====================

/**
 * Transform user document when converting to JSON
 * Removes sensitive fields from output
 */
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  return userObject;
};

/**
 * Soft delete user
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
userSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false; // Also deactivate when deleted
  return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find user by email
 * Includes password and refreshToken for authentication
 * Excludes deleted users
 * @param {string} email - User email
 * @returns {Promise<Object>} - User document
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    isDeleted: false 
  }).select("+password +refreshToken");
};

/**
 * Query helper to exclude deleted users
 * Can be chained with other query methods
 */
userSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted users
 * For admin operations that need to see all users
 */
userSchema.query.includeDeleted = function () {
  return this;
};

const User = mongoose.model("User", userSchema);

export default User;
export { userRoles };
