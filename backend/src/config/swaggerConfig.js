import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Swagger/OpenAPI Configuration
 * Generates OpenAPI 3.0 specification from JSDoc comments in route files
 *
 * Features:
 * - JWT Bearer authentication schema
 * - Comprehensive tag organization by module
 * - Server configuration for dev/staging/production
 * - API versioning support (current: v1)
 * - Automatic route scanning from JSDoc annotations
 *
 * API Versioning Strategy:
 * - Current version: v1 (routes at /api/*)
 * - Future versions can be added by creating versioned route directories
 *   (e.g., src/routes/v2/) and adding them to the apis array below
 * - Servers array supports multiple version prefixes
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * OpenAPI 3.0 specification definition
 * Defines API metadata, servers, authentication, and tag groups
 */
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "WMS Backend API",
    version: "1.0.0",
    description:
      "Warehouse Management System Backend API Documentation.\n\n" +
      "This API provides endpoints for managing products, orders, inventory, " +
      "suppliers, tasks, users, notifications, and generating reports.\n\n" +
      "**API Version:** v1\n\n" +
      "**Authentication:** JWT Bearer token required for most endpoints. " +
      "Obtain a token via `POST /api/auth/login` and use the Authorize button above.\n\n" +
      "**Role-Based Access:**\n" +
      "- **Admin** – Full system access\n" +
      "- **Manager** – Product, order, task, supplier, and report management\n" +
      "- **Staff** – Limited access to assigned tasks and orders",
    contact: {
      name: "WMS API Support",
      email: "support@wms.example.com",
      url: "https://wms.example.com/support",
    },
    license: {
      name: "ISC",
    },
  },

  /**
   * Server configuration
   * Supports multiple environments and API version prefixes
   */
  servers: [
    {
      url: process.env.API_URL || "http://localhost:3000",
      description: "Development server",
    },
    {
      url: "https://staging-api.wms.example.com",
      description: "Staging server",
    },
    {
      url: "https://api.wms.example.com",
      description: "Production server",
    },
  ],

  /**
   * Security scheme and reusable schema components
   */
  components: {
    securitySchemes: {
      /**
       * JWT Bearer Authentication
       * Token obtained from POST /api/auth/login
       * Include in Authorization header: Bearer <token>
       */
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Enter the JWT access token obtained from the `/api/auth/login` endpoint.\n\n" +
          "Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`\n\n" +
          "Token is valid for a limited time. Use `/api/auth/refresh-token` to renew.",
      },
    },
  },

  /**
   * Global security requirement
   * All endpoints require JWT by default unless overridden with security: []
   */
  security: [
    {
      bearerAuth: [],
    },
  ],

  /**
   * Tag definitions for endpoint grouping
   * Organized by functional module for easy navigation
   */
  tags: [
    {
      name: "Authentication",
      description:
        "User authentication and authorization endpoints. " +
        "Handles registration, login, logout, token refresh, and current user info.",
    },
    {
      name: "Users",
      description:
        "User management endpoints (Admin only). " +
        "Create, read, update, delete users and manage roles/status.",
    },
    {
      name: "Products",
      description:
        "Product management endpoints. " +
        "CRUD operations for warehouse products with SKU tracking.",
    },
    {
      name: "Inventory",
      description:
        "Inventory tracking and stock adjustment endpoints. " +
        "Manage stock levels and view inventory audit logs.",
    },
    {
      name: "Categories",
      description:
        "Product category management endpoints. " +
        "Hierarchical category structure with parent-child relationships.",
    },
    {
      name: "Locations",
      description:
        "Warehouse location management endpoints. " +
        "Hierarchical location structure: Zone → Rack → Shelf → Bin.",
    },
    {
      name: "Orders",
      description:
        "Order management endpoints. " +
        "Create and manage outbound orders with status workflow: " +
        "Pending → Picking → Packed → Shipped → Delivered.",
    },
    {
      name: "Receiving",
      description:
        "Receiving and inbound shipment management endpoints. " +
        "Track incoming stock from suppliers with status workflow: " +
        "Pending → Completed / Cancelled.",
    },
    {
      name: "Tasks",
      description:
        "Task management endpoints. " +
        "Assign and track warehouse tasks (Picking, Packing, Receiving) with " +
        "status workflow: Pending → InProgress → Completed.",
    },
    {
      name: "Suppliers",
      description:
        "Supplier management endpoints. " +
        "Manage supplier information, status, and linked products.",
    },
    {
      name: "Reports",
      description:
        "Reporting and analytics endpoints (Admin/Manager only). " +
        "Generate inventory, order, supplier, and task productivity reports.",
    },
    {
      name: "Notifications",
      description:
        "Notification management endpoints. " +
        "System notifications for low stock, order status, task assignments.",
    },
    {
      name: "Uploads",
      description:
        "File upload endpoints. " +
        "Upload product images (JPEG, PNG, WebP - max 5MB).",
    },
  ],
};

/**
 * Swagger-jsdoc options
 * Scans route files and schema definitions for JSDoc @swagger annotations
 *
 * API Versioning: To add a new API version, create route files in
 * src/routes/v2/ and add the path to the apis array below.
 */
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    // Current API version (v1) - route documentation
    join(__dirname, "../routes/*.js"),
    // Reusable schema component definitions
    join(__dirname, "../docs/schemas.js"),
    // Future: Add versioned routes
    // join(__dirname, "../routes/v2/*.js"),
    // join(__dirname, "../docs/v2/schemas.js"),
  ],
};

/**
 * Generate and export the OpenAPI specification
 * swagger-jsdoc reads all @swagger JSDoc comments from the configured
 * file paths and merges them into a single OpenAPI 3.0 spec object
 */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
