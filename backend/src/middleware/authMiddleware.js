import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/token.js";
import User from "../models/User.js";
import logger from "../logs/logger.js";

/**
 * Authentication Middleware
 * Verifies JWT access token and attaches user info to request
 * Supports token extraction from Authorization header and cookies
 */

/**
 * Extract token from request
 * Checks Authorization header (Bearer token) and cookies
 * @param {Object} req - Express request object
 * @returns {string|null} - Extracted token or null
 */
const extractToken = (req) => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookies (optional, for convenience)
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token
    const token = extractToken(req);

    if (!token) {
      logger.warn("Authentication attempt without token", {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      throw new ApiError(401, "Authentication required. Please provide a token.");
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      logger.warn("Invalid token used", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });

      if (error.message.includes("expired")) {
        throw new ApiError(401, "Token expired. Please refresh your token.");
      }
      throw new ApiError(401, "Invalid token.");
    }

    // Verify token type
    if (decoded.type !== "access") {
      logger.warn("Wrong token type used", {
        tokenType: decoded.type,
        url: req.originalUrl,
        method: req.method,
      });
      throw new ApiError(401, "Invalid token type.");
    }

    // Check if user exists, is active, and not deleted
    const user = await User.findOne({
      _id: decoded.userId,
      isDeleted: false,
    });

    if (!user) {
      logger.warn("Token for non-existent or deleted user", {
        userId: decoded.userId,
        url: req.originalUrl,
        method: req.method,
      });
      throw new ApiError(401, "User not found.");
    }

    if (!user.isActive) {
      logger.warn("Token for inactive user", {
        userId: user._id,
        email: user.email,
        url: req.originalUrl,
        method: req.method,
      });
      throw new ApiError(403, "Account is deactivated.");
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 * Checks if user has required role(s)
 * @param {...string} roles - Allowed roles
 * @returns {Function} - Express middleware function
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn("Authorization attempt without authentication", {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      throw new ApiError(401, "Authentication required.");
    }

    if (!roles.includes(req.user.role)) {
      logger.warn("Unauthorized role access attempt", {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
        url: req.originalUrl,
        method: req.method,
      });
      throw new ApiError(
        403,
        `Access denied. Required role: ${roles.join(" or ")}`
      );
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyAccessToken(token);

      if (decoded.type === "access") {
        const user = await User.findById(decoded.userId);

        if (user && user.isActive) {
          req.user = {
            userId: decoded.userId,
            role: decoded.role,
            email: user.email,
          };
        }
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional authentication
    next();
  }
};
