import rateLimit from "express-rate-limit";
import logger from "../../logs/logger.js";

/**
 * Route-Based Rate Limiting Configuration
 * Implements different rate limits for different endpoints
 * Prevents abuse and brute force attacks
 */

/**
 * Get rate limit configuration from environment variables
 */
const getRateLimitConfig = (defaultWindow, defaultMax) => {
  const windowMs =
    parseInt(process.env.RATE_LIMIT_WINDOW) || defaultWindow * 60 * 1000;
  const max = parseInt(process.env.RATE_LIMIT_MAX) || defaultMax;

  return { windowMs, max };
};

/**
 * Rate limit handler
 * Logs rate limit violations for security monitoring
 */
const createRateLimitHandler = (limiterName) => {
  return (req, res) => {
    logger.warn("Rate limit exceeded", {
      limiter: limiterName,
      ip: req.ip || req.clientIp,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.userId,
    });

    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  };
};

/**
 * Global Rate Limiter
 * Applied to all API routes
 * 100 requests per 15 minutes (configurable)
 */
const globalConfig = getRateLimitConfig(15, 100);
export const globalLimiter = rateLimit({
  windowMs: globalConfig.windowMs,
  max: globalConfig.max,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("global"),
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === "/api/health";
  },
});

/**
 * Authentication Rate Limiter
 * Strict rate limiting for login/register endpoints
 * 5 requests per minute (configurable)
 */
const authConfig = getRateLimitConfig(1, 5);
export const authLimiter = rateLimit({
  windowMs: authConfig.windowMs,
  max: authConfig.max,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("authentication"),
  skipSuccessfulRequests: false, // Count all requests, including successful ones
});

/**
 * Upload Rate Limiter
 * Limits file upload requests
 * 10 requests per minute (configurable)
 */
const uploadConfig = getRateLimitConfig(1, 10);
export const uploadLimiter = rateLimit({
  windowMs: uploadConfig.windowMs,
  max: uploadConfig.max,
  message: {
    success: false,
    message: "Too many upload requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("upload"),
});

/**
 * Reporting Rate Limiter
 * Limits report generation requests
 * 30 requests per minute (configurable)
 */
const reportConfig = getRateLimitConfig(1, 30);
export const reportLimiter = rateLimit({
  windowMs: reportConfig.windowMs,
  max: reportConfig.max,
  message: {
    success: false,
    message: "Too many report requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("report"),
});

/**
 * Socket Event Rate Limiter (in-memory)
 * Basic protection for socket events
 * Note: This is a simple implementation; for production, consider Redis-based rate limiting
 */
const socketEventLimits = new Map();

export const checkSocketEventRateLimit = (socketId, eventName, maxEvents = 100, windowMs = 60000) => {
  const key = `${socketId}:${eventName}`;
  const now = Date.now();
  const record = socketEventLimits.get(key);

  if (!record) {
    socketEventLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > record.resetTime) {
    socketEventLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxEvents) {
    logger.warn("Socket event rate limit exceeded", {
      socketId: socketId,
      eventName: eventName,
      count: record.count,
    });
    return false;
  }

  record.count++;
  return true;
};

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of socketEventLimits.entries()) {
    if (now > record.resetTime) {
      socketEventLimits.delete(key);
    }
  }
}, 60000); // Clean up every minute

logger.info("Rate limiters configured", {
  global: `${globalConfig.max} requests per ${globalConfig.windowMs / 1000 / 60} minutes`,
  authentication: `${authConfig.max} requests per ${authConfig.windowMs / 1000 / 60} minutes`,
  upload: `${uploadConfig.max} requests per ${uploadConfig.windowMs / 1000 / 60} minutes`,
  report: `${reportConfig.max} requests per ${reportConfig.windowMs / 1000 / 60} minutes`,
});

export default {
  globalLimiter,
  authLimiter,
  uploadLimiter,
  reportLimiter,
  checkSocketEventRateLimit,
};
