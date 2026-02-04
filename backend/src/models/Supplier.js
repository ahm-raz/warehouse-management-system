import mongoose from "mongoose";

/**
 * Supplier Model
 * Warehouse Management System supplier schema
 * Supports supplier lifecycle management and product relationships
 */

const supplierStatus = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
});

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      minlength: [2, "Supplier name must be at least 2 characters"],
      maxlength: [100, "Supplier name cannot exceed 100 characters"],
      index: true,
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
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^[\d\s\-\+\(\)]+$/,
        "Please provide a valid phone number",
      ],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(supplierStatus),
        message: "Status must be ACTIVE or INACTIVE",
      },
      default: supplierStatus.ACTIVE,
      required: true,
      index: true,
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

// Compound indexes for efficient querying
supplierSchema.index({ email: 1, isDeleted: 1 }); // For email lookups excluding deleted
supplierSchema.index({ status: 1, isDeleted: 1 }); // For status filtering
supplierSchema.index({ company: 1, isDeleted: 1 }); // For company filtering

// ==================== INSTANCE METHODS ====================

/**
 * Soft delete supplier
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
supplierSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = supplierStatus.INACTIVE; // Also deactivate when deleted
  return await this.save();
};

/**
 * Check if supplier is active
 * @returns {boolean} - True if supplier is active
 */
supplierSchema.methods.isActive = function () {
  return this.status === supplierStatus.ACTIVE && !this.isDeleted;
};

// ==================== STATIC METHODS ====================

/**
 * Query helper to exclude deleted suppliers
 * Can be chained with other query methods
 */
supplierSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted suppliers
 * For admin operations that need to see all suppliers
 */
supplierSchema.query.includeDeleted = function () {
  return this;
};

/**
 * Find active suppliers only
 * @returns {Query} - Query for active suppliers
 */
supplierSchema.query.active = function () {
  return this.where({ status: supplierStatus.ACTIVE, isDeleted: false });
};

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;
export { supplierStatus };
