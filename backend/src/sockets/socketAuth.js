import { verifyAccessToken } from "../utils/token.js";
import User from "../models/User.js";
import logger from "../logs/logger.js";

/**
 * Socket Authentication Middleware
 * Authenticates socket connections using JWT access tokens
 * Validates user existence, active status, and attaches user data to socket
 */

/**
 * Authenticate socket connection
 * Extracts and verifies JWT token from handshake
 * @param {Object} socket - Socket.io socket instance
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
export const authenticateSocket = async (socket, next) => {
  try {
    // Extract token from handshake.auth.token or Authorization header
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
      null;

    if (!token) {
      logger.warn("Socket connection rejected: No token provided", {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error("Authentication required: No token provided"));
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (tokenError) {
      logger.warn("Socket connection rejected: Invalid token", {
        socketId: socket.id,
        error: tokenError.message,
        ip: socket.handshake.address,
      });
      return next(new Error("Authentication failed: Invalid token"));
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select("+password");

    if (!user) {
      logger.warn("Socket connection rejected: User not found", {
        socketId: socket.id,
        userId: decoded.userId,
        ip: socket.handshake.address,
      });
      return next(new Error("Authentication failed: User not found"));
    }

    // Check if user is deleted
    if (user.isDeleted) {
      logger.warn("Socket connection rejected: User deleted", {
        socketId: socket.id,
        userId: user._id.toString(),
        ip: socket.handshake.address,
      });
      return next(new Error("Authentication failed: User account deleted"));
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn("Socket connection rejected: User inactive", {
        socketId: socket.id,
        userId: user._id.toString(),
        ip: socket.handshake.address,
      });
      return next(new Error("Authentication failed: User account inactive"));
    }

    // Attach user data to socket object
    socket.user = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    logger.info("Socket authenticated successfully", {
      socketId: socket.id,
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      ip: socket.handshake.address,
    });

    next();
  } catch (error) {
    logger.error("Socket authentication error", {
      socketId: socket.id,
      error: error.message,
      stack: error.stack,
      ip: socket.handshake.address,
    });
    next(new Error("Authentication failed: Internal server error"));
  }
};

/**
 * Optional authentication middleware
 * Allows connections without authentication but marks them as unauthenticated
 * Useful for public events or future guest access
 * @param {Object} socket - Socket.io socket instance
 * @param {Function} next - Next middleware function
 */
export const optionalAuthenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
      null;

    if (token) {
      // Try to authenticate if token provided
      await authenticateSocket(socket, next);
    } else {
      // Allow connection without authentication
      socket.user = null;
      next();
    }
  } catch (error) {
    // Allow connection even if authentication fails
    socket.user = null;
    next();
  }
};
