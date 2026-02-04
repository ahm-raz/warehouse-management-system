import { Server } from "socket.io";
import logger from "../logs/logger.js";

/**
 * Socket.io Configuration
 * Initializes and configures Socket.io server with comprehensive logging
 */

let io = null;

/**
 * Initialize Socket.io server
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export const initializeSocket = (server) => {
  try {
    const clientURL = process.env.CLIENT_URL || "http://localhost:5173";
    
    logger.debug("Initializing Socket.io server", {
      clientURL: clientURL,
      transports: ["websocket", "polling"],
    });

    io = new Server(server, {
      cors: {
        origin: clientURL,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    // ==================== SOCKET.IO EVENT LOGGING ====================

    // Server connection event
    io.on("connection", (socket) => {
      logger.info("Socket.io client connected", {
        socketId: socket.id,
        transport: socket.conn.transport.name,
        timestamp: new Date().toISOString(),
      });

      // Client disconnection event
      socket.on("disconnect", (reason) => {
        logger.info("Socket.io client disconnected", {
          socketId: socket.id,
          reason: reason,
          timestamp: new Date().toISOString(),
        });
      });

      // Connection error event
      socket.on("error", (error) => {
        logger.error("Socket.io connection error", {
          socketId: socket.id,
          message: error.message,
          stack: error.stack,
        });
      });

      // Authentication error (future-ready)
      socket.on("auth_error", (error) => {
        logger.warn("Socket.io authentication error", {
          socketId: socket.id,
          message: error.message,
        });
      });
    });

    // Server error event
    io.engine.on("connection_error", (err) => {
      logger.error("Socket.io engine connection error", {
        message: err.message,
        code: err.code,
        context: err.context,
      });
    });

    logger.info("✓ Socket.io initialized successfully", {
      clientURL: clientURL,
    });

    return io;
  } catch (error) {
    logger.error("Failed to initialize Socket.io", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get Socket.io instance
 * @returns {Server} Socket.io server instance
 * @throws {Error} If Socket.io is not initialized
 */
export const getSocket = () => {
  if (!io) {
    const error = new Error("Socket.io not initialized. Call initializeSocket first.");
    logger.error("Socket.io access error", {
      message: error.message,
    });
    throw error;
  }
  return io;
};

export default { initializeSocket, getSocket };

