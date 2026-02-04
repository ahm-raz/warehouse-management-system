import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import xss from "xss-clean";
import hpp from "hpp";
import corsOptions from "./src/config/cors.js";
import limiter from "./src/config/rateLimiter.js";
import requestLogger from "./src/logs/requestLogger.js";
import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";
import logger from "./src/logs/logger.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import inventoryRoutes from "./src/routes/inventoryRoutes.js";

/**
 * Express Application Configuration
 * Centralizes all Express middleware and route setup
 * Implements proper middleware ordering for security and logging
 */

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// ==================== SECURITY MIDDLEWARE ====================
// Security middleware must be applied first

// Security headers
app.use(helmet());

// CORS middleware
app.use(corsOptions);

// XSS protection
app.use(xss());

// HTTP Parameter Pollution protection
app.use(hpp());

// ==================== PARSING MIDDLEWARE ====================

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Compression middleware (gzip)
app.use(compression());

// ==================== LOGGING MIDDLEWARE ====================
// Request logging must be after parsing but before routes

// HTTP request logger (integrated with Winston)
app.use(requestLogger);

// ==================== RATE LIMITING ====================
// Rate limiting after logging but before routes

app.use("/api/", limiter);

// ==================== ROUTES ====================

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Warehouse Management System API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// User management routes
app.use("/api/users", userRoutes);

// Product management routes
app.use("/api/products", productRoutes);

// Inventory management routes
app.use("/api/inventory", inventoryRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Warehouse Management System");
});

// ==================== ERROR HANDLING ====================
// Error handling middleware must be last

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Log application startup
logger.info("Express application configured", {
  environment: process.env.NODE_ENV || "development",
  trustProxy: app.get("trust proxy"),
});

export default app;

