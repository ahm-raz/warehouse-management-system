import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmetConfig from "./src/config/security/helmetConfig.js";
import corsConfig from "./src/config/security/corsConfig.js";
import hppConfig from "./src/config/security/hppConfig.js";
import {
  globalLimiter,
  authLimiter,
  uploadLimiter,
  reportLimiter,
} from "./src/config/security/rateLimiters.js";
import ipLogger from "./src/middleware/ipLogger.js";
import mongoSanitizer from "./src/middleware/mongoSanitizer.js";
import xssSanitizer from "./src/middleware/xssSanitizer.js";
import requestLogger from "./src/logs/requestLogger.js";
import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";
import logger from "./src/logs/logger.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import inventoryRoutes from "./src/routes/inventoryRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import supplierRoutes from "./src/routes/supplierRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import receivingRoutes from "./src/routes/receivingRoutes.js";
import locationRoutes from "./src/routes/locationRoutes.js";
import taskRoutes from "./src/routes/taskRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Express Application Configuration
 * Centralizes all Express middleware and route setup
 * Implements proper middleware ordering for security and logging
 */

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// ==================== SECURITY MIDDLEWARE ====================
// Security middleware must be applied in correct order for maximum protection
// Order: IP Logger -> Helmet -> CORS -> Rate Limiting -> Mongo Sanitization -> XSS -> HPP -> Body Parsing

// 1. IP Logger - Capture client IP first
app.use(ipLogger);

// 2. Helmet - Security headers (CSP, XSS protection, frame options, etc.)
app.use(helmetConfig);

// 3. CORS - Cross-Origin Resource Sharing (must be before routes)
app.use(corsConfig);

// 4. Rate Limiting - Global rate limiter (applied to all API routes)
app.use("/api/", globalLimiter);

// 5. MongoDB Sanitization - Prevent NoSQL injection (before body parsing)
app.use(mongoSanitizer);

// 6. XSS Sanitization - Prevent XSS attacks (before body parsing)
app.use(xssSanitizer);

// 7. HTTP Parameter Pollution Protection - Prevent duplicate parameters
app.use(hppConfig);

// ==================== PARSING MIDDLEWARE ====================

// Body parser middleware
// Reduced limit for security (1MB for JSON, uploads handled separately)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Cookie parser
app.use(cookieParser());

// ==================== STATIC FILE SERVING ====================
// Serve uploaded files as static resources
// Allows public access to uploaded product images

// Get current directory (ES modules compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve uploads directory as static files
// Files accessible at: /uploads/products/images/filename.jpg
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    // Security: Don't serve directory listings
    dotfiles: "deny",
    // Set cache headers for uploaded images
    maxAge: "1d", // Cache for 1 day
  })
);

// Compression middleware (gzip)
app.use(compression());

// ==================== LOGGING MIDDLEWARE ====================
// Request logging must be after parsing but before routes

// HTTP request logger (integrated with Winston)
app.use(requestLogger);

// ==================== ROUTES ====================

// Health check route (no rate limiting)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Warehouse Management System API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Authentication routes (strict rate limiting)
app.use("/api/auth", authLimiter, authRoutes);

// User management routes
app.use("/api/users", userRoutes);

// Product management routes
app.use("/api/products", productRoutes);

// Inventory management routes
app.use("/api/inventory", inventoryRoutes);

// Category management routes
app.use("/api/categories", categoryRoutes);

// Supplier management routes
app.use("/api/suppliers", supplierRoutes);

// Order management routes
app.use("/api/orders", orderRoutes);

// Receiving management routes
app.use("/api/receiving", receivingRoutes);

// Location management routes
app.use("/api/locations", locationRoutes);

// Task management routes
app.use("/api/tasks", taskRoutes);

// Notification management routes
app.use("/api/notifications", notificationRoutes);

// Report management routes (rate limited)
app.use("/api/reports", reportLimiter, reportRoutes);

// File upload routes (rate limited)
app.use("/api/uploads", uploadLimiter, uploadRoutes);

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

