import mongoose from "mongoose";

/**
 * Order Model
 * Warehouse Management System outbound order schema
 * Supports order lifecycle management and inventory tracking
 */

const orderStatus = Object.freeze({
  PENDING: "Pending",
  PICKING: "Picking",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
});

const orderItemSchema = new mongoose.Schema(
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
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [2, "Customer name must be at least 2 characters"],
      maxlength: [200, "Customer name cannot exceed 200 characters"],
    },
    items: {
      type: [orderItemSchema],
      required: [true, "Order items are required"],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    orderStatus: {
      type: String,
      enum: {
        values: Object.values(orderStatus),
        message: "Invalid order status",
      },
      default: orderStatus.PENDING,
      required: true,
      index: true,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
orderSchema.index({ orderNumber: 1, isDeleted: 1 }); // For order number lookups
orderSchema.index({ orderStatus: 1, isDeleted: 1 }); // For status filtering
orderSchema.index({ assignedStaff: 1, isDeleted: 1 }); // For staff filtering
orderSchema.index({ createdAt: -1, isDeleted: 1 }); // For chronological sorting
orderSchema.index({ customerName: 1, isDeleted: 1 }); // For customer name search

// ==================== VALIDATION ====================

/**
 * Pre-save hook to validate order items
 * Prevents duplicate products and validates product existence
 */
orderSchema.pre("save", async function (next) {
  // Check for duplicate products in items array
  const productIds = this.items.map((item) => item.product.toString());
  const uniqueProductIds = new Set(productIds);

  if (productIds.length !== uniqueProductIds.size) {
    return next(new Error("Duplicate products are not allowed in order items"));
  }

  // Validate products exist and are not deleted
  if (this.isNew || this.isModified("items")) {
    const Product = mongoose.model("Product");
    for (const item of this.items) {
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
 * Soft delete order
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
orderSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

/**
 * Check if order can be cancelled
 * Orders can only be cancelled from Pending or Picking status
 * @returns {boolean} - True if order can be cancelled
 */
orderSchema.methods.canBeCancelled = function () {
  return (
    this.orderStatus === orderStatus.PENDING ||
    this.orderStatus === orderStatus.PICKING
  );
};

/**
 * Check if order can transition to new status
 * Validates workflow transitions
 * @param {string} newStatus - New status to transition to
 * @returns {boolean} - True if transition is valid
 */
orderSchema.methods.canTransitionTo = function (newStatus) {
  const validTransitions = {
    [orderStatus.PENDING]: [orderStatus.PICKING, orderStatus.CANCELLED],
    [orderStatus.PICKING]: [orderStatus.PACKED, orderStatus.CANCELLED],
    [orderStatus.PACKED]: [orderStatus.SHIPPED],
    [orderStatus.SHIPPED]: [orderStatus.DELIVERED],
    [orderStatus.DELIVERED]: [], // Final state
    [orderStatus.CANCELLED]: [], // Final state
  };

  return validTransitions[this.orderStatus]?.includes(newStatus) || false;
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20240101-00001)
 * @returns {Promise<string>} - Generated order number
 */
orderSchema.statics.generateOrderNumber = async function () {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ORD-${dateStr}-`;

  // Find the highest order number for today
  const lastOrder = await this.findOne({
    orderNumber: new RegExp(`^${prefix}`),
  })
    .sort({ orderNumber: -1 })
    .select("orderNumber")
    .lean();

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.slice(-5), 10);
    sequence = lastSequence + 1;
  }

  const sequenceStr = sequence.toString().padStart(5, "0");
  return `${prefix}${sequenceStr}`;
};

/**
 * Query helper to exclude deleted orders
 * Can be chained with other query methods
 */
orderSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted orders
 * For admin operations that need to see all orders
 */
orderSchema.query.includeDeleted = function () {
  return this;
};

const Order = mongoose.model("Order", orderSchema);

export default Order;
export { orderStatus };
