import dotenv from "dotenv";
import http from "http";
import connectDB from "./src/config/db.js";
import { initializeSocket } from "./src/config/socket.js";
import { initializeSocketHandlers } from "./src/sockets/index.js";
import app from "./app.js";
import logger from "./src/utils/logger.js";

// Load environment variables
dotenv.config();

/**
 * Server Entry Point
 * Initializes database, HTTP server, and Socket.io
 */

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);
initializeSocketHandlers();

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(
        `Warehouse Management System is running on port ${PORT} in ${process.env.NODE_ENV} mode`
      );
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  logger.error(err.stack);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

// Start the server
startServer();
