import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";

/**
 * Not Found Middleware
 * Handles 404 errors for routes that don't exist
 * Must be placed after all routes but before error handler
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  // Log 404 requests
  logger.warn("Route not found", {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip || req.connection?.remoteAddress,
  });

  const error = new ApiError(
    404,
    `Route ${req.originalUrl} not found`
  );
  next(error);
};

export default notFound;
