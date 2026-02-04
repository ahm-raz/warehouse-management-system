import mongoose from "mongoose";

/**
 * Order Activity Log Model
 * Maintains complete audit trail of all order lifecycle events
 * Tracks order status changes, staff assignments, and cancellations
 */

const actionTypes = Object.freeze({
  ORDER_CREATED: "ORDER_CREATED",
  STATUS_UPDATED: "STATUS_UPDATED",
  STAFF_ASSIGNED: "STAFF_ASSIGNED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ORDER_DELETED: "ORDER_DELETED",
});

const orderActivityLogSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Performed by user ID is required"],
      index: true,
    },
    actionType: {
      type: String,
      enum: {
        values: Object.values(actionTypes),
        message: "Invalid action type",
      },
      required: [true, "Action type is required"],
      index: true,
    },
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// Compound indexes for efficient querying
orderActivityLogSchema.index({ orderId: 1, timestamp: -1 }); // For order history
orderActivityLogSchema.index({ performedBy: 1, timestamp: -1 }); // For user activity
orderActivityLogSchema.index({ actionType: 1, timestamp: -1 }); // For action filtering
orderActivityLogSchema.index({ timestamp: -1 }); // For chronological sorting

const OrderActivityLog = mongoose.model("OrderActivityLog", orderActivityLogSchema);

export default OrderActivityLog;
export { actionTypes };
