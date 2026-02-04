import mongoose from "mongoose";

/**
 * Task Model
 * Warehouse Management System task and staff assignment schema
 * Supports task lifecycle management, time tracking, and performance monitoring
 */

const taskType = Object.freeze({
  PICKING: "Picking",
  PACKING: "Packing",
  RECEIVING: "Receiving",
});

const taskStatus = Object.freeze({
  PENDING: "Pending",
  IN_PROGRESS: "InProgress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
});

const taskPriority = Object.freeze({
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
});

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [3, "Task title must be at least 3 characters"],
      maxlength: [200, "Task title cannot exceed 200 characters"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned to user is required"],
      index: true,
    },
    taskType: {
      type: String,
      enum: {
        values: Object.values(taskType),
        message: "Invalid task type",
      },
      required: [true, "Task type is required"],
      index: true,
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    relatedReceiving: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receiving",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(taskStatus),
        message: "Invalid task status",
      },
      default: taskStatus.PENDING,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(taskPriority),
        message: "Invalid task priority",
      },
      default: taskPriority.MEDIUM,
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned by user is required"],
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completionDuration: {
      type: Number,
      default: null,
      min: [0, "Completion duration cannot be negative"],
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
taskSchema.index({ assignedTo: 1, isDeleted: 1 }); // For staff task queries
taskSchema.index({ taskType: 1, isDeleted: 1 }); // For task type filtering
taskSchema.index({ status: 1, isDeleted: 1 }); // For status filtering
taskSchema.index({ priority: 1, isDeleted: 1 }); // For priority filtering
taskSchema.index({ relatedOrder: 1, isDeleted: 1 }); // For order-related tasks
taskSchema.index({ relatedReceiving: 1, isDeleted: 1 }); // For receiving-related tasks
taskSchema.index({ createdAt: -1, isDeleted: 1 }); // For chronological sorting
taskSchema.index({ assignedTo: 1, status: 1, isDeleted: 1 }); // For staff status queries

// ==================== VALIDATION ====================

/**
 * Pre-save hook to validate task relationships
 * Ensures relatedOrder is set for Picking/Packing tasks
 * Ensures relatedReceiving is set for Receiving tasks
 */
taskSchema.pre("save", async function (next) {
  // Validate relatedOrder for Picking and Packing tasks
  if (this.taskType === taskType.PICKING || this.taskType === taskType.PACKING) {
    if (!this.relatedOrder) {
      return next(new Error("Related order is required for Picking and Packing tasks"));
    }
  }

  // Validate relatedReceiving for Receiving tasks
  if (this.taskType === taskType.RECEIVING) {
    if (!this.relatedReceiving) {
      return next(new Error("Related receiving is required for Receiving tasks"));
    }
  }

  // Validate assignedTo user exists and is active (only for new documents or when assignedTo changes)
  if (this.isNew || this.isModified("assignedTo")) {
    const User = mongoose.model("User");
    const user = await User.findOne({
      _id: this.assignedTo,
      isDeleted: false,
      isActive: true,
    });

    if (!user) {
      return next(new Error("Assigned user not found, inactive, or has been deleted"));
    }

    // Ensure assigned user is Staff role
    if (user.role !== "Staff") {
      return next(new Error("Task can only be assigned to Staff users"));
    }
  }

  // Validate relatedOrder exists (only for new documents or when relatedOrder changes)
  if (this.relatedOrder && (this.isNew || this.isModified("relatedOrder"))) {
    const Order = mongoose.model("Order");
    const order = await Order.findOne({
      _id: this.relatedOrder,
      isDeleted: false,
    });

    if (!order) {
      return next(new Error("Related order not found or has been deleted"));
    }
  }

  // Validate relatedReceiving exists (only for new documents or when relatedReceiving changes)
  if (this.relatedReceiving && (this.isNew || this.isModified("relatedReceiving"))) {
    const Receiving = mongoose.model("Receiving");
    const receiving = await Receiving.findOne({
      _id: this.relatedReceiving,
      isDeleted: false,
    });

    if (!receiving) {
      return next(new Error("Related receiving not found or has been deleted"));
    }
  }

  // Calculate completion duration if both startedAt and completedAt are set
  if (this.startedAt && this.completedAt) {
    const durationMs = this.completedAt.getTime() - this.startedAt.getTime();
    this.completionDuration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
  }

  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Check if task can transition to new status
 * Validates workflow transitions
 * @param {string} newStatus - New status to transition to
 * @returns {boolean} - True if transition is valid
 */
taskSchema.methods.canTransitionTo = function (newStatus) {
  const validTransitions = {
    [taskStatus.PENDING]: [taskStatus.IN_PROGRESS, taskStatus.CANCELLED],
    [taskStatus.IN_PROGRESS]: [taskStatus.COMPLETED, taskStatus.CANCELLED],
    [taskStatus.COMPLETED]: [], // Final state
    [taskStatus.CANCELLED]: [], // Final state
  };

  return validTransitions[this.status]?.includes(newStatus) || false;
};

/**
 * Check if task can be cancelled
 * Tasks can only be cancelled before completion
 * @returns {boolean} - True if task can be cancelled
 */
taskSchema.methods.canBeCancelled = function () {
  return this.status === taskStatus.PENDING || this.status === taskStatus.IN_PROGRESS;
};

/**
 * Start task
 * Sets startedAt timestamp when status changes to InProgress
 * @returns {Promise<void>}
 */
taskSchema.methods.startTask = async function () {
  if (this.status === taskStatus.PENDING && !this.startedAt) {
    this.startedAt = new Date();
    this.status = taskStatus.IN_PROGRESS;
    return await this.save();
  }
};

/**
 * Complete task
 * Sets completedAt timestamp and calculates duration
 * @returns {Promise<void>}
 */
taskSchema.methods.completeTask = async function () {
  if (this.status === taskStatus.IN_PROGRESS) {
    this.completedAt = new Date();
    this.status = taskStatus.COMPLETED;

    // Calculate completion duration
    if (this.startedAt) {
      const durationMs = this.completedAt.getTime() - this.startedAt.getTime();
      this.completionDuration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
    }

    return await this.save();
  }
};

/**
 * Soft delete task
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
taskSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Query helper to exclude deleted tasks
 * Can be chained with other query methods
 */
taskSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted tasks
 * For admin operations that need to see all tasks
 */
taskSchema.query.includeDeleted = function () {
  return this;
};

const Task = mongoose.model("Task", taskSchema);

export default Task;
export { taskType, taskStatus, taskPriority };
