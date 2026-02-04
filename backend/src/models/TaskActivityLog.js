import mongoose from "mongoose";

/**
 * Task Activity Log Model
 * Maintains complete audit trail of all task lifecycle events
 * Tracks task assignments, status changes, and completions
 */

const actionTypes = Object.freeze({
  TASK_CREATED: "TASK_CREATED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_STATUS_UPDATED: "TASK_STATUS_UPDATED",
  TASK_CANCELLED: "TASK_CANCELLED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_DELETED: "TASK_DELETED",
});

const taskActivityLogSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task ID is required"],
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
taskActivityLogSchema.index({ taskId: 1, timestamp: -1 }); // For task history
taskActivityLogSchema.index({ performedBy: 1, timestamp: -1 }); // For user activity
taskActivityLogSchema.index({ actionType: 1, timestamp: -1 }); // For action filtering
taskActivityLogSchema.index({ timestamp: -1 }); // For chronological sorting

const TaskActivityLog = mongoose.model("TaskActivityLog", taskActivityLogSchema);

export default TaskActivityLog;
export { actionTypes };
