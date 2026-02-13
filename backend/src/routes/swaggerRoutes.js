import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "../config/swaggerConfig.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";
import logger from "../logs/logger.js";

/**
 * Swagger Documentation Routes
 * Serves Swagger UI and OpenAPI JSON specification
 *
 * Routes:
 *   GET /api/docs      → Swagger UI interface
 *   GET /api/docs/json  → Raw OpenAPI JSON specification
 *
 * Environment control:
 *   ENABLE_SWAGGER_DOCS=false  → Disables documentation (default: enabled)
 */

const router = express.Router();

/**
 * Check if Swagger documentation is enabled via environment variable.
 * Defaults to enabled unless explicitly set to "false".
 * @returns {boolean} - True if Swagger docs should be served
 */
const isSwaggerEnabled = () => {
  return process.env.ENABLE_SWAGGER_DOCS !== "false";
};

/**
 * Swagger UI customization options
 * - Hides the default Swagger topbar
 * - Persists JWT authorization token across browser sessions
 * - Enables request duration display and filtering
 */
const swaggerUiOptions = {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "WMS API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: "none",
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
  },
};

/**
 * Middleware to check if Swagger is enabled.
 * Must be applied BEFORE route handlers to block all requests
 * when documentation is disabled (e.g., in production).
 */
const swaggerMiddleware = (req, res, next) => {
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

// ==================== MIDDLEWARE (applied FIRST) ====================

// 1. Check if Swagger is enabled (blocks all routes if disabled)
router.use(swaggerMiddleware);

// 2. Optional: Protect Swagger docs (Admin only) in production
// Uncomment the following two lines to require Admin authentication:
// router.use(authenticate);
// router.use(authorizeRoles(userRoles.ADMIN));

// ==================== ROUTES ====================

/**
 * @route   GET /api/docs/json
 * @desc    Serve raw OpenAPI JSON specification
 * @access  Public (or Admin only if configured above)
 *
 * Returns the complete OpenAPI 3.0 specification as JSON.
 * Useful for importing into Postman, Insomnia, or other API tools.
 */
router.get("/json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/**
 * Serve Swagger UI static assets (CSS, JS, images).
 * Must be registered BEFORE the setup route.
 * This middleware serves the swagger-ui-dist static files
 * required to render the Swagger UI interface.
 */
router.use(swaggerUi.serve);

/**
 * @route   GET /api/docs
 * @desc    Serve Swagger UI documentation interface
 * @access  Public (or Admin only if configured above)
 *
 * Renders the interactive Swagger UI where developers can:
 * - Browse all API endpoints grouped by module
 * - Authorize with JWT token
 * - Execute API requests directly from the browser
 * - View request/response schemas and examples
 */
router.get("/", swaggerUi.setup(swaggerSpec, swaggerUiOptions));

export default router;
