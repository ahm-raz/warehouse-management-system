import mongoose from "mongoose";
import logger from "../utils/logger.js";

/**
 * MongoDB Database Connection
 * Handles connection with retry logic and error handling
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
    logger.error("MONGO_URI is not defined in environment variables");
    process.exit(1);
  }

  let retries = 0;

  const attemptConnection = async () => {
    try {
      const conn = await mongoose.connect(mongoURI, {
        // Mongoose 6+ options
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on("error", (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
      });

      // Graceful shutdown
      process.on("SIGINT", async () => {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed due to app termination");
        process.exit(0);
      });

    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries} failed: ${error.message}`);

      if (retries < MAX_RETRIES) {
        logger.info(`Retrying connection in ${RETRY_DELAY / 1000} seconds...`);
        setTimeout(attemptConnection, RETRY_DELAY);
      } else {
        logger.error("Max retries reached. Failed to connect to MongoDB");
        process.exit(1);
      }
    }
  };

  await attemptConnection();
};

export default connectDB;
