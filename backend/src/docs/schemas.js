/**
 * OpenAPI Schema Definitions
 * Reusable schema components for Swagger documentation
 *
 * These schemas are referenced in route documentation via $ref.
 * They accurately reflect the actual MongoDB models, Joi validators,
 * and API response shapes used throughout the application.
 *
 * IMPORTANT: Keep these schemas in sync with:
 * - src/models/*.js (Mongoose schemas)
 * - src/validators/*.js (Joi validation rules)
 * - src/controllers/*.js (Response shapes)
 *
 * Sensitive fields (password, refreshToken, loginAttempts, lockUntil)
 * are intentionally excluded from response schemas.
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
   *       description: Standard error response format
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
   *       example:
   *         success: false
   *         message: Validation failed
   *         error: "\"email\" must be a valid email"
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
   *       description: Pagination metadata included in paginated responses
   *       properties:
   *         page:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *           description: Current page number
   *           example: 1
   *         limit:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *           description: Number of items per page
   *           example: 10
   *         total:
   *           type: integer
   *           description: Total number of items matching the query
   *           example: 42
   *         totalPages:
   *           type: integer
   *           description: Total number of pages
   *           example: 5
   */
  Pagination: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1, example: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10, example: 10 },
      total: { type: "integer", example: 42 },
      totalPages: { type: "integer", example: 5 },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     User:
   *       type: object
   *       description: User response object (sensitive fields excluded)
   *       properties:
   *         _id:
   *           type: string
   *           description: MongoDB ObjectId
   *           example: 507f1f77bcf86cd799439011
   *         name:
   *           type: string
   *           description: User full name (2-50 characters)
   *           example: John Doe
   *         email:
   *           type: string
   *           format: email
   *           description: User email address (unique, lowercase)
   *           example: john.doe@example.com
   *         role:
   *           type: string
   *           enum: [Admin, Manager, Staff]
   *           description: User role for access control
   *           example: Manager
   *         isActive:
   *           type: boolean
   *           description: Whether the user account is active
   *           example: true
   *         lastLogin:
   *           type: string
   *           format: date-time
   *           nullable: true
   *           description: Timestamp of last successful login
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
      lastLogin: { type: "string", format: "date-time", nullable: true },
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
   *       description: Product response object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         name:
   *           type: string
   *           description: Product name (2-200 characters)
   *           example: Laptop Computer
   *         description:
   *           type: string
   *           description: Product description (max 1000 characters)
   *           example: High-performance laptop for business use
   *         SKU:
   *           type: string
   *           description: Stock Keeping Unit (unique, uppercase)
   *           example: LAPTOP-001
   *         category:
   *           type: string
   *           description: Category ObjectId reference
   *           example: 507f1f77bcf86cd799439012
   *         quantity:
   *           type: integer
   *           description: Current stock quantity
   *           minimum: 0
   *           example: 50
   *         minimumStockLevel:
   *           type: integer
   *           description: Low stock threshold for alerts
   *           minimum: 0
   *           example: 10
   *         unitPrice:
   *           type: number
   *           format: float
   *           description: Price per unit
   *           minimum: 0
   *           example: 999.99
   *         supplier:
   *           type: string
   *           description: Supplier ObjectId reference
   *           example: 507f1f77bcf86cd799439013
   *         storageLocation:
   *           type: string
   *           description: Location ObjectId reference
   *           example: 507f1f77bcf86cd799439014
   *         imageUrl:
   *           type: string
   *           nullable: true
   *           description: URL path to product image
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
      description: { type: "string", example: "High-performance laptop for business use" },
      SKU: { type: "string", example: "LAPTOP-001" },
      category: { type: "string", example: "507f1f77bcf86cd799439012" },
      quantity: { type: "integer", minimum: 0, example: 50 },
      minimumStockLevel: { type: "integer", minimum: 0, example: 10 },
      unitPrice: { type: "number", format: "float", minimum: 0, example: 999.99 },
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
   *       description: Individual item within an order
   *       required:
   *         - product
   *         - quantity
   *         - unitPrice
   *         - subtotal
   *       properties:
   *         product:
   *           type: string
   *           description: Product ObjectId reference
   *           example: 507f1f77bcf86cd799439011
   *         quantity:
   *           type: integer
   *           minimum: 1
   *           description: Quantity of this product in the order
   *           example: 2
   *         unitPrice:
   *           type: number
   *           format: float
   *           description: Price per unit at time of order
   *           example: 99.99
   *         subtotal:
   *           type: number
   *           format: float
   *           description: quantity × unitPrice
   *           example: 199.98
   */
  OrderItem: {
    type: "object",
    required: ["product", "quantity", "unitPrice", "subtotal"],
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
   *       description: >
   *         Order response object. Status workflow:
   *         Pending → Picking → Packed → Shipped → Delivered (or Cancelled from Pending/Picking)
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         orderNumber:
   *           type: string
   *           description: Auto-generated order number (ORD-YYYYMMDD-XXXXX)
   *           example: ORD-20240101-00001
   *         customerName:
   *           type: string
   *           description: Customer name (2-200 characters)
   *           example: Acme Corporation
   *         items:
   *           type: array
   *           description: Array of ordered items (at least 1 required)
   *           items:
   *             $ref: '#/components/schemas/OrderItem'
   *         totalAmount:
   *           type: number
   *           format: float
   *           description: Sum of all item subtotals
   *           example: 199.98
   *         orderStatus:
   *           type: string
   *           enum: [Pending, Picking, Packed, Shipped, Delivered, Cancelled]
   *           description: Current order status
   *           example: Pending
   *         assignedStaff:
   *           type: string
   *           nullable: true
   *           description: Assigned staff member ObjectId
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
      orderNumber: { type: "string", example: "ORD-20240101-00001" },
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
   *       description: >
   *         Task response object. Status workflow:
   *         Pending → InProgress → Completed (or Cancelled from Pending/InProgress).
   *         Tasks are linked to orders (Picking/Packing) or receivings (Receiving).
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         title:
   *           type: string
   *           description: Task title (3-200 characters)
   *           example: Pick items for ORD-20240101-00001
   *         description:
   *           type: string
   *           description: Task description (max 1000 characters)
   *           example: Pick items from Warehouse A for order fulfillment
   *         taskType:
   *           type: string
   *           enum: [Picking, Packing, Receiving]
   *           description: Type of warehouse task
   *           example: Picking
   *         status:
   *           type: string
   *           enum: [Pending, InProgress, Completed, Cancelled]
   *           description: Current task status
   *           example: Pending
   *         priority:
   *           type: string
   *           enum: [Low, Medium, High]
   *           description: Task priority level
   *           example: Medium
   *         assignedTo:
   *           type: string
   *           description: Staff member ObjectId (must be Staff role)
   *           example: 507f1f77bcf86cd799439015
   *         assignedBy:
   *           type: string
   *           description: Manager/Admin who created the task
   *           example: 507f1f77bcf86cd799439016
   *         relatedOrder:
   *           type: string
   *           nullable: true
   *           description: Related order ObjectId (required for Picking/Packing tasks)
   *           example: 507f1f77bcf86cd799439017
   *         relatedReceiving:
   *           type: string
   *           nullable: true
   *           description: Related receiving ObjectId (required for Receiving tasks)
   *           example: null
   *         startedAt:
   *           type: string
   *           format: date-time
   *           nullable: true
   *           description: When the task was started (status changed to InProgress)
   *         completedAt:
   *           type: string
   *           format: date-time
   *           nullable: true
   *           description: When the task was completed
   *         completionDuration:
   *           type: integer
   *           nullable: true
   *           description: Time to complete in minutes (completedAt - startedAt)
   *           example: 45
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
      title: { type: "string", example: "Pick items for ORD-20240101-00001" },
      description: { type: "string", example: "Pick items from Warehouse A for order fulfillment" },
      taskType: {
        type: "string",
        enum: ["Picking", "Packing", "Receiving"],
        example: "Picking",
      },
      status: {
        type: "string",
        enum: ["Pending", "InProgress", "Completed", "Cancelled"],
        example: "Pending",
      },
      priority: {
        type: "string",
        enum: ["Low", "Medium", "High"],
        example: "Medium",
      },
      assignedTo: { type: "string", example: "507f1f77bcf86cd799439015" },
      assignedBy: { type: "string", example: "507f1f77bcf86cd799439016" },
      relatedOrder: { type: "string", nullable: true, example: "507f1f77bcf86cd799439017" },
      relatedReceiving: { type: "string", nullable: true },
      startedAt: { type: "string", format: "date-time", nullable: true },
      completedAt: { type: "string", format: "date-time", nullable: true },
      completionDuration: { type: "integer", nullable: true, example: 45 },
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
   *       description: Supplier response object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         name:
   *           type: string
   *           description: Supplier name (2-100 characters)
   *           example: Tech Supplies Inc.
   *         email:
   *           type: string
   *           format: email
   *           description: Supplier email (unique, lowercase)
   *           example: contact@techsupplies.com
   *         phone:
   *           type: string
   *           description: Supplier phone number
   *           example: +1-555-0123
   *         company:
   *           type: string
   *           description: Company name (max 100 characters)
   *           example: Tech Supplies Inc.
   *         address:
   *           type: string
   *           description: Business address (max 500 characters)
   *           example: 123 Business St, City, State 12345
   *         status:
   *           type: string
   *           enum: [ACTIVE, INACTIVE]
   *           description: Supplier operational status
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
      name: { type: "string", example: "Tech Supplies Inc." },
      email: { type: "string", format: "email", example: "contact@techsupplies.com" },
      phone: { type: "string", example: "+1-555-0123" },
      company: { type: "string", example: "Tech Supplies Inc." },
      address: { type: "string", example: "123 Business St, City, State 12345" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Notification:
   *       type: object
   *       description: >
   *         System notification. Types: LOW_STOCK (low inventory alerts),
   *         ORDER_STATUS (order updates), TASK_ASSIGNMENT (new task assignments),
   *         SYSTEM_ALERT (general system notifications).
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         title:
   *           type: string
   *           description: Notification title (3-200 characters)
   *           example: Low Stock Alert
   *         message:
   *           type: string
   *           description: Notification message (max 1000 characters)
   *           example: Product LAPTOP-001 is below minimum stock level
   *         user:
   *           type: string
   *           description: Recipient user ObjectId
   *           example: 507f1f77bcf86cd799439015
   *         type:
   *           type: string
   *           enum: [LOW_STOCK, ORDER_STATUS, TASK_ASSIGNMENT, SYSTEM_ALERT]
   *           description: Notification category type
   *           example: LOW_STOCK
   *         readStatus:
   *           type: boolean
   *           description: Whether the notification has been read
   *           example: false
   *         readAt:
   *           type: string
   *           format: date-time
   *           nullable: true
   *           description: Timestamp when notification was read
   *         metadata:
   *           type: object
   *           description: Additional context data (e.g., productId, orderId)
   *           example: { "productId": "507f1f77bcf86cd799439012", "currentQuantity": 5 }
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  Notification: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      title: { type: "string", example: "Low Stock Alert" },
      message: { type: "string", example: "Product LAPTOP-001 is below minimum stock level" },
      user: { type: "string", example: "507f1f77bcf86cd799439015" },
      type: { type: "string", enum: ["LOW_STOCK", "ORDER_STATUS", "TASK_ASSIGNMENT", "SYSTEM_ALERT"], example: "LOW_STOCK" },
      readStatus: { type: "boolean", example: false },
      readAt: { type: "string", format: "date-time", nullable: true },
      metadata: { type: "object", example: { productId: "507f1f77bcf86cd799439012", currentQuantity: 5 } },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Category:
   *       type: object
   *       description: >
   *         Product category with hierarchical parent-child relationships.
   *         Top-level categories have parentCategory = null.
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         name:
   *           type: string
   *           description: Category name (2-100 characters, unique per parent)
   *           example: Electronics
   *         description:
   *           type: string
   *           description: Category description (max 500 characters)
   *           example: Electronic devices and accessories
   *         parentCategory:
   *           type: string
   *           nullable: true
   *           description: Parent category ObjectId (null for root categories)
   *           example: 507f1f77bcf86cd799439012
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  Category: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      name: { type: "string", example: "Electronics" },
      description: { type: "string", example: "Electronic devices and accessories" },
      parentCategory: { type: "string", nullable: true, example: "507f1f77bcf86cd799439012" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Location:
   *       type: object
   *       description: >
   *         Warehouse storage location with hierarchical structure:
   *         Zone → Rack → Shelf → Bin. Each combination must be unique.
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         zone:
   *           type: string
   *           description: Zone identifier (uppercase, max 50 chars)
   *           example: A
   *         rack:
   *           type: string
   *           description: Rack identifier (max 50 chars)
   *           example: R01
   *         shelf:
   *           type: string
   *           description: Shelf identifier (max 50 chars)
   *           example: S01
   *         bin:
   *           type: string
   *           description: Bin identifier (max 50 chars)
   *           example: B01
   *         description:
   *           type: string
   *           description: Location description (max 500 chars)
   *           example: Main electronics storage area
   *         capacity:
   *           type: integer
   *           nullable: true
   *           description: Maximum capacity (null = unlimited)
   *           example: 1000
   *         currentOccupancy:
   *           type: integer
   *           description: Current number of items stored
   *           example: 750
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  Location: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      zone: { type: "string", example: "A" },
      rack: { type: "string", example: "R01" },
      shelf: { type: "string", example: "S01" },
      bin: { type: "string", example: "B01" },
      description: { type: "string", example: "Main electronics storage area" },
      capacity: { type: "integer", nullable: true, example: 1000 },
      currentOccupancy: { type: "integer", example: 750 },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     InventoryLog:
   *       type: object
   *       description: Audit trail entry for inventory changes
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         productId:
   *           type: string
   *           description: Product ObjectId reference
   *           example: 507f1f77bcf86cd799439012
   *         action:
   *           type: string
   *           enum: [ADD, REMOVE, UPDATE]
   *           description: Type of inventory action performed
   *           example: ADD
   *         quantityChanged:
   *           type: integer
   *           description: Quantity added or removed
   *           example: 50
   *         previousQuantity:
   *           type: integer
   *           description: Stock quantity before the change
   *           example: 100
   *         newQuantity:
   *           type: integer
   *           description: Stock quantity after the change
   *           example: 150
   *         performedBy:
   *           type: string
   *           description: User who performed the action
   *           example: 507f1f77bcf86cd799439015
   *         note:
   *           type: string
   *           description: Reason or note for the adjustment (max 500 chars)
   *           example: Stock replenishment from supplier
   *         timestamp:
   *           type: string
   *           format: date-time
   *           description: When the inventory change occurred
   *         createdAt:
   *           type: string
   *           format: date-time
   */
  InventoryLog: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      productId: { type: "string", example: "507f1f77bcf86cd799439012" },
      action: { type: "string", enum: ["ADD", "REMOVE", "UPDATE"], example: "ADD" },
      quantityChanged: { type: "integer", example: 50 },
      previousQuantity: { type: "integer", example: 100 },
      newQuantity: { type: "integer", example: 150 },
      performedBy: { type: "string", example: "507f1f77bcf86cd799439015" },
      note: { type: "string", example: "Stock replenishment from supplier" },
      timestamp: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     ReceivedItem:
   *       type: object
   *       description: Individual item within a receiving record
   *       required:
   *         - product
   *         - quantity
   *         - unitCost
   *       properties:
   *         product:
   *           type: string
   *           description: Product ObjectId reference
   *           example: 507f1f77bcf86cd799439011
   *         quantity:
   *           type: integer
   *           minimum: 1
   *           description: Quantity received
   *           example: 100
   *         unitCost:
   *           type: number
   *           format: float
   *           minimum: 0
   *           description: Cost per unit
   *           example: 49.99
   *         subtotal:
   *           type: number
   *           format: float
   *           description: quantity × unitCost (calculated)
   *           example: 4999.00
   */
  ReceivedItem: {
    type: "object",
    required: ["product", "quantity", "unitCost"],
    properties: {
      product: { type: "string", example: "507f1f77bcf86cd799439011" },
      quantity: { type: "integer", minimum: 1, example: 100 },
      unitCost: { type: "number", format: "float", minimum: 0, example: 49.99 },
      subtotal: { type: "number", format: "float", example: 4999.0 },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Receiving:
   *       type: object
   *       description: >
   *         Inbound stock receiving record. Status workflow:
   *         Pending → Completed / Cancelled.
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         receivingNumber:
   *           type: string
   *           description: Auto-generated receiving number (REC-YYYYMMDD-XXXXX)
   *           example: REC-20240101-00001
   *         supplier:
   *           type: string
   *           description: Supplier ObjectId reference
   *           example: 507f1f77bcf86cd799439013
   *         receivedItems:
   *           type: array
   *           description: Array of received items (at least 1 required)
   *           items:
   *             $ref: '#/components/schemas/ReceivedItem'
   *         receivedBy:
   *           type: string
   *           description: User who created the receiving record
   *           example: 507f1f77bcf86cd799439015
   *         totalItems:
   *           type: integer
   *           description: Number of distinct product types received
   *           example: 3
   *         totalQuantity:
   *           type: integer
   *           description: Total quantity of all items received
   *           example: 300
   *         status:
   *           type: string
   *           enum: [Pending, Completed, Cancelled]
   *           description: Current receiving status
   *           example: Pending
   *         notes:
   *           type: string
   *           description: Additional notes (max 1000 characters)
   *           example: Delivery from Tech Supplies Inc.
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */
  Receiving: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      receivingNumber: { type: "string", example: "REC-20240101-00001" },
      supplier: { type: "string", example: "507f1f77bcf86cd799439013" },
      receivedItems: {
        type: "array",
        items: { $ref: "#/components/schemas/ReceivedItem" },
      },
      receivedBy: { type: "string", example: "507f1f77bcf86cd799439015" },
      totalItems: { type: "integer", example: 3 },
      totalQuantity: { type: "integer", example: 300 },
      status: {
        type: "string",
        enum: ["Pending", "Completed", "Cancelled"],
        example: "Pending",
      },
      notes: { type: "string", example: "Delivery from Tech Supplies Inc." },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     ActivityLog:
   *       type: object
   *       description: Activity audit log entry for tracking changes to entities
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         action:
   *           type: string
   *           description: Description of the action performed
   *           example: Status Updated
   *         performedBy:
   *           type: string
   *           description: User who performed the action
   *           example: 507f1f77bcf86cd799439015
   *         details:
   *           type: object
   *           description: Additional details about the change
   *           example: { "from": "Pending", "to": "InProgress" }
   *         timestamp:
   *           type: string
   *           format: date-time
   *           description: When the action occurred
   */
  ActivityLog: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      action: { type: "string", example: "Status Updated" },
      performedBy: { type: "string", example: "507f1f77bcf86cd799439015" },
      details: { type: "object", example: { from: "Pending", to: "InProgress" } },
      timestamp: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     FileUploadResponse:
   *       type: object
   *       description: Response after successful file upload
   *       properties:
   *         success:
   *           type: boolean
   *           example: true
   *         message:
   *           type: string
   *           example: File uploaded successfully
   *         data:
   *           type: object
   *           properties:
   *             filename:
   *               type: string
   *               description: Generated filename on server
   *               example: product-image-1234567890.jpg
   *             path:
   *               type: string
   *               description: URL path to access the uploaded file
   *               example: /uploads/products/images/product-image-1234567890.jpg
   *             size:
   *               type: integer
   *               description: File size in bytes
   *               example: 245678
   *             mimetype:
   *               type: string
   *               description: MIME type of the uploaded file
   *               example: image/jpeg
   */
  FileUploadResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "File uploaded successfully" },
      data: {
        type: "object",
        properties: {
          filename: { type: "string", example: "product-image-1234567890.jpg" },
          path: { type: "string", example: "/uploads/products/images/product-image-1234567890.jpg" },
          size: { type: "integer", example: 245678 },
          mimetype: { type: "string", example: "image/jpeg" },
        },
      },
    },
  },
};
