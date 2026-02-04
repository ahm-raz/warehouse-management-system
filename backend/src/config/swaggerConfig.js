import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Swagger/OpenAPI Configuration
 * Generates OpenAPI 3.0 specification from JSDoc comments
 * Supports JWT authentication and comprehensive API documentation
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Swagger definition options
 */
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "WMS Backend API",
    version: "v1",
    description:
      "Warehouse Management System Backend API Documentation. This API provides endpoints for managing products, orders, inventory, suppliers, tasks, and generating reports.",
    contact: {
      name: "API Support",
      email: "support@wms.example.com",
    },
    license: {
      name: "ISC",
    },
  },
  servers: [
    {
      url: process.env.API_URL || "http://localhost:3000",
      description: "Development server",
    },
    {
      url: "https://api.wms.example.com",
      description: "Production server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token obtained from /api/auth/login endpoint",
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "User authentication and authorization endpoints",
    },
    {
      name: "Products",
      description: "Product management endpoints",
    },
    {
      name: "Orders",
      description: "Order management endpoints",
    },
    {
      name: "Tasks",
      description: "Task management endpoints",
    },
    {
      name: "Suppliers",
      description: "Supplier management endpoints",
    },
    {
      name: "Reports",
      description: "Reporting and analytics endpoints",
    },
    {
      name: "Notifications",
      description: "Notification management endpoints",
    },
    {
      name: "Uploads",
      description: "File upload endpoints",
    },
    {
      name: "Users",
      description: "User management endpoints (Admin only)",
    },
  ],
};

/**
 * Swagger options
 * Scans route files for JSDoc comments
 */
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    join(__dirname, "../routes/*.js"),
  ],
};

/**
 * Generate Swagger specification
 */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
