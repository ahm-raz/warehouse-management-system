import mongoose from "mongoose";

/**
 * Receiving Activity Log Model
 * Maintains complete audit trail of all receiving lifecycle events
 * Tracks receiving status changes, completions, and cancellations
 */

const actionTypes = Object.freeze({
  RECEIVING_CREATED: "RECEIVING_CREATED",
  RECEIVING_COMPLETED: "RECEIVING_COMPLETED",
  RECEIVING_CANCELLED: "RECEIVING_CANCELLED",
  RECEIVING_UPDATED: "RECEIVING_UPDATED",
  RECEIVING_DELETED: "RECEIVING_DELETED",
});

const receivingActivityLogSchema = new mongoose.Schema(
  {
    receivingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receiving",
      required: [true, "Receiving ID is required"],
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
receivingActivityLogSchema.index({ receivingId: 1, timestamp: -1 }); // For receiving history
receivingActivityLogSchema.index({ performedBy: 1, timestamp: -1 }); // For user activity
receivingActivityLogSchema.index({ actionType: 1, timestamp: -1 }); // For action filtering
receivingActivityLogSchema.index({ timestamp: -1 }); // For chronological sorting

const ReceivingActivityLog = mongoose.model("ReceivingActivityLog", receivingActivityLogSchema);

export default ReceivingActivityLog;
export { actionTypes };
