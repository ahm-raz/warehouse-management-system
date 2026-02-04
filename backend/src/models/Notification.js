import mongoose from "mongoose";

/**
 * Notification Model
 * Warehouse Management System notification and alert schema
 * Supports user-specific notifications, real-time alerts, and event-driven triggers
 */

const notificationType = Object.freeze({
  LOW_STOCK: "LOW_STOCK",
  ORDER_STATUS: "ORDER_STATUS",
  TASK_ASSIGNMENT: "TASK_ASSIGNMENT",
  SYSTEM_ALERT: "SYSTEM_ALERT",
});

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: Object.values(notificationType),
        message: "Invalid notification type",
      },
      required: [true, "Notification type is required"],
      index: true,
    },
    readStatus: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
notificationSchema.index({ user: 1, isDeleted: 1 }); // For user notification queries
notificationSchema.index({ user: 1, readStatus: 1, isDeleted: 1 }); // For unread notifications
notificationSchema.index({ type: 1, isDeleted: 1 }); // For type filtering
notificationSchema.index({ createdAt: -1, isDeleted: 1 }); // For chronological sorting
notificationSchema.index({ user: 1, createdAt: -1, isDeleted: 1 }); // For user chronological queries

// ==================== INSTANCE METHODS ====================

/**
 * Mark notification as read
 * Sets readStatus to true and readAt timestamp
 * @returns {Promise<void>}
 */
notificationSchema.methods.markAsRead = async function () {
  if (!this.readStatus) {
    this.readStatus = true;
    this.readAt = new Date();
    return await this.save();
  }
};

/**
 * Soft delete notification
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
notificationSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Query helper to exclude deleted notifications
 * Can be chained with other query methods
 */
notificationSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted notifications
 * For admin operations that need to see all notifications
 */
notificationSchema.query.includeDeleted = function () {
  return this;
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
export { notificationType };
