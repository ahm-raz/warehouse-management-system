import { Server } from "socket.io";
import logger from "../utils/logger.js";

/**
 * Socket.io Configuration
 * Initializes and configures Socket.io server
 */

let io = null;

/**
 * Initialize Socket.io server
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  logger.info("Socket.io initialized");
  return io;
};

/**
 * Get Socket.io instance
 * @returns {Server} Socket.io server instance
 */
export const getSocket = () => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initializeSocket first.");
  }
  return io;
};

export default { initializeSocket, getSocket };
