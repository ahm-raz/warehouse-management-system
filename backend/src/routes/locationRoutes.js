import express from "express";
import {
  createLocationHandler,
  getLocationsHandler,
  getLocationTreeHandler,
  getLocationByIdHandler,
  updateLocationHandler,
  assignProductHandler,
  getLocationProductsHandler,
  deleteLocationHandler,
} from "../controllers/locationController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Location Management Routes
 * All location management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/locations:
 *   post:
 *     summary: Create a new location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - locationType
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Warehouse A - Aisle 1
 *               locationType:
 *                 type: string
 *                 enum: [Warehouse, Zone, Aisle, Shelf, Bin]
 *                 example: Aisle
 *               parent:
 *                 type: string
 *                 nullable: true
 *                 example: 507f1f77bcf86cd799439012
 *               capacity:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1000
 *     responses:
 *       201:
 *         description: Location created successfully
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
 *                   example: Location created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     location:
 *                       $ref: '#/components/schemas/Location'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createLocationHandler
);

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get all locations with pagination and filtering
 *     tags: [Locations]
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
 *         name: locationType
 *         schema:
 *           type: string
 *           enum: [Warehouse, Zone, Aisle, Shelf, Bin]
 *         description: Filter by location type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by location name
 *     responses:
 *       200:
 *         description: Locations retrieved successfully
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
 *                   example: Locations retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     locations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Location'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get("/", getLocationsHandler);

/**
 * @swagger
 * /api/locations/tree:
 *   get:
 *     summary: Get location hierarchy tree
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Location tree retrieved successfully
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
 *                   example: Location tree retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     tree:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Location'
 *       401:
 *         description: Unauthorized
 */
router.get("/tree", getLocationTreeHandler);

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location retrieved successfully
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
 *                   example: Location retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     location:
 *                       $ref: '#/components/schemas/Location'
 *       404:
 *         description: Location not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", getLocationByIdHandler);

/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     summary: Update location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Location ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Warehouse A - Aisle 1
 *               capacity:
 *                 type: integer
 *                 example: 1500
 *     responses:
 *       200:
 *         description: Location updated successfully
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
 *                   example: Location updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     location:
 *                       $ref: '#/components/schemas/Location'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Location not found
 */
router.put(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  updateLocationHandler
);

/**
 * @swagger
 * /api/locations/{id}/assign-product:
 *   patch:
 *     summary: Assign product to location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Location ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439013
 *     responses:
 *       200:
 *         description: Product assigned to location successfully
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
 *                   example: Product assigned to location successfully
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Location or product not found
 */
router.patch(
  "/:id/assign-product",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  assignProductHandler
);

/**
 * @swagger
 * /api/locations/{id}/products:
 *   get:
 *     summary: Get products in location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Location ID
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
 *         description: Products retrieved successfully
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
 *                   example: Products retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Location not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id/products", getLocationProductsHandler);

/**
 * @swagger
 * /api/locations/{id}:
 *   delete:
 *     summary: Soft delete location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location deleted successfully
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
 *                   example: Location deleted successfully
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Location not found
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteLocationHandler
);

export default router;
