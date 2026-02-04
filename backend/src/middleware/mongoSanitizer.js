import logger from "../logs/logger.js";

/**
 * MongoDB Sanitization Middleware
 * Prevents NoSQL injection attacks by sanitizing request data
 * Removes dangerous MongoDB operators ($, .) from user input
 */

/**
 * Check if value contains MongoDB operators
 * @param {any} value - Value to check
 * @returns {boolean} - True if contains dangerous operators
 */
const containsDangerousOperators = (value) => {
  if (typeof value === "string") {
    // Check for MongoDB operators
    return /[\$\.]/.test(value);
  }
  return false;
};

/**
 * Sanitize object recursively
 * Removes $ and . from keys and values
 * @param {any} data - Data to sanitize
 * @param {string} path - Current path in object (for logging)
 * @returns {any} - Sanitized data
 */
const sanitizeObject = (data, path = "") => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item, index) =>
      sanitizeObject(item, `${path}[${index}]`)
    );
  }

  if (typeof data === "object" && !(data instanceof Date)) {
    const sanitized = {};
    let wasSanitized = false;

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Check if key contains dangerous operators
        if (key.startsWith("$") || key.includes(".")) {
          wasSanitized = true;
          logger.warn("MongoDB sanitization: Dangerous operator in key", {
            key: key,
            path: path,
            value: JSON.stringify(data[key]),
          });
          // Skip this key (don't include in sanitized object)
          continue;
        }

        // Sanitize value
        const sanitizedValue = sanitizeObject(
          data[key],
          path ? `${path}.${key}` : key
        );

        // Check if value was sanitized
        if (sanitizedValue !== data[key]) {
          wasSanitized = true;
        }

        sanitized[key] = sanitizedValue;
      }
    }

    if (wasSanitized) {
      logger.warn("MongoDB sanitization: Object sanitized", {
        path: path || "root",
        originalKeys: Object.keys(data),
        sanitizedKeys: Object.keys(sanitized),
      });
    }

    return sanitized;
  }

  if (typeof data === "string") {
    // Remove $ and . from string values (but preserve file extensions)
    // Only remove if it looks like an operator, not a valid part of the string
    if (containsDangerousOperators(data)) {
      // Check if it's a MongoDB operator pattern
      const operatorPattern = /^\$[a-z]+$/i; // Matches $gt, $lt, $ne, etc.
      if (operatorPattern.test(data)) {
        logger.warn("MongoDB sanitization: MongoDB operator detected in value", {
          value: data,
          path: path,
        });
        return ""; // Remove operator
      }
    }
  }

  return data;
};

/**
 * MongoDB Sanitization Middleware
 * Sanitizes req.body, req.query, and req.params
 * Prevents NoSQL injection attacks
 */
export const mongoSanitizer = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === "object") {
      const originalBody = JSON.stringify(req.body);
      req.body = sanitizeObject(req.body, "body");
      const sanitizedBody = JSON.stringify(req.body);

      if (originalBody !== sanitizedBody) {
        logger.warn("MongoDB sanitization: Request body sanitized", {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip || req.clientIp,
          userId: req.user?.userId,
        });
      }
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === "object") {
      const originalQuery = JSON.stringify(req.query);
      req.query = sanitizeObject(req.query, "query");
      const sanitizedQuery = JSON.stringify(req.query);

      if (originalQuery !== sanitizedQuery) {
        logger.warn("MongoDB sanitization: Query parameters sanitized", {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip || req.clientIp,
          userId: req.user?.userId,
        });
      }
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === "object") {
      const originalParams = JSON.stringify(req.params);
      req.params = sanitizeObject(req.params, "params");
      const sanitizedParams = JSON.stringify(req.params);

      if (originalParams !== sanitizedParams) {
        logger.warn("MongoDB sanitization: Route parameters sanitized", {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip || req.clientIp,
          userId: req.user?.userId,
        });
      }
    }

    next();
  } catch (error) {
    logger.error("MongoDB sanitization error", {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });
    // Continue request even if sanitization fails (fail open)
    next();
  }
};

export default mongoSanitizer;
