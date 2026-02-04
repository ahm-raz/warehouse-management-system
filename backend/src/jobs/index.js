import logger from "../logs/logger.js";
import { startLowStockScanJob, stopLowStockScanJob } from "./lowStockScanJob.js";
import { startTokenCleanupJob, stopTokenCleanupJob } from "./tokenCleanupJob.js";
import { startOrderArchiveJob, stopOrderArchiveJob } from "./orderArchiveJob.js";
import { startDailySummaryJob, stopDailySummaryJob } from "./dailySummaryJob.js";
import { jobToggles } from "../config/jobConfig.js";

/**
 * Background Job Scheduler
 * Central initialization and management of all background jobs
 * Prevents duplicate job registration and handles graceful shutdown
 */

let jobsInitialized = false;
const activeJobs = [];

/**
 * Initialize all background jobs
 * Starts all enabled jobs based on configuration
 * @returns {Object} - Status of job initialization
 */
export const initializeJobs = () => {
  if (jobsInitialized) {
    logger.warn("Background jobs are already initialized");
    return {
      success: false,
      message: "Jobs already initialized",
    };
  }

  logger.info("Initializing background jobs", {
    enabledJobs: {
      lowStockScan: jobToggles.lowStockScan,
      tokenCleanup: jobToggles.tokenCleanup,
      orderArchive: jobToggles.orderArchive,
      dailySummary: jobToggles.dailySummary,
    },
  });

  try {
    // Initialize Low Stock Scan Job
    if (jobToggles.lowStockScan) {
      const job = startLowStockScanJob();
      if (job) {
        activeJobs.push({ name: "lowStockScan", instance: job });
        logger.info("✓ Low stock scan job initialized");
      }
    }

    // Initialize Token Cleanup Job
    if (jobToggles.tokenCleanup) {
      const job = startTokenCleanupJob();
      if (job) {
        activeJobs.push({ name: "tokenCleanup", instance: job });
        logger.info("✓ Token cleanup job initialized");
      }
    }

    // Initialize Order Archive Job
    if (jobToggles.orderArchive) {
      const job = startOrderArchiveJob();
      if (job) {
        activeJobs.push({ name: "orderArchive", instance: job });
        logger.info("✓ Order archive job initialized");
      }
    }

    // Initialize Daily Summary Job
    if (jobToggles.dailySummary) {
      const job = startDailySummaryJob();
      if (job) {
        activeJobs.push({ name: "dailySummary", instance: job });
        logger.info("✓ Daily summary job initialized");
      }
    }

    jobsInitialized = true;

    logger.info("Background jobs initialized successfully", {
      totalJobs: activeJobs.length,
      jobNames: activeJobs.map((j) => j.name),
    });

    return {
      success: true,
      message: "All background jobs initialized",
      activeJobs: activeJobs.map((j) => j.name),
    };
  } catch (error) {
    logger.error("Failed to initialize background jobs", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Stop all background jobs
 * Gracefully shuts down all active jobs
 * @returns {Promise<void>}
 */
export const stopAllJobs = async () => {
  if (!jobsInitialized) {
    logger.warn("No background jobs to stop");
    return;
  }

  logger.info("Stopping all background jobs", {
    activeJobsCount: activeJobs.length,
  });

  try {
    // Stop all jobs
    stopLowStockScanJob();
    stopTokenCleanupJob();
    stopOrderArchiveJob();
    stopDailySummaryJob();

    // Clear active jobs array
    activeJobs.length = 0;
    jobsInitialized = false;

    logger.info("All background jobs stopped successfully");
  } catch (error) {
    logger.error("Error stopping background jobs", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get status of all background jobs
 * @returns {Object} - Status information
 */
export const getJobsStatus = () => {
  return {
    initialized: jobsInitialized,
    activeJobs: activeJobs.map((j) => j.name),
    enabledJobs: {
      lowStockScan: jobToggles.lowStockScan,
      tokenCleanup: jobToggles.tokenCleanup,
      orderArchive: jobToggles.orderArchive,
      dailySummary: jobToggles.dailySummary,
    },
  };
};

export default {
  initializeJobs,
  stopAllJobs,
  getJobsStatus,
};
