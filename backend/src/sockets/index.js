import { getSocket } from "../config/socket.js";
import logger from "../utils/logger.js";

/**
 * Socket.io Event Handlers
 * Centralized place for all socket event handling
 */

/**
 * Initialize socket event handlers
 */
export const initializeSocketHandlers = () => {
  try {
    const io = getSocket();

    // Handle all socket connections
    io.on("connection", (socket) => {
      logger.info(`Socket client connected: ${socket.id}`);

      // Disconnection event
      socket.on("disconnect", () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });

      // Error handling
      socket.on("error", (error) => {
        logger.error(`Socket error: ${error.message}`);
      });

      // Example: Handle warehouse updates
      socket.on("warehouse:update", (data) => {
        logger.info(`Warehouse update received: ${JSON.stringify(data)}`);
        // Broadcast to other clients
        socket.broadcast.emit("warehouse:updated", data);
      });

      // Example: Handle inventory changes
      socket.on("inventory:change", (data) => {
        logger.info(`Inventory change received: ${JSON.stringify(data)}`);
        // Broadcast to other clients
        socket.broadcast.emit("inventory:changed", data);
      });
    });

    logger.info("Socket event handlers initialized");
  } catch (error) {
    logger.error(`Error initializing socket handlers: ${error.message}`);
  }
};

export default { initializeSocketHandlers };
