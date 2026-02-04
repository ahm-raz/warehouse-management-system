import cron from "node-cron";
import User from "../models/User.js";
import { verifyRefreshToken } from "../utils/token.js";
import logger from "../logs/logger.js";
import { cronSchedules, jobToggles } from "../config/jobConfig.js";

/**
 * Token Cleanup Job
 * Removes expired refresh tokens from user records
 * Runs every 6 hours
 */

let jobInstance = null;

/**
 * Execute token cleanup
 * @returns {Promise<Object>} - Job execution results
 */
const executeTokenCleanup = async () => {
  const startTime = Date.now();
  let usersProcessed = 0;
  let tokensRemoved = 0;
  let errors = [];

  try {
    logger.info("Starting token cleanup job", {
      timestamp: new Date().toISOString(),
    });

    // Find all users with refresh tokens
    const users = await User.find({
      refreshToken: { $exists: true, $ne: null },
      isDeleted: false,
    }).select("_id email refreshToken").lean();

    logger.debug("Token cleanup: Found users with refresh tokens", {
      count: users.length,
    });

    // Process users in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          try {
            usersProcessed++;

            // Verify if token is still valid
            try {
              verifyRefreshToken(user.refreshToken);
              // Token is valid, keep it
            } catch (error) {
              // Token is expired or invalid, remove it
              if (error.message.includes("expired") || error.message.includes("invalid")) {
                await User.findByIdAndUpdate(user._id, {
                  $unset: { refreshToken: 1 },
                });
                tokensRemoved++;

                logger.debug("Expired refresh token removed", {
                  userId: user._id.toString(),
                  email: user.email,
                });
              } else {
                // Other error (e.g., malformed token), remove it
                await User.findByIdAndUpdate(user._id, {
                  $unset: { refreshToken: 1 },
                });
                tokensRemoved++;

                logger.debug("Invalid refresh token removed", {
                  userId: user._id.toString(),
                  email: user.email,
                  error: error.message,
                });
              }
            }
          } catch (error) {
            errors.push({
              userId: user._id.toString(),
              error: error.message,
            });
            logger.error("Failed to process user token cleanup", {
              userId: user._id.toString(),
              error: error.message,
            });
          }
        })
      );
    }

    const executionTime = Date.now() - startTime;

    logger.info("Token cleanup job completed successfully", {
      usersProcessed: usersProcessed,
      tokensRemoved: tokensRemoved,
      errors: errors.length,
      executionTime: `${executionTime}ms`,
    });

    return {
      success: true,
      usersProcessed: usersProcessed,
      tokensRemoved: tokensRemoved,
      errors: errors.length > 0 ? errors : undefined,
      executionTime: executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error("Token cleanup job failed", {
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`,
    });
    throw error;
  }
};

/**
 * Initialize and start token cleanup job
 * @returns {cron.ScheduledTask|null} - Cron job instance or null if disabled
 */
export const startTokenCleanupJob = () => {
  if (!jobToggles.tokenCleanup) {
    logger.info("Token cleanup job is disabled");
    return null;
  }

  if (jobInstance) {
    logger.warn("Token cleanup job is already running");
    return jobInstance;
  }

  logger.info("Initializing token cleanup job", {
    schedule: cronSchedules.tokenCleanup,
  });

  jobInstance = cron.schedule(
    cronSchedules.tokenCleanup,
    async () => {
      try {
        await executeTokenCleanup();
      } catch (error) {
        logger.error("Token cleanup job execution error", {
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

  logger.info("Token cleanup job started", {
    schedule: cronSchedules.tokenCleanup,
  });

  return jobInstance;
};

/**
 * Stop token cleanup job
 */
export const stopTokenCleanupJob = () => {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logger.info("Token cleanup job stopped");
  }
};

export default {
  startTokenCleanupJob,
  stopTokenCleanupJob,
  executeTokenCleanup, // Export for manual execution if needed
};
