import mongoose from "mongoose";

/**
 * Archived Order Model
 * Stores historical orders that have been archived from the active Order collection
 * Maintains complete order data for historical reference and reporting
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
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const archivedOrderSchema = new mongoose.Schema(
  {
    // Original order ID (for reference)
    originalOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderStatus: {
      type: String,
      enum: {
        values: Object.values(orderStatus),
        message: "Invalid order status",
      },
      required: true,
      index: true,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    // Original timestamps from active order
    originalCreatedAt: {
      type: Date,
      required: true,
      index: true,
    },
    originalUpdatedAt: {
      type: Date,
      required: true,
    },
    // Archive metadata
    archivedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    archivedBy: {
      type: String,
      default: "system",
    },
  },
  {
    timestamps: true, // Creates createdAt and updatedAt for archive record
  }
);

// ==================== INDEXES ====================

// Compound indexes for efficient querying
archivedOrderSchema.index({ orderStatus: 1, archivedAt: -1 }); // For status-based queries
archivedOrderSchema.index({ originalCreatedAt: -1 }); // For chronological queries
archivedOrderSchema.index({ archivedAt: -1 }); // For archive date queries
archivedOrderSchema.index({ orderNumber: 1 }); // For order number lookups

// ==================== STATIC METHODS ====================

/**
 * Find archived orders by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Archived orders
 */
archivedOrderSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    originalCreatedAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ originalCreatedAt: -1 });
};

/**
 * Find archived orders by status
 * @param {string} status - Order status
 * @returns {Promise<Array>} - Archived orders
 */
archivedOrderSchema.statics.findByStatus = function (status) {
  return this.find({ orderStatus: status }).sort({ archivedAt: -1 });
};

const ArchivedOrder = mongoose.model("ArchivedOrder", archivedOrderSchema);

export default ArchivedOrder;
export { orderStatus };
