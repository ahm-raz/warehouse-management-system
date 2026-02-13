import express from "express";
import {
  adjustStockHandler,
  getInventoryLogsHandler,
  getProductInventoryLogsHandler,
} from "../controllers/inventoryController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Inventory Management Routes
 * All inventory management endpoints
 *
 * Action types: ADD, REMOVE, UPDATE
 */

const router = express.Router();

// All routes require authentication and Admin/Manager role
router.use(authenticate);
router.use(authorizeRoles(userRoles.ADMIN, userRoles.MANAGER));

/**
 * @swagger
 * /api/inventory/adjust:
 *   patch:
 *     summary: Adjust stock quantity
 *     description: >
 *       Adjusts the stock quantity for a product. Creates an inventory log entry
 *       tracking the change, including previous and new quantities.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - action
 *               - quantityChanged
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ObjectId to adjust stock for
 *                 example: 507f1f77bcf86cd799439012
 *               action:
 *                 type: string
 *                 enum: [ADD, REMOVE, UPDATE]
 *                 description: Type of inventory action
 *                 example: ADD
 *               quantityChanged:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to add or remove
 *                 example: 50
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason or note for the adjustment
 *                 example: Stock replenishment from supplier
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Stock adjusted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     log:
 *                       $ref: '#/components/schemas/InventoryLog'
 *       400:
 *         description: Validation error or insufficient stock
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Product not found
 */
router.patch("/adjust", adjustStockHandler);

/**
 * @swagger
 * /api/inventory/logs:
 *   get:
 *     summary: Get inventory logs with filtering
 *     description: Retrieves all inventory change logs with optional filtering by action type and date range.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [ADD, REMOVE, UPDATE]
 *         description: Filter by action type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Inventory logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Inventory logs retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.get("/logs", getInventoryLogsHandler);

/**
 * @swagger
 * /api/inventory/logs/{productId}:
 *   get:
 *     summary: Get inventory logs for a specific product
 *     description: Retrieves the inventory change history for a specific product.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Product inventory logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Product inventory logs retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Product not found
 */
router.get("/logs/:productId", getProductInventoryLogsHandler);

export default router;
