import logger from "../logs/logger.js";
import { initializeSocketRooms, leaveAllRooms } from "./socketRooms.js";

/**
 * Socket Event Handlers
 * Registers and handles all socket.io events
 * Separates event logic cleanly for maintainability
 */

/**
 * Handle socket connection
 * Initializes rooms and sets up event listeners
 * @param {Object} socket - Socket.io socket instance
 */
export const handleConnection = (socket) => {
  try {
    logger.info("Socket client connected", {
      socketId: socket.id,
      userId: socket.user?.userId,
      email: socket.user?.email,
      role: socket.user?.role,
      ip: socket.handshake.address,
      transport: socket.conn.transport.name,
      timestamp: new Date().toISOString(),
    });

    // Initialize rooms for authenticated user
    if (socket.user) {
      initializeSocketRooms(socket);
    }

    // Register event listeners
    registerEventListeners(socket);
  } catch (error) {
    logger.error("Error handling socket connection", {
      socketId: socket.id,
      error: error.message,
      stack: error.stack,
    });
  }
};

/**
 * Handle socket disconnection
 * Cleans up rooms and logs disconnection
 * @param {Object} socket - Socket.io socket instance
 * @param {string} reason - Disconnection reason
 */
export const handleDisconnection = (socket, reason) => {
  try {
    logger.info("Socket client disconnected", {
      socketId: socket.id,
      userId: socket.user?.userId,
      email: socket.user?.email,
      role: socket.user?.role,
      reason: reason,
      timestamp: new Date().toISOString(),
    });

    // Leave all rooms
    leaveAllRooms(socket);
  } catch (error) {
    logger.error("Error handling socket disconnection", {
      socketId: socket.id,
      error: error.message,
      stack: error.stack,
    });
  }
};

/**
 * Handle socket errors
 * Logs errors and prevents server crash
 * @param {Object} socket - Socket.io socket instance
 * @param {Error} error - Error object
 */
export const handleError = (socket, error) => {
  logger.error("Socket error", {
    socketId: socket.id,
    userId: socket.user?.userId,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Register all socket event listeners
 * Separates event logic for maintainability
 * @param {Object} socket - Socket.io socket instance
 */
const registerEventListeners = (socket) => {
  // Handle ping/pong for connection health
  socket.on("ping", () => {
    try {
      socket.emit("pong", { timestamp: new Date().toISOString() });
      logger.debug("Socket ping received", {
        socketId: socket.id,
        userId: socket.user?.userId,
      });
    } catch (error) {
      logger.error("Error handling ping", {
        socketId: socket.id,
        error: error.message,
      });
    }
  });

  // Handle custom client events (if needed in future)
  socket.on("client:event", (data) => {
    try {
      logger.debug("Client event received", {
        socketId: socket.id,
        userId: socket.user?.userId,
        eventData: data,
      });

      // Handle client events here if needed
      // Example: socket.emit("server:response", { ... });
    } catch (error) {
      logger.error("Error handling client event", {
        socketId: socket.id,
        error: error.message,
      });
    }
  });

  // Handle reconnection
  socket.on("reconnect", (attemptNumber) => {
    try {
      logger.info("Socket reconnected", {
        socketId: socket.id,
        userId: socket.user?.userId,
        attemptNumber: attemptNumber,
      });

      // Reinitialize rooms on reconnect
      if (socket.user) {
        initializeSocketRooms(socket);
      }
    } catch (error) {
      logger.error("Error handling reconnection", {
        socketId: socket.id,
        error: error.message,
      });
    }
  });

  // Handle reconnection attempts
  socket.on("reconnect_attempt", (attemptNumber) => {
    logger.debug("Socket reconnection attempt", {
      socketId: socket.id,
      userId: socket.user?.userId,
      attemptNumber: attemptNumber,
    });
  });

  // Handle reconnection errors
  socket.on("reconnect_error", (error) => {
    logger.warn("Socket reconnection error", {
      socketId: socket.id,
      userId: socket.user?.userId,
      error: error.message,
    });
  });

  // Handle reconnection failures
  socket.on("reconnect_failed", () => {
    logger.error("Socket reconnection failed", {
      socketId: socket.id,
      userId: socket.user?.userId,
    });
  });
};
