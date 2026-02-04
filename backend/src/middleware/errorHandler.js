import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";

/**
 * Global Error Handler Middleware
 * Catches all errors and returns standardized JSON response
 * Prevents Express from crashing on errors
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with structured data
  const errorLog = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
    statusCode: err.statusCode || 500,
  };

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new ApiError(404, message);
    errorLog.message = message;
    errorLog.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    const message = `${field} already exists`;
    error = new ApiError(400, message);
    errorLog.message = message;
    errorLog.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors || {})
      .map((val) => val.message)
      .join(", ");
    error = new ApiError(400, message);
    errorLog.message = message;
    errorLog.statusCode = 400;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new ApiError(401, message);
    errorLog.message = message;
    errorLog.statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new ApiError(401, message);
    errorLog.message = message;
    errorLog.statusCode = 401;
  }

  // Determine final status code and message
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || err.message || "Internal Server Error";

  // Log error based on severity
  if (statusCode >= 500) {
    // Server errors - log as error
    logger.error("Server Error", errorLog);
  } else if (statusCode >= 400) {
    // Client errors - log as warn
    logger.warn("Client Error", errorLog);
  } else {
    // Other errors - log as info
    logger.info("Application Error", errorLog);
  }

  // Send standardized error response
  const errorResponse = {
    success: false,
    message: message,
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
    errorResponse.error = {
      name: err.name,
      statusCode: statusCode,
      isOperational: error.isOperational !== undefined ? error.isOperational : false,
    };
  }

  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
