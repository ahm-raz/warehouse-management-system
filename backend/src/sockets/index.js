import { getSocket } from "../config/socket.js";
import logger from "../logs/logger.js";

/**
 * Socket.io Event Handlers
 * Centralized place for all socket event handling
 * Implements comprehensive logging for socket events
 */

/**
 * Initialize socket event handlers
 * Sets up custom event handlers for warehouse management operations
 */
export const initializeSocketHandlers = () => {
  try {
    const io = getSocket();

    // Handle all socket connections
    io.on("connection", (socket) => {
      logger.info("Socket.io custom handler: client connected", {
        socketId: socket.id,
        transport: socket.conn.transport.name,
      });

      // Disconnection event
      socket.on("disconnect", (reason) => {
        logger.info("Socket.io custom handler: client disconnected", {
          socketId: socket.id,
          reason: reason,
        });
      });

      // Error handling
      socket.on("error", (error) => {
        logger.error("Socket.io custom handler: error", {
          socketId: socket.id,
          message: error.message,
          stack: error.stack,
        });
      });

      // Example: Handle warehouse updates
      socket.on("warehouse:update", (data) => {
        logger.info("Warehouse update received via Socket.io", {
          socketId: socket.id,
          data: data,
        });
        // Broadcast to other clients
        socket.broadcast.emit("warehouse:updated", data);
      });

      // Example: Handle inventory changes
      socket.on("inventory:change", (data) => {
        logger.info("Inventory change received via Socket.io", {
          socketId: socket.id,
          data: data,
        });
        // Broadcast to other clients
        socket.broadcast.emit("inventory:changed", data);
      });
    });

    logger.info("✓ Socket.io event handlers initialized successfully");
  } catch (error) {
    logger.error("Error initializing socket handlers", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default { initializeSocketHandlers };

