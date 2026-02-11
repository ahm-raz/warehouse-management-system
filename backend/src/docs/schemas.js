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

  /**
   * @swagger
   * components:
   *   schemas:
   *     Notification:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         recipient:
   *           type: string
   *           example: 507f1f77bcf86cd799439015
   *         message:
   *           type: string
   *           example: New order has been assigned to you
   *         type:
   *           type: string
   *           enum: [Info, Warning, Error, Success]
   *           example: Info
   *         isRead:
   *           type: boolean
   *           example: false
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
      recipient: { type: "string", example: "507f1f77bcf86cd799439015" },
      message: { type: "string", example: "New order has been assigned to you" },
      type: { type: "string", enum: ["Info", "Warning", "Error", "Success"], example: "Info" },
      isRead: { type: "boolean", example: false },
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
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         name:
   *           type: string
   *           example: Electronics
   *         description:
   *           type: string
   *           example: Electronic devices and accessories
   *         parent:
   *           type: string
   *           nullable: true
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
      parent: { type: "string", nullable: true, example: "507f1f77bcf86cd799439012" },
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
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         name:
   *           type: string
   *           example: Warehouse A - Aisle 1
   *         locationType:
   *           type: string
   *           enum: [Warehouse, Zone, Aisle, Shelf, Bin]
   *           example: Aisle
   *         parent:
   *           type: string
   *           nullable: true
   *           example: 507f1f77bcf86cd799439012
   *         capacity:
   *           type: integer
   *           example: 1000
   *         currentUtilization:
   *           type: integer
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
      name: { type: "string", example: "Warehouse A - Aisle 1" },
      locationType: { type: "string", enum: ["Warehouse", "Zone", "Aisle", "Shelf", "Bin"], example: "Aisle" },
      parent: { type: "string", nullable: true, example: "507f1f77bcf86cd799439012" },
      capacity: { type: "integer", example: 1000 },
      currentUtilization: { type: "integer", example: 750 },
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
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         product:
   *           type: string
   *           example: 507f1f77bcf86cd799439012
   *         transactionType:
   *           type: string
   *           enum: [Adjustment, Sale, Purchase, Return, Transfer]
   *           example: Adjustment
   *         quantityChange:
   *           type: integer
   *           example: 50
   *         previousQuantity:
   *           type: integer
   *           example: 100
   *         newQuantity:
   *           type: integer
   *           example: 150
   *         reason:
   *           type: string
   *           example: Stock replenishment
   *         performedBy:
   *           type: string
   *           example: 507f1f77bcf86cd799439015
   *         createdAt:
   *           type: string
   *           format: date-time
   */
  InventoryLog: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      product: { type: "string", example: "507f1f77bcf86cd799439012" },
      transactionType: { type: "string", enum: ["Adjustment", "Sale", "Purchase", "Return", "Transfer"], example: "Adjustment" },
      quantityChange: { type: "integer", example: 50 },
      previousQuantity: { type: "integer", example: 100 },
      newQuantity: { type: "integer", example: 150 },
      reason: { type: "string", example: "Stock replenishment" },
      performedBy: { type: "string", example: "507f1f77bcf86cd799439015" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     ReceivingItem:
   *       type: object
   *       required:
   *         - product
   *         - quantityOrdered
   *         - quantityReceived
   *       properties:
   *         product:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         quantityOrdered:
   *           type: integer
   *           minimum: 1
   *           example: 100
   *         quantityReceived:
   *           type: integer
   *           minimum: 0
   *           example: 95
   *         unitPrice:
   *           type: number
   *           format: float
   *           example: 99.99
   */
  ReceivingItem: {
    type: "object",
    required: ["product", "quantityOrdered", "quantityReceived"],
    properties: {
      product: { type: "string", example: "507f1f77bcf86cd799439011" },
      quantityOrdered: { type: "integer", minimum: 1, example: 100 },
      quantityReceived: { type: "integer", minimum: 0, example: 95 },
      unitPrice: { type: "number", format: "float", example: 99.99 },
    },
  },

  /**
   * @swagger
   * components:
   *   schemas:
   *     Receiving:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         receivingNumber:
   *           type: string
   *           example: RCV-2024-001
   *         supplier:
   *           type: string
   *           example: 507f1f77bcf86cd799439013
   *         items:
   *           type: array
   *           items:
   *             $ref: '#/components/schemas/ReceivingItem'
   *         status:
   *           type: string
   *           enum: [Pending, PartiallyReceived, Received, Cancelled]
   *           example: Pending
   *         expectedDate:
   *           type: string
   *           format: date-time
   *         receivedDate:
   *           type: string
   *           format: date-time
   *           nullable: true
   *         notes:
   *           type: string
   *           example: Delivery scheduled for morning
   *         createdBy:
   *           type: string
   *           example: 507f1f77bcf86cd799439015
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
      receivingNumber: { type: "string", example: "RCV-2024-001" },
      supplier: { type: "string", example: "507f1f77bcf86cd799439013" },
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/ReceivingItem" },
      },
      status: {
        type: "string",
        enum: ["Pending", "PartiallyReceived", "Received", "Cancelled"],
        example: "Pending",
      },
      expectedDate: { type: "string", format: "date-time" },
      receivedDate: { type: "string", format: "date-time", nullable: true },
      notes: { type: "string", example: "Delivery scheduled for morning" },
      createdBy: { type: "string", example: "507f1f77bcf86cd799439015" },
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
   *       properties:
   *         _id:
   *           type: string
   *           example: 507f1f77bcf86cd799439011
   *         action:
   *           type: string
   *           example: Status Updated
   *         performedBy:
   *           type: string
   *           example: 507f1f77bcf86cd799439015
   *         details:
   *           type: object
   *           example: { "from": "Pending", "to": "InProgress" }
   *         timestamp:
   *           type: string
   *           format: date-time
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
   *               example: product-image-1234567890.jpg
   *             path:
   *               type: string
   *               example: /uploads/products/images/product-image-1234567890.jpg
   *             size:
   *               type: integer
   *               example: 245678
   *             mimetype:
   *               type: string
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
