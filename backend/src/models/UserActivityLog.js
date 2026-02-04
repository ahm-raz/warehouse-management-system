import mongoose from "mongoose";

/**
 * User Activity Log Model
 * Tracks all administrative actions performed on users
 * Provides audit trail for user management operations
 */

const actionTypes = Object.freeze({
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  USER_ACTIVATED: "USER_ACTIVATED",
  ROLE_CHANGED: "ROLE_CHANGED",
  USER_DELETED: "USER_DELETED",
});

const userActivityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
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
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
userActivityLogSchema.index({ user: 1, timestamp: -1 }); // For user activity history
userActivityLogSchema.index({ performedBy: 1, timestamp: -1 }); // For admin activity tracking
userActivityLogSchema.index({ actionType: 1, timestamp: -1 }); // For action type filtering

const UserActivityLog = mongoose.model("UserActivityLog", userActivityLogSchema);

export default UserActivityLog;
export { actionTypes };
