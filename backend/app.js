import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import xss from "xss-clean";
import hpp from "hpp";
import corsOptions from "./src/config/cors.js";
import limiter from "./src/config/rateLimiter.js";
import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";
import logger from "./src/utils/logger.js";

/**
 * Express Application Configuration
 * Centralizes all Express middleware and route setup
 */

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// ==================== MIDDLEWARE ====================

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Compression middleware (gzip)
app.use(compression());

// Security middleware
app.use(helmet());

// CORS middleware
app.use(corsOptions);

// Rate limiting middleware
app.use("/api/", limiter);

// XSS protection
app.use(xss());

// HTTP Parameter Pollution protection
app.use(hpp());

// HTTP request logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// ==================== ROUTES ====================

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Warehouse Management System API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("Warehouse Management System");
});

// ==================== ERROR HANDLING ====================

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
