import mongoose from "mongoose";
import logger from "../logs/logger.js";

/**
 * MongoDB Database Connection
 * Handles connection with retry logic and comprehensive error handling
 * Implements event logging for all database operations
 */

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    logger.error("Database connection failed: MONGO_URI is not defined in environment variables");
    process.exit(1);
  }

  // Mask password in logs for security
  const maskedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
  logger.debug(`Attempting to connect to MongoDB: ${maskedURI}`);

  let retries = 0;

  const attemptConnection = async () => {
    try {
      logger.info(`MongoDB connection attempt ${retries + 1}/${MAX_RETRIES}...`);

      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info(`✓ MongoDB Connected successfully`, {
        host: conn.connection.host,
        database: conn.connection.name,
        port: conn.connection.port,
        readyState: conn.connection.readyState,
      });

      // ==================== DATABASE EVENT LOGGING ====================

      // Connection error event
      mongoose.connection.on("error", (err) => {
        logger.error("MongoDB connection error", {
          message: err.message,
          name: err.name,
          stack: err.stack,
        });
      });

      // Connection disconnected event
      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected", {
          timestamp: new Date().toISOString(),
        });
      });

      // Connection reconnected event
      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected", {
          host: conn.connection.host,
          timestamp: new Date().toISOString(),
        });
      });

      // Connection opened event
      mongoose.connection.on("connected", () => {
        logger.debug("MongoDB connection opened", {
          host: conn.connection.host,
        });
      });

      // Connection timeout event
      mongoose.connection.on("timeout", () => {
        logger.warn("MongoDB connection timeout");
      });

      // Graceful shutdown handler
      const closeConnection = async () => {
        try {
          await mongoose.connection.close();
          logger.info("MongoDB connection closed gracefully");
        } catch (error) {
          logger.error("Error closing MongoDB connection", {
            message: error.message,
          });
        }
      };

      // Register shutdown handlers
      process.on("SIGINT", closeConnection);
      process.on("SIGTERM", closeConnection);

    } catch (error) {
      retries++;
      
      logger.error(`MongoDB connection attempt ${retries} failed`, {
        attempt: retries,
        maxRetries: MAX_RETRIES,
        message: error.message,
        name: error.name,
        code: error.code,
      });

      if (retries < MAX_RETRIES) {
        logger.info(`Retrying MongoDB connection in ${RETRY_DELAY / 1000} seconds...`, {
          nextAttempt: retries + 1,
          maxRetries: MAX_RETRIES,
        });
        setTimeout(attemptConnection, RETRY_DELAY);
      } else {
        logger.error("Max retries reached. Failed to connect to MongoDB", {
          totalAttempts: retries,
          finalError: error.message,
        });
        process.exit(1);
      }
    }
  };

  await attemptConnection();
};

export default connectDB;

