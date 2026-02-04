/**
 * OpenAPI Schema Definitions
 * Reusable schema components for Swagger documentation
 * These schemas are referenced in route documentation
 */

/**
 * Common Schemas
 */
export const commonSchemas = {
  /**
   * @swagger
   * components:
   *   schemas:
   *     Error:
   *       type: object
   *       properties:
   *         success:
   *           type: boolean
   *           example: false
   *         message:
   *           type: string
   *           example: Error message description
   *         error:
   *           type: string
   *           example: Detailed error information
   */
  Error: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Error message description" },
      error: { type: "string", example: "Detailed error information" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Pagination:
   *       type: object
   *       properties:
   *         page:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         limit:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         total:
   *           type: integer
   *         totalPages:
   *           type: integer
   */
  Pagination: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      total: { type: "integer" },
      totalPages: { type: "integer" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     User:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         name:
   *           type: string
   *           example: John Doe
   *         email:
   *           type: string
   *           format: email
   *           example: john.doe@example.com
   *         role:
   *           type: string
   *           enum: [Admin, Manager, Staff]
   *           example: Manager
   *         isActive:
   *           type: boolean
   *           example: true
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  User: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      name: { type: "string", example: "John Doe" },
      email: { type: "string", format: "email", example: "john.doe@example.com" },
      role: { type: "string", enum: ["Admin", "Manager", "Staff"], example: "Manager" },
      isActive: { type: "boolean", example: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Product:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         name:
   *           type: string
   *           example: Laptop Computer
   *         description:
   *           type: string
   *           example: High-performance laptop for business use
   *         SKU:
   *           type: string
   *           example: LAPTOP-001
   *         category:
   *           type: string
   *           example: 507f1f77bcf86cd799439012
   *         quantity:
   *           type: integer
   *           example: 50
   *         minimumStockLevel:
   *           type: integer
   *           example: 10
   *         unitPrice:
   *           type: number
   *           format: float
   *           example: 999.99
   *         supplier:
   *           type: string
   *           example: 507f1f77bcf86cd799439013
   *         storageLocation:
   *           type: string
   *           example: 507f1f77bcf86cd799439014
   *         imageUrl:
   *           type: string
   *           nullable: true
   *           example: /uploads/products/images/product-image.jpg
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  Product: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      name: { type: "string", example: "Laptop Computer" },
      description: { type: "string", example: "High-performance laptop" },
      SKU: { type: "string", example: "LAPTOP-001" },
      category: { type: "string", example: "507f1f77bcf86cd799439012" },
      quantity: { type: "integer", example: 50 },
      minimumStockLevel: { type: "integer", example: 10 },
      unitPrice: { type: "number", format: "float", example: 999.99 },
      supplier: { type: "string", example: "507f1f77bcf86cd799439013" },
      storageLocation: { type: "string", example: "507f1f77bcf86cd799439014" },
      imageUrl: { type: "string", nullable: true, example: "/uploads/products/images/product-image.jpg" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     OrderItem:
   *       type: object
   *       required:
   *         - product
   *         - quantity
   *         - unitPrice
   *       properties:
   *         product:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         quantity:
   *           type: integer
   *           minimum: 1
   *           example: 2
   *         unitPrice:
   *           type: number
   *           format: float
   *           example: 99.99
   *         subtotal:
   *           type: number
   *           format: float
   *           example: 199.98
   */
  OrderItem: {
    type: "object",
    required: ["product", "quantity", "unitPrice"],
    properties: {
      product: { type: "string", example: "507f1f77bcf86cd799439011" },
      quantity: { type: "integer", minimum: 1, example: 2 },
      unitPrice: { type: "number", format: "float", example: 99.99 },
      subtotal: { type: "number", format: "float", example: 199.98 },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Order:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         orderNumber:
   *           type: string
   *           example: ORD-2024-001
   *         customerName:
   *           type: string
   *           example: Acme Corporation
   *         items:
   *           type: array
   *           items:
   *             $ref: '#/components/schemas/OrderItem'
   *         totalAmount:
   *           type: number
   *           format: float
   *           example: 199.98
   *         orderStatus:
   *           type: string
   *           enum: [Pending, Picking, Packed, Shipped, Delivered, Cancelled]
   *           example: Pending
   *         assignedStaff:
   *           type: string
   *           nullable: true
   *           example: 507f1f77bcf86cd799439015
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  Order: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      orderNumber: { type: "string", example: "ORD-2024-001" },
      customerName: { type: "string", example: "Acme Corporation" },
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/OrderItem" },
      },
      totalAmount: { type: "number", format: "float", example: 199.98 },
      orderStatus: {
        type: "string",
        enum: ["Pending", "Picking", "Packed", "Shipped", "Delivered", "Cancelled"],
        example: "Pending",
      },
      assignedStaff: { type: "string", nullable: true, example: "507f1f77bcf86cd799439015" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Task:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         title:
   *           type: string
   *           example: Restock Warehouse A
   *         description:
   *           type: string
   *           example: Restock products in Warehouse A section
   *         taskType:
   *           type: string
   *           enum: [Picking, Packing, Receiving, Inventory, Other]
   *           example: Inventory
   *         status:
   *           type: string
   *           enum: [Pending, InProgress, Completed, Cancelled]
   *           example: Pending
   *         priority:
   *           type: string
   *           enum: [Low, Medium, High, Urgent]
   *           example: Medium
   *         assignedTo:
   *           type: string
   *           nullable: true
   *           example: 507f1f77bcf86cd799439015
   *         dueDate:
   *           type: string
   *           format: date-time
   *           nullable: true
   *         completionDuration:
   *           type: integer
   *           nullable: true
   *           example: 120
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  Task: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      title: { type: "string", example: "Restock Warehouse A" },
      description: { type: "string", example: "Restock products in Warehouse A section" },
      taskType: {
        type: "string",
        enum: ["Picking", "Packing", "Receiving", "Inventory", "Other"],
        example: "Inventory",
      },
      status: {
        type: "string",
        enum: ["Pending", "InProgress", "Completed", "Cancelled"],
        example: "Pending",
      },
      priority: {
        type: "string",
        enum: ["Low", "Medium", "High", "Urgent"],
        example: "Medium",
      },
      assignedTo: { type: "string", nullable: true, example: "507f1f77bcf86cd799439015" },
      dueDate: { type: "string", format: "date-time", nullable: true },
      completionDuration: { type: "integer", nullable: true, example: 120 },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Supplier:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         supplierName:
   *           type: string
   *           example: Tech Supplies Inc.
   *         email:
   *           type: string
   *           format: email
   *           example: contact@techsupplies.com
   *         phone:
   *           type: string
   *           example: +1-555-0123
   *         company:
   *           type: string
   *           example: Tech Supplies Inc.
   *         address:
   *           type: string
   *           example: 123 Business St, City, State 12345
   *         status:
   *           type: string
   *           enum: [ACTIVE, INACTIVE]
   *           example: ACTIVE
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  Supplier: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      supplierName: { type: "string", example: "Tech Supplies Inc." },
      email: { type: "string", format: "email", example: "contact@techsupplies.com" },
      phone: { type: "string", example: "+1-555-0123" },
      company: { type: "string", example: "Tech Supplies Inc." },
      address: { type: "string", example: "123 Business St, City, State 12345" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
};
