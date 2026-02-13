import express from "express";
import {
  createReceivingHandler,
  getReceivingsHandler,
  getReceivingByIdHandler,
  updateReceivingStatusHandler,
  deleteReceivingHandler,
  getReceivingActivityLogsHandler,
} from "../controllers/receivingController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Receiving Management Routes
 * All receiving management endpoints
 *
 * Status workflow: Pending → Completed / Cancelled
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/receiving:
 *   post:
 *     summary: Create a new receiving record
 *     description: >
 *       Creates a new inbound stock receiving record. A unique receiving number
 *       (REC-YYYYMMDD-XXXXX) is auto-generated. The supplier must be active and
 *       all products must exist.
 *     tags: [Receiving]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier
 *               - receivedItems
 *             properties:
 *               supplier:
 *                 type: string
 *                 description: Supplier ObjectId (must be ACTIVE)
 *                 example: 507f1f77bcf86cd799439013
 *               receivedItems:
 *                 type: array
 *                 description: Array of received items (at least 1, no duplicate products)
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - product
 *                     - quantity
 *                     - unitCost
 *                   properties:
 *                     product:
 *                       type: string
 *                       description: Product ObjectId
 *                       example: 507f1f77bcf86cd799439011
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       description: Quantity received
 *                       example: 100
 *                     unitCost:
 *                       type: number
 *                       format: float
 *                       minimum: 0
 *                       description: Cost per unit
 *                       example: 49.99
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Delivery from Tech Supplies Inc.
 *     responses:
 *       201:
 *         description: Receiving record created successfully
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
 *                   example: Receiving record created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     receiving:
 *                       $ref: '#/components/schemas/Receiving'
 *       400:
 *         description: Validation error (duplicate products, inactive supplier, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post("/", createReceivingHandler);

/**
 * @swagger
 * /api/receiving:
 *   get:
 *     summary: Get all receiving records with pagination and filtering
 *     tags: [Receiving]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Completed, Cancelled]
 *         description: Filter by receiving status
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *         description: Filter by supplier ID
 *     responses:
 *       200:
 *         description: Receiving records retrieved successfully
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
 *                   example: Receiving records retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     receivings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Receiving'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get("/", getReceivingsHandler);

/**
 * @swagger
 * /api/receiving/{id}:
 *   get:
 *     summary: Get receiving by ID
 *     tags: [Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Receiving ID
 *     responses:
 *       200:
 *         description: Receiving retrieved successfully
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
 *                   example: Receiving retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     receiving:
 *                       $ref: '#/components/schemas/Receiving'
 *       404:
 *         description: Receiving not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", getReceivingByIdHandler);

/**
 * @swagger
 * /api/receiving/{id}/status:
 *   patch:
 *     summary: Update receiving status
 *     description: >
 *       Updates receiving status following valid transitions:
 *       - Pending → Completed, Cancelled
 *       - Completed and Cancelled are final states
 *     tags: [Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Receiving ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Completed, Cancelled]
 *                 example: Completed
 *     responses:
 *       200:
 *         description: Receiving status updated successfully
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
 *                   example: Receiving status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     receiving:
 *                       $ref: '#/components/schemas/Receiving'
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Receiving not found
 */
router.patch(
  "/:id/status",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  updateReceivingStatusHandler
);

/**
 * @swagger
 * /api/receiving/{id}:
 *   delete:
 *     summary: Soft delete receiving
 *     description: Marks a receiving record as deleted (soft delete). The record is not permanently removed.
 *     tags: [Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Receiving ID
 *     responses:
 *       200:
 *         description: Receiving deleted successfully
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
 *                   example: Receiving deleted successfully
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Receiving not found
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteReceivingHandler
);

/**
 * @swagger
 * /api/receiving/{id}/activity:
 *   get:
 *     summary: Get receiving activity logs
 *     description: Retrieves the audit trail of all changes made to a specific receiving record.
 *     tags: [Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Receiving ID
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
 *         description: Activity logs retrieved successfully
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
 *                   example: Activity logs retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Receiving not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id/activity", getReceivingActivityLogsHandler);

export default router;
