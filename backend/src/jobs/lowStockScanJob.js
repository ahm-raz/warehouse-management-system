import cron from "node-cron";
import Product from "../models/Product.js";
import User, { userRoles } from "../models/User.js";
import { createNotification } from "../services/notificationService.js";
import { emitLowStockAlert } from "../utils/socketEmitter.js";
import { notificationType } from "../models/Notification.js";
import logger from "../logs/logger.js";
import { cronSchedules, jobToggles } from "../config/jobConfig.js";

/**
 * Daily Low Stock Scan Job
 * Scans products for low stock levels and creates notifications
 * Runs daily at midnight
 */

let jobInstance = null;

/**
 * Execute low stock scan
 * @returns {Promise<Object>} - Job execution results
 */
const executeLowStockScan = async () => {
  const startTime = Date.now();
  let lowStockProducts = [];
  let notificationsCreated = 0;
  let errors = [];

  try {
    logger.info("Starting daily low stock scan job", {
      timestamp: new Date().toISOString(),
    });

    // Find all products with low stock (quantity <= minimumStockLevel)
    lowStockProducts = await Product.find({
      isDeleted: false,
      $expr: {
        $lte: ["$quantity", "$minimumStockLevel"],
      },
    }).lean();

    logger.info("Low stock scan completed", {
      totalLowStockProducts: lowStockProducts.length,
    });

    if (lowStockProducts.length === 0) {
      const executionTime = Date.now() - startTime;
      logger.info("Low stock scan job completed - no low stock items", {
        executionTime: `${executionTime}ms`,
      });
      return {
        success: true,
        lowStockCount: 0,
        notificationsCreated: 0,
        executionTime: executionTime,
      };
    }

    // Get all Admin and Manager users
    const adminAndManagerUsers = await User.find({
      role: { $in: [userRoles.ADMIN, userRoles.MANAGER] },
      isDeleted: false,
      isActive: true,
    }).select("_id").lean();

    if (adminAndManagerUsers.length === 0) {
      logger.warn("No Admin or Manager users found for low stock notifications");
    }

    // Create notifications for each admin/manager
    const notificationPromises = adminAndManagerUsers.map(async (user) => {
      try {
        await createNotification(
          {
            title: `Low Stock Alert: ${lowStockProducts.length} Product(s)`,
            message: `${lowStockProducts.length} product(s) have reached low stock levels. Please review and restock.`,
            user: user._id.toString(),
            type: notificationType.LOW_STOCK,
            metadata: {
              lowStockCount: lowStockProducts.length,
              products: lowStockProducts.map((p) => ({
                productId: p._id.toString(),
                name: p.name,
                SKU: p.SKU,
                quantity: p.quantity,
                minimumStockLevel: p.minimumStockLevel,
              })),
            },
          },
          "system"
        );
        notificationsCreated++;
      } catch (error) {
        errors.push({
          userId: user._id.toString(),
          error: error.message,
        });
        logger.error("Failed to create low stock notification", {
          userId: user._id.toString(),
          error: error.message,
        });
      }
    });

    await Promise.all(notificationPromises);

    // Emit socket events for each low stock product
    for (const product of lowStockProducts) {
      try {
        emitLowStockAlert({
          productId: product._id.toString(),
          SKU: product.SKU,
          name: product.name,
          quantity: product.quantity,
          minimumStockLevel: product.minimumStockLevel,
          updatedBy: "system",
        });
      } catch (error) {
        errors.push({
          productId: product._id.toString(),
          error: error.message,
        });
        logger.error("Failed to emit low stock alert socket event", {
          productId: product._id.toString(),
          error: error.message,
        });
      }
    }

    const executionTime = Date.now() - startTime;

    logger.info("Low stock scan job completed successfully", {
      lowStockCount: lowStockProducts.length,
      notificationsCreated: notificationsCreated,
      errors: errors.length,
      executionTime: `${executionTime}ms`,
    });

    return {
      success: true,
      lowStockCount: lowStockProducts.length,
      notificationsCreated: notificationsCreated,
      errors: errors.length > 0 ? errors : undefined,
      executionTime: executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error("Low stock scan job failed", {
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`,
    });
    throw error;
  }
};

/**
 * Initialize and start low stock scan job
 * @returns {cron.ScheduledTask|null} - Cron job instance or null if disabled
 */
export const startLowStockScanJob = () => {
  if (!jobToggles.lowStockScan) {
    logger.info("Low stock scan job is disabled");
    return null;
  }

  if (jobInstance) {
    logger.warn("Low stock scan job is already running");
    return jobInstance;
  }

  logger.info("Initializing low stock scan job", {
    schedule: cronSchedules.dailyLowStockScan,
  });

  jobInstance = cron.schedule(
    cronSchedules.dailyLowStockScan,
    async () => {
      try {
        await executeLowStockScan();
      } catch (error) {
        logger.error("Low stock scan job execution error", {
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

  logger.info("Low stock scan job started", {
    schedule: cronSchedules.dailyLowStockScan,
  });

  return jobInstance;
};

/**
 * Stop low stock scan job
 */
export const stopLowStockScanJob = () => {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logger.info("Low stock scan job stopped");
  }
};

export default {
  startLowStockScanJob,
  stopLowStockScanJob,
  executeLowStockScan, // Export for manual execution if needed
};
