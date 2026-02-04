import mongoose from "mongoose";

/**
 * Inventory Log Model
 * Maintains complete audit trail of all inventory changes
 * Tracks stock adjustments, additions, and removals
 */

const actionTypes = Object.freeze({
  ADD: "ADD",
  REMOVE: "REMOVE",
  UPDATE: "UPDATE",
});

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },
    action: {
      type: String,
      enum: {
        values: Object.values(actionTypes),
        message: "Action must be ADD, REMOVE, or UPDATE",
      },
      required: [true, "Action is required"],
      index: true,
    },
    quantityChanged: {
      type: Number,
      required: [true, "Quantity changed is required"],
    },
    previousQuantity: {
      type: Number,
      required: [true, "Previous quantity is required"],
      min: [0, "Previous quantity cannot be negative"],
    },
    newQuantity: {
      type: Number,
      required: [true, "New quantity is required"],
      min: [0, "New quantity cannot be negative"],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Performed by user ID is required"],
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
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
inventoryLogSchema.index({ productId: 1, timestamp: -1 }); // For product history
inventoryLogSchema.index({ performedBy: 1, timestamp: -1 }); // For user activity
inventoryLogSchema.index({ action: 1, timestamp: -1 }); // For action filtering
inventoryLogSchema.index({ timestamp: -1 }); // For chronological sorting

const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);

export default InventoryLog;
export { actionTypes };
