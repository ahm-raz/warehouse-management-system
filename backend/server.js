import dotenv from "dotenv";
import http from "http";
import connectDB from "./src/config/db.js";
import { initializeSocket } from "./src/config/socket.js";
import { initializeSocketHandlers } from "./src/sockets/index.js";
import app from "./app.js";
import logger from "./src/logs/logger.js";

// Load environment variables
dotenv.config();

/**
 * Server Entry Point
 * Initializes database, HTTP server, and Socket.io
 * Implements comprehensive logging and crash protection
 */

const PORT = process.env.PORT || 3000;
let server = null;

/**
 * Start the server
 * Connects to database and starts HTTP server
 */
const startServer = async () => {
  try {
    logger.info("Starting Warehouse Management System server...");
    logger.debug(`Environment: ${process.env.NODE_ENV || "development"}`);
    logger.debug(`Port: ${PORT}`);

    // Connect to database
    logger.info("Connecting to MongoDB...");
    await connectDB();

    // Create HTTP server
    server = http.createServer(app);

    // Initialize Socket.io
    logger.info("Initializing Socket.io...");
    initializeSocket(server);
    initializeSocketHandlers();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(
        `✓ Warehouse Management System is running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
      );
      logger.info(`✓ Server started successfully at ${new Date().toISOString()}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.syscall !== "listen") {
        throw error;
      }

      const bind = typeof PORT === "string" ? `Pipe ${PORT}` : `Port ${PORT}`;

      switch (error.code) {
        case "EACCES":
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case "EADDRINUSE":
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    logger.error("Failed to start server", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

/**
 * Gracefully shutdown the server
 * Closes all connections and exits process
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} signal received: starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      logger.info("Graceful shutdown completed");
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// ==================== CRASH PROTECTION ====================

/**
 * Handle unhandled promise rejections
 * Prevents server crashes from unhandled async errors
 */
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise,
  });

  // Close server gracefully if it exists
  if (server) {
    server.close(() => {
      logger.error("Server closed due to unhandled rejection");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

/**
 * Handle uncaught exceptions
 * Prevents server crashes from synchronous errors
 */
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  // Attempt graceful shutdown
  if (server) {
    server.close(() => {
      logger.error("Server closed due to uncaught exception");
      process.exit(1);
    });
  } else {
    // Exit immediately if server not started
    process.exit(1);
  }
});

// ==================== GRACEFUL SHUTDOWN ====================

/**
 * Handle SIGTERM signal (production shutdown)
 * Used by process managers like PM2
 */
process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});

/**
 * Handle SIGINT signal (development shutdown)
 * Used when pressing Ctrl+C
 */
process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

// ==================== START SERVER ====================

// Start the server
startServer();

// Log server startup attempt
logger.debug("Server initialization started");

