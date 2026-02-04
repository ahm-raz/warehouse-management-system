/**
 * Background Job Configuration
 * Configurable schedules, retention periods, and feature toggles for all background jobs
 */

/**
 * Job Feature Toggles
 * Enable/disable specific jobs via environment variables
 */
export const jobToggles = {
  lowStockScan: process.env.JOB_ENABLE_LOW_STOCK_SCAN !== "false", // Default: enabled
  orderArchive: process.env.JOB_ENABLE_ORDER_ARCHIVE !== "false", // Default: enabled
  dailySummary: process.env.JOB_ENABLE_DAILY_SUMMARY !== "false", // Default: enabled
  tokenCleanup: process.env.JOB_ENABLE_TOKEN_CLEANUP !== "false", // Default: enabled
};

/**
 * Cron Schedule Configuration
 * All schedules use cron syntax: minute hour day month dayOfWeek
 */
export const cronSchedules = {
  // Daily at midnight (00:00)
  dailyLowStockScan: process.env.JOB_LOW_STOCK_SCHEDULE || "0 0 * * *",

  // Every 6 hours
  tokenCleanup: process.env.JOB_TOKEN_CLEANUP_SCHEDULE || "0 */6 * * *",

  // Daily at 2 AM
  orderArchive: process.env.JOB_ORDER_ARCHIVE_SCHEDULE || "0 2 * * *",

  // Daily at 11:59 PM
  dailySummary: process.env.JOB_DAILY_SUMMARY_SCHEDULE || "59 23 * * *",
};

/**
 * Order Archive Configuration
 */
export const orderArchiveConfig = {
  // Retention period in days (orders older than this will be archived)
  retentionDays: parseInt(process.env.ORDER_ARCHIVE_RETENTION_DAYS) || 30,

  // Batch size for processing orders (to avoid memory issues)
  batchSize: parseInt(process.env.ORDER_ARCHIVE_BATCH_SIZE) || 100,
};

/**
 * Job Execution Configuration
 */
export const jobExecutionConfig = {
  // Time zone for cron schedules (default: UTC)
  timezone: process.env.JOB_TIMEZONE || "UTC",

  // Maximum execution time for jobs (in milliseconds)
  maxExecutionTime: parseInt(process.env.JOB_MAX_EXECUTION_TIME) || 300000, // 5 minutes
};

export default {
  jobToggles,
  cronSchedules,
  orderArchiveConfig,
  jobExecutionConfig,
};
