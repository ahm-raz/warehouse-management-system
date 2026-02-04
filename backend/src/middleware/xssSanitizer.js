import xss from "xss-clean";
import logger from "../logs/logger.js";

/**
 * XSS Sanitization Middleware
 * Prevents XSS attacks by sanitizing request data
 * Removes malicious script tags and HTML injection attempts
 */

/**
 * Custom XSS sanitization function
 * Sanitizes nested objects and arrays recursively
 * @param {any} data - Data to sanitize
 * @returns {any} - Sanitized data
 */
const sanitizeData = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Use xss-clean to sanitize strings
    return xss(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === "object") {
    const sanitized = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeData(data[key]);
      }
    }
    return sanitized;
  }

  return data;
};

/**
 * XSS Sanitization Middleware
 * Sanitizes req.body, req.query, and req.params
 * Logs suspicious content for security monitoring
 */
export const xssSanitizer = (req, res, next) => {
  try {
    let sanitized = false;

    // Sanitize request body
    if (req.body && typeof req.body === "object") {
      const originalBody = JSON.stringify(req.body);
      req.body = sanitizeData(req.body);
      const sanitizedBody = JSON.stringify(req.body);

      if (originalBody !== sanitizedBody) {
        sanitized = true;
        logger.warn("XSS sanitization: Request body sanitized", {
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
      req.query = sanitizeData(req.query);
      const sanitizedQuery = JSON.stringify(req.query);

      if (originalQuery !== sanitizedQuery) {
        sanitized = true;
        logger.warn("XSS sanitization: Query parameters sanitized", {
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
      req.params = sanitizeData(req.params);
      const sanitizedParams = JSON.stringify(req.params);

      if (originalParams !== sanitizedParams) {
        sanitized = true;
        logger.warn("XSS sanitization: Route parameters sanitized", {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip || req.clientIp,
          userId: req.user?.userId,
        });
      }
    }

    next();
  } catch (error) {
    logger.error("XSS sanitization error", {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });
    // Continue request even if sanitization fails (fail open)
    next();
  }
};

export default xssSanitizer;
