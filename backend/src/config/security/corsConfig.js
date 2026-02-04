import cors from "cors";
import logger from "../../logs/logger.js";

/**
 * Secure CORS Configuration
 * Implements strict CORS policy following security best practices
 * Only allows requests from authorized origins
 */

const clientURL = process.env.CLIENT_URL || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Allowed origins
 * In production, only allow CLIENT_URL
 * In development, allow localhost variants for easier development
 */
const getAllowedOrigins = () => {
  const origins = [clientURL];

  if (!isProduction) {
    // Allow localhost variants in development
    origins.push(
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000"
    );
  }

  return origins.filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

/**
 * CORS Options
 * Strict configuration for production security
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    // Only in development - in production, require origin
    if (!origin && !isProduction) {
      logger.debug("CORS: Allowing request with no origin (development mode)", {
        url: origin,
      });
      return callback(null, true);
    }

    // Reject requests with no origin in production
    if (!origin && isProduction) {
      logger.warn("CORS: Rejected request with no origin (production mode)", {
        url: origin,
      });
      return callback(new Error("Not allowed by CORS: Origin required"), false);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      logger.debug("CORS: Allowed origin", {
        origin: origin,
      });
      callback(null, true);
    } else {
      logger.warn("CORS: Rejected unauthorized origin", {
        origin: origin,
        allowedOrigins: allowedOrigins,
        ip: origin, // Log for security monitoring
      });
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allowed HTTP methods
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Forwarded-For",
    "X-Real-IP",
  ], // Allowed headers
  exposedHeaders: ["Authorization", "X-RateLimit-*"], // Headers exposed to client
  maxAge: 86400, // 24 hours - how long browser caches preflight response
  optionsSuccessStatus: 200, // Some legacy browsers (IE11) need 200
};

logger.info("CORS configuration initialized", {
  environment: process.env.NODE_ENV || "development",
  allowedOrigins: allowedOrigins,
  credentials: true,
  methods: corsOptions.methods,
});

export default cors(corsOptions);
