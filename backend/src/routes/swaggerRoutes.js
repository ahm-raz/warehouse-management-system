import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "../config/swaggerConfig.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";
import logger from "../logs/logger.js";

/**
 * Swagger Documentation Routes
 * Serves Swagger UI and OpenAPI JSON specification
 */

const router = express.Router();

/**
 * Check if Swagger documentation is enabled
 */
const isSwaggerEnabled = () => {
  return process.env.ENABLE_SWAGGER_DOCS !== "false"; // Default: enabled
};

/**
 * Swagger UI customization options
 */
const swaggerUiOptions = {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "WMS API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true, // Persist JWT token in browser
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

/**
 * @route   GET /api/docs
 * @desc    Serve Swagger UI
 * @access  Public (or Admin only if configured)
 */
router.get(
  "/",
  // Optional: Protect Swagger docs in production
  // Uncomment the following lines to require Admin authentication
  // authenticate,
  // authorizeRoles(userRoles.ADMIN),
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

/**
 * @route   GET /api/docs.json
 * @desc    Serve OpenAPI JSON specification
 * @access  Public (or Admin only if configured)
 */
router.get("/json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/**
 * Middleware to check if Swagger is enabled
 */
export const swaggerMiddleware = (req, res, next) => {
  if (!isSwaggerEnabled()) {
    logger.warn("Swagger documentation access attempted but disabled", {
      ip: req.ip || req.clientIp,
      url: req.originalUrl,
    });
    return res.status(404).json({
      success: false,
      message: "API documentation is not available",
    });
  }
  next();
};

// Apply middleware to all Swagger routes
router.use(swaggerMiddleware);

export default router;
