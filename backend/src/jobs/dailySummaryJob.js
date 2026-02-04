import cron from "node-cron";
import Order from "../models/Order.js";
import Receiving from "../models/Receiving.js";
import Task from "../models/Task.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import DailySystemLog from "../models/DailySystemLog.js";
import { getSocket } from "../sockets/index.js";
import logger from "../logs/logger.js";
import { cronSchedules, jobToggles } from "../config/jobConfig.js";

/**
 * Daily Summary Log Job
 * Generates daily operational metrics and system statistics
 * Runs daily at 11:59 PM
 */

let jobInstance = null;

/**
 * Execute daily summary generation
 * @returns {Promise<Object>} - Job execution results
 */
const executeDailySummary = async () => {
  const startTime = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    logger.info("Starting daily summary log job", {
      timestamp: new Date().toISOString(),
      date: today.toISOString(),
    });

    // Get today's date for log entry
    const logDate = new Date(today);

    // Check if log already exists for today
    const existingLog = await DailySystemLog.getByDate(logDate);
    if (existingLog) {
      logger.warn("Daily summary log already exists for today", {
        date: logDate.toISOString(),
      });
      // Update existing log instead of creating duplicate
    }

    // ==================== ORDER METRICS ====================

    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const orderCount = orderStats[0]?.count || 0;
    const orderRevenue = orderStats[0]?.totalRevenue || 0;

    // ==================== RECEIVING METRICS ====================

    const receivingStats = await Receiving.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          isDeleted: false,
          status: "Completed",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalQuantity: { $sum: "$totalQuantity" },
        },
      },
    ]);

    const receivingCount = receivingStats[0]?.count || 0;
    const receivingQuantity = receivingStats[0]?.totalQuantity || 0;

    // ==================== INVENTORY ADJUSTMENTS ====================
    // Note: This would require tracking inventory adjustments separately
    // For now, we'll use a placeholder or query Product updates
    const inventoryAdjustments = 0; // Placeholder - implement if tracking is available

    // ==================== TASK METRICS ====================

    const taskStats = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          isDeleted: false,
        },
      },
      {
        $facet: {
          created: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
          completed: [
            {
              $match: {
                status: "Completed",
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const tasksCreated = taskStats[0]?.created[0]?.count || 0;
    const tasksCompleted = taskStats[0]?.completed[0]?.count || 0;

    // ==================== LOW STOCK ITEMS ====================

    const lowStockCount = await Product.countDocuments({
      isDeleted: false,
      $expr: {
        $lte: ["$quantity", "$minimumStockLevel"],
      },
    });

    // ==================== ACTIVE USERS ====================
    // Count users who logged in today
    const activeUsers = await User.countDocuments({
      isDeleted: false,
      isActive: true,
      lastLogin: { $gte: today, $lt: tomorrow },
    });

    // ==================== CREATE OR UPDATE DAILY LOG ====================

    const logData = {
      date: logDate,
      orderCount: orderCount,
      orderRevenue: orderRevenue,
      receivingCount: receivingCount,
      receivingQuantity: receivingQuantity,
      inventoryAdjustments: inventoryAdjustments,
      tasksCompleted: tasksCompleted,
      tasksCreated: tasksCreated,
      lowStockItems: lowStockCount,
      activeUsers: activeUsers,
    };

    let dailyLog;
    if (existingLog) {
      // Update existing log
      dailyLog = await DailySystemLog.findByIdAndUpdate(
        existingLog._id,
        logData,
        { new: true }
      );
      logger.info("Daily summary log updated", {
        logId: dailyLog._id.toString(),
      });
    } else {
      // Create new log
      dailyLog = new DailySystemLog(logData);
      await dailyLog.save();
      logger.info("Daily summary log created", {
        logId: dailyLog._id.toString(),
      });
    }

    // ==================== EMIT SOCKET EVENT ====================

    try {
      const io = getSocket();
      io.emit("dailySummaryGenerated", {
        date: logDate.toISOString(),
        metrics: {
          orderCount: orderCount,
          orderRevenue: orderRevenue,
          receivingCount: receivingCount,
          tasksCompleted: tasksCompleted,
          lowStockItems: lowStockCount,
          activeUsers: activeUsers,
        },
        timestamp: new Date().toISOString(),
      });
      logger.debug("Daily summary socket event emitted");
    } catch (socketError) {
      logger.error("Failed to emit daily summary socket event", {
        error: socketError.message,
      });
      // Don't fail job if socket emission fails
    }

    const executionTime = Date.now() - startTime;

    logger.info("Daily summary log job completed successfully", {
      logId: dailyLog._id.toString(),
      metrics: logData,
      executionTime: `${executionTime}ms`,
    });

    return {
      success: true,
      logId: dailyLog._id.toString(),
      metrics: logData,
      executionTime: executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error("Daily summary log job failed", {
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`,
    });
    throw error;
  }
};

/**
 * Initialize and start daily summary job
 * @returns {cron.ScheduledTask|null} - Cron job instance or null if disabled
 */
export const startDailySummaryJob = () => {
  if (!jobToggles.dailySummary) {
    logger.info("Daily summary job is disabled");
    return null;
  }

  if (jobInstance) {
    logger.warn("Daily summary job is already running");
    return jobInstance;
  }

  logger.info("Initializing daily summary job", {
    schedule: cronSchedules.dailySummary,
  });

  jobInstance = cron.schedule(
    cronSchedules.dailySummary,
    async () => {
      try {
        await executeDailySummary();
      } catch (error) {
        logger.error("Daily summary job execution error", {
          error: error.message,
          stack: error.stack,
        });
        // Don't throw - prevent job from crashing server
      }
    },
    {
      scheduled: true,
      timezone: process.env.JOB_TIMEZONE || "UTC",
    }
  );

  logger.info("Daily summary job started", {
    schedule: cronSchedules.dailySummary,
  });

  return jobInstance;
};

/**
 * Stop daily summary job
 */
export const stopDailySummaryJob = () => {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logger.info("Daily summary job stopped");
  }
};

export default {
  startDailySummaryJob,
  stopDailySummaryJob,
  executeDailySummary, // Export for manual execution if needed
};
