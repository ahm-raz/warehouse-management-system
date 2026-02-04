import { Server } from "socket.io";
import logger from "../logs/logger.js";
import { authenticateSocket } from "./socketAuth.js";
import { handleConnection, handleDisconnection, handleError } from "./socketEvents.js";

/**
 * Socket.io Real-time Infrastructure
 * Main socket server initialization and configuration
 * Supports JWT authentication, room management, and event broadcasting
 * 
 * Architecture Notes:
 * - Current implementation uses in-memory room management
 * - Future: Can be extended with Redis adapter for horizontal scaling
 *   Example: io.adapter(createAdapter(redisClient))
 * - Room structure supports multi-server deployment
 */

let io = null;

/**
 * Initialize Socket.io server
 * Attaches to HTTP server with authentication and event handling
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export const initializeSocket = (server) => {
  try {
    const clientURL = process.env.CLIENT_URL || "http://localhost:5173";

    logger.info("Initializing Socket.io server", {
      clientURL: clientURL,
      transports: ["websocket", "polling"],
    });

    // Create Socket.io server instance
    io = new Server(server, {
      cors: {
        origin: clientURL,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      // Enable reconnection
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      // Connection timeout
      connectTimeout: 45000,
      // Ping/pong for connection health
      pingTimeout: 20000,
      pingInterval: 25000,
    });

    // ==================== AUTHENTICATION MIDDLEWARE ====================
    // Apply authentication middleware to all connections
    io.use(authenticateSocket);

    // ==================== CONNECTION EVENT HANDLERS ====================

    io.on("connection", (socket) => {
      // Handle successful connection
      handleConnection(socket);

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        handleDisconnection(socket, reason);
      });

      // Handle errors
      socket.on("error", (error) => {
        handleError(socket, error);
      });
    });

    // ==================== SERVER-LEVEL ERROR HANDLING ====================

    // Engine connection errors
    io.engine.on("connection_error", (err) => {
      logger.error("Socket.io engine connection error", {
        message: err.message,
        code: err.code,
        context: err.context,
      });
    });

    // Server errors
    io.on("error", (error) => {
      logger.error("Socket.io server error", {
        error: error.message,
        stack: error.stack,
      });
    });

    logger.info("✓ Socket.io initialized successfully", {
      clientURL: clientURL,
      transports: ["websocket", "polling"],
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

/**
 * Close Socket.io server gracefully
 * Useful for graceful shutdown
 * @returns {Promise<void>}
 */
export const closeSocket = async () => {
  if (io) {
    return new Promise((resolve) => {
      io.close(() => {
        logger.info("Socket.io server closed", {
          timestamp: new Date().toISOString(),
        });
        io = null;
        resolve();
      });
    });
  }
};

export default { initializeSocket, getSocket, closeSocket };