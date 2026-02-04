import logger from "../logs/logger.js";

/**
 * IP Logging Middleware
 * Captures and logs client IP address for security monitoring
 * Supports proxy headers (X-Forwarded-For, X-Real-IP)
 */

/**
 * Extract client IP address from request
 * Checks proxy headers and connection info
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
const extractClientIP = (req) => {
  // Check X-Forwarded-For header (first IP in chain)
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // Take the first one (original client)
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    return ips[0];
  }

  // Check X-Real-IP header
  const xRealIP = req.headers["x-real-ip"];
  if (xRealIP) {
    return xRealIP.trim();
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfConnectingIP = req.headers["cf-connecting-ip"];
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // Fallback to Express req.ip (works with trust proxy)
  if (req.ip) {
    return req.ip;
  }

  // Fallback to connection remote address
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  // Last resort
  return "unknown";
};

/**
 * IP Logging Middleware
 * Captures client IP and attaches to request object
 * Logs IP with every request for security monitoring
 */
export const ipLogger = (req, res, next) => {
  try {
    // Extract and store client IP
    const clientIP = extractClientIP(req);
    req.clientIp = clientIP;

    // Log IP with request (debug level to avoid log spam)
    logger.debug("Request IP captured", {
      ip: clientIP,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.headers["user-agent"],
    });

    next();
  } catch (error) {
    logger.error("IP logging error", {
      error: error.message,
      stack: error.stack,
    });
    // Set default IP if extraction fails
    req.clientIp = "unknown";
    next();
  }
};

export default ipLogger;
