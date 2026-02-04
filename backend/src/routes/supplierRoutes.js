import express from "express";
import {
  createSupplierHandler,
  getSuppliersHandler,
  getSupplierByIdHandler,
  updateSupplierHandler,
  changeSupplierStatusHandler,
  deleteSupplierHandler,
  getSupplierProductsHandler,
  getSupplierActivityLogsHandler,
} from "../controllers/supplierController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Supplier Management Routes
 * All supplier management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: Create a new supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierName
 *               - email
 *             properties:
 *               supplierName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 200
 *                 example: Tech Supplies Inc.
 *               email:
 *                 type: string
 *                 format: email
 *                 example: contact@techsupplies.com
 *               phone:
 *                 type: string
 *                 example: +1-555-0123
 *               company:
 *                 type: string
 *                 example: Tech Supplies Inc.
 *               address:
 *                 type: string
 *                 example: 123 Business St, City, State 12345
 *     responses:
 *       201:
 *         description: Supplier created successfully
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
 *                   example: Supplier created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     supplier:
 *                       $ref: '#/components/schemas/Supplier'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createSupplierHandler
);

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Get all suppliers with pagination and filtering
 *     tags: [Suppliers]
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
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by supplier status
 *     responses:
 *       200:
 *         description: Suppliers retrieved successfully
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
 *                   example: Suppliers retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     suppliers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Supplier'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get("/", getSuppliersHandler);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Supplier retrieved successfully
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
 *                   example: Supplier retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     supplier:
 *                       $ref: '#/components/schemas/Supplier'
 *       404:
 *         description: Supplier not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", getSupplierByIdHandler);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  updateSupplierHandler
);

/**
 * @swagger
 * /api/suppliers/{id}/status:
 *   patch:
 *     summary: Change supplier status
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
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
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Supplier status updated successfully
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
 *                   example: Supplier status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     supplier:
 *                       $ref: '#/components/schemas/Supplier'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Supplier not found
 */
router.patch(
  "/:id/status",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  changeSupplierStatusHandler
);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Soft delete supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Supplier deleted successfully
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
 *                   example: Supplier deleted successfully
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Supplier not found
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteSupplierHandler
);

/**
 * @route   GET /api/suppliers/:id/products
 * @desc    Get products linked to supplier
 * @access  Private (All authenticated users)
 */
router.get("/:id/products", getSupplierProductsHandler);

/**
 * @route   GET /api/suppliers/:id/activity
 * @desc    Get supplier activity logs
 * @access  Private (Admin, Manager)
 */
router.get(
  "/:id/activity",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  getSupplierActivityLogsHandler
);

export default router;
