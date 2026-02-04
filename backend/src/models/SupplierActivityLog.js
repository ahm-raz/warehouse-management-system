import mongoose from "mongoose";

/**
 * Supplier Activity Log Model
 * Maintains complete audit trail of all supplier modifications
 * Tracks supplier lifecycle events and status changes
 */

const actionTypes = Object.freeze({
  SUPPLIER_CREATED: "SUPPLIER_CREATED",
  SUPPLIER_UPDATED: "SUPPLIER_UPDATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  SUPPLIER_DELETED: "SUPPLIER_DELETED",
});

const supplierActivityLogSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier ID is required"],
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
supplierActivityLogSchema.index({ supplier: 1, timestamp: -1 }); // For supplier history
supplierActivityLogSchema.index({ performedBy: 1, timestamp: -1 }); // For user activity
supplierActivityLogSchema.index({ actionType: 1, timestamp: -1 }); // For action filtering
supplierActivityLogSchema.index({ timestamp: -1 }); // For chronological sorting

const SupplierActivityLog = mongoose.model("SupplierActivityLog", supplierActivityLogSchema);

export default SupplierActivityLog;
export { actionTypes };
