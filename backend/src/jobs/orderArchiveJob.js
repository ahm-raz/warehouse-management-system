import cron from "node-cron";
import Order from "../models/Order.js";
import ArchivedOrder from "../models/ArchivedOrder.js";
import logger from "../logs/logger.js";
import { cronSchedules, jobToggles, orderArchiveConfig } from "../config/jobConfig.js";

/**
 * Order Archive Job
 * Archives completed orders older than retention period
 * Runs daily at 2 AM
 */

let jobInstance = null;

/**
 * Execute order archive
 * @returns {Promise<Object>} - Job execution results
 */
const executeOrderArchive = async () => {
  const startTime = Date.now();
  let ordersArchived = 0;
  let errors = [];

  try {
    logger.info("Starting order archive job", {
      timestamp: new Date().toISOString(),
      retentionDays: orderArchiveConfig.retentionDays,
    });

    // Calculate cutoff date (orders older than retention period)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - orderArchiveConfig.retentionDays);
    cutoffDate.setHours(0, 0, 0, 0);

    // Find orders to archive: Delivered status, older than cutoff date, not deleted
    const ordersToArchive = await Order.find({
      orderStatus: "Delivered",
      updatedAt: { $lt: cutoffDate },
      isDeleted: false,
    })
      .sort({ updatedAt: 1 }) // Process oldest first
      .lean();

    logger.info("Order archive: Found orders to archive", {
      count: ordersToArchive.length,
      cutoffDate: cutoffDate.toISOString(),
    });

    if (ordersToArchive.length === 0) {
      const executionTime = Date.now() - startTime;
      logger.info("Order archive job completed - no orders to archive", {
        executionTime: `${executionTime}ms`,
      });
      return {
        success: true,
        ordersArchived: 0,
        executionTime: executionTime,
      };
    }

    // Process orders in batches to avoid memory issues
    const batchSize = orderArchiveConfig.batchSize;
    for (let i = 0; i < ordersToArchive.length; i += batchSize) {
      const batch = ordersToArchive.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (order) => {
          try {
            // Create archived order document
            const archivedOrder = new ArchivedOrder({
              originalOrderId: order._id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              items: order.items,
              totalAmount: order.totalAmount,
              orderStatus: order.orderStatus,
              assignedStaff: order.assignedStaff,
              originalCreatedAt: order.createdAt,
              originalUpdatedAt: order.updatedAt,
              archivedAt: new Date(),
              archivedBy: "system",
            });

            await archivedOrder.save();

            // Delete original order (hard delete for archived orders)
            await Order.findByIdAndDelete(order._id);

            ordersArchived++;

            logger.debug("Order archived successfully", {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
            });
          } catch (error) {
            errors.push({
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              error: error.message,
            });
            logger.error("Failed to archive order", {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              error: error.message,
              stack: error.stack,
            });
          }
        })
      );

      // Log progress for large batches
      if (ordersToArchive.length > batchSize) {
        logger.info("Order archive progress", {
          processed: Math.min(i + batchSize, ordersToArchive.length),
          total: ordersToArchive.length,
        });
      }
    }

    const executionTime = Date.now() - startTime;

    logger.info("Order archive job completed successfully", {
      ordersArchived: ordersArchived,
      errors: errors.length,
      executionTime: `${executionTime}ms`,
    });

    return {
      success: true,
      ordersArchived: ordersArchived,
      errors: errors.length > 0 ? errors : undefined,
      executionTime: executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error("Order archive job failed", {
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`,
    });
    throw error;
  }
};

/**
 * Initialize and start order archive job
 * @returns {cron.ScheduledTask|null} - Cron job instance or null if disabled
 */
export const startOrderArchiveJob = () => {
  if (!jobToggles.orderArchive) {
    logger.info("Order archive job is disabled");
    return null;
  }

  if (jobInstance) {
    logger.warn("Order archive job is already running");
    return jobInstance;
  }

  logger.info("Initializing order archive job", {
    schedule: cronSchedules.orderArchive,
    retentionDays: orderArchiveConfig.retentionDays,
  });

  jobInstance = cron.schedule(
    cronSchedules.orderArchive,
    async () => {
      try {
        await executeOrderArchive();
      } catch (error) {
        logger.error("Order archive job execution error", {
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

  logger.info("Order archive job started", {
    schedule: cronSchedules.orderArchive,
  });

  return jobInstance;
};

/**
 * Stop order archive job
 */
export const stopOrderArchiveJob = () => {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logger.info("Order archive job stopped");
  }
};

export default {
  startOrderArchiveJob,
  stopOrderArchiveJob,
  executeOrderArchive, // Export for manual execution if needed
};
