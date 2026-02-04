import mongoose from "mongoose";

/**
 * Receiving Model
 * Warehouse Management System inbound stock receiving schema
 * Supports receiving workflow and inventory tracking
 */

const receivingStatus = Object.freeze({
  PENDING: "Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
});

const receivedItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitCost: {
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
  },
  { _id: false }
);

const receivingSchema = new mongoose.Schema(
  {
    receivingNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
      index: true,
    },
    receivedItems: {
      type: [receivedItemSchema],
      required: [true, "Received items are required"],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Receiving must have at least one item",
      },
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Received by user is required"],
      index: true,
    },
    totalItems: {
      type: Number,
      required: true,
      min: [1, "Total items must be at least 1"],
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: [1, "Total quantity must be at least 1"],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(receivingStatus),
        message: "Invalid receiving status",
      },
      default: receivingStatus.PENDING,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
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
receivingSchema.index({ receivingNumber: 1, isDeleted: 1 }); // For receiving number lookups
receivingSchema.index({ supplier: 1, isDeleted: 1 }); // For supplier filtering
receivingSchema.index({ status: 1, isDeleted: 1 }); // For status filtering
receivingSchema.index({ receivedBy: 1, isDeleted: 1 }); // For receivedBy filtering
receivingSchema.index({ createdAt: -1, isDeleted: 1 }); // For chronological sorting

// ==================== VALIDATION ====================

/**
 * Pre-save hook to validate receiving items
 * Prevents duplicate products and validates product/supplier existence
 */
receivingSchema.pre("save", async function (next) {
  // Check for duplicate products in receivedItems array
  const productIds = this.receivedItems.map((item) => item.product.toString());
  const uniqueProductIds = new Set(productIds);

  if (productIds.length !== uniqueProductIds.size) {
    return next(new Error("Duplicate products are not allowed in received items"));
  }

  // Validate supplier exists and is active (only for new documents or when supplier changes)
  if (this.isNew || this.isModified("supplier")) {
    const Supplier = mongoose.model("Supplier");
    const supplier = await Supplier.findOne({
      _id: this.supplier,
      isDeleted: false,
      status: "ACTIVE",
    });

    if (!supplier) {
      return next(new Error("Supplier not found, inactive, or has been deleted"));
    }
  }

  // Validate products exist and are not deleted (only for new documents or when items change)
  if (this.isNew || this.isModified("receivedItems")) {
    const Product = mongoose.model("Product");
    for (const item of this.receivedItems) {
      const product = await Product.findOne({
        _id: item.product,
        isDeleted: false,
      });

      if (!product) {
        return next(new Error(`Product ${item.product} not found or has been deleted`));
      }
    }
  }

  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Soft delete receiving
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
receivingSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

/**
 * Check if receiving can be cancelled
 * Receivings can only be cancelled from Pending status
 * @returns {boolean} - True if receiving can be cancelled
 */
receivingSchema.methods.canBeCancelled = function () {
  return this.status === receivingStatus.PENDING;
};

/**
 * Check if receiving can transition to new status
 * Validates workflow transitions
 * @param {string} newStatus - New status to transition to
 * @returns {boolean} - True if transition is valid
 */
receivingSchema.methods.canTransitionTo = function (newStatus) {
  const validTransitions = {
    [receivingStatus.PENDING]: [receivingStatus.COMPLETED, receivingStatus.CANCELLED],
    [receivingStatus.COMPLETED]: [], // Final state
    [receivingStatus.CANCELLED]: [], // Final state
  };

  return validTransitions[this.status]?.includes(newStatus) || false;
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique receiving number
 * Format: REC-YYYYMMDD-XXXXX (e.g., REC-20240101-00001)
 * @returns {Promise<string>} - Generated receiving number
 */
receivingSchema.statics.generateReceivingNumber = async function () {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `REC-${dateStr}-`;

  // Find the highest receiving number for today
  const lastReceiving = await this.findOne({
    receivingNumber: new RegExp(`^${prefix}`),
  })
    .sort({ receivingNumber: -1 })
    .select("receivingNumber")
    .lean();

  let sequence = 1;
  if (lastReceiving) {
    const lastSequence = parseInt(lastReceiving.receivingNumber.slice(-5), 10);
    sequence = lastSequence + 1;
  }

  const sequenceStr = sequence.toString().padStart(5, "0");
  return `${prefix}${sequenceStr}`;
};

/**
 * Query helper to exclude deleted receivings
 * Can be chained with other query methods
 */
receivingSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted receivings
 * For admin operations that need to see all receivings
 */
receivingSchema.query.includeDeleted = function () {
  return this;
};

const Receiving = mongoose.model("Receiving", receivingSchema);

export default Receiving;
export { receivingStatus };
