import mongoose from "mongoose";

/**
 * Daily System Log Model
 * Stores daily operational metrics and system statistics
 * Used for reporting, analytics, and system health monitoring
 */

const dailySystemLogSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
      index: true,
      // Store only date part (no time)
      get: function (value) {
        if (value) {
          return new Date(value.setHours(0, 0, 0, 0));
        }
        return value;
      },
    },
    // Order metrics
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Receiving metrics
    receivingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    receivingQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Inventory metrics
    inventoryAdjustments: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Task metrics
    tasksCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    tasksCreated: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Stock metrics
    lowStockItems: {
      type: Number,
      default: 0,
      min: 0,
    },
    // User metrics
    activeUsers: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Additional metrics (flexible for future expansion)
    additionalMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// Index on date for efficient date range queries
dailySystemLogSchema.index({ date: -1 });

// Compound index for date range queries with metrics
dailySystemLogSchema.index({ date: -1, orderCount: -1 });

// ==================== STATIC METHODS ====================

/**
 * Find logs by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Daily system logs
 */
dailySystemLogSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ date: -1 });
};

/**
 * Get latest log entry
 * @returns {Promise<Object|null>} - Latest daily system log
 */
dailySystemLogSchema.statics.getLatest = function () {
  return this.findOne().sort({ date: -1 });
};

/**
 * Get log for specific date
 * @param {Date} date - Date to query
 * @returns {Promise<Object|null>} - Daily system log for date
 */
dailySystemLogSchema.statics.getByDate = function (date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.findOne({
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });
};

const DailySystemLog = mongoose.model("DailySystemLog", dailySystemLogSchema);

export default DailySystemLog;
