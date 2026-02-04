import mongoose from "mongoose";

/**
 * Product Model
 * Warehouse Management System product schema
 * Supports product lifecycle management and inventory tracking
 */

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [200, "Product name cannot exceed 200 characters"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    SKU: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-_]+$/, "SKU must contain only uppercase letters, numbers, hyphens, and underscores"],
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: [0, "Quantity cannot be negative"],
      required: true,
      index: true,
    },
    minimumStockLevel: {
      type: Number,
      default: 0,
      min: [0, "Minimum stock level cannot be negative"],
      index: true,
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      index: true,
    },
    storageLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: null,
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
productSchema.index({ SKU: 1, isDeleted: 1 }); // For SKU lookups excluding deleted
productSchema.index({ category: 1, isDeleted: 1 }); // For category filtering
productSchema.index({ supplier: 1, isDeleted: 1 }); // For supplier filtering
productSchema.index({ quantity: 1, minimumStockLevel: 1 }); // For low stock queries
productSchema.index({ isDeleted: 1, quantity: 1 }); // For active inventory queries

// ==================== INSTANCE METHODS ====================

/**
 * Check if product is low on stock
 * @returns {boolean} - True if quantity <= minimumStockLevel
 */
productSchema.methods.isLowStock = function () {
  return this.quantity <= this.minimumStockLevel;
};

/**
 * Soft delete product
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
productSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Query helper to exclude deleted products
 * Can be chained with other query methods
 */
productSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted products
 * For admin operations that need to see all products
 */
productSchema.query.includeDeleted = function () {
  return this;
};

/**
 * Find products with low stock
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Products with low stock
 */
productSchema.statics.findLowStock = function (options = {}) {
  const query = {
    isDeleted: false,
    $expr: {
      $lte: ["$quantity", "$minimumStockLevel"],
    },
  };

  if (options.category) {
    query.category = options.category;
  }

  return this.find(query);
};

const Product = mongoose.model("Product", productSchema);

export default Product;
