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
 *
 * Location structure: Zone → Rack → Shelf → Bin
 * Each combination of zone+rack+shelf+bin must be unique.
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/locations:
 *   post:
 *     summary: Create a new storage location
 *     description: >
 *       Creates a new warehouse storage location. Locations follow a hierarchical
 *       structure: Zone → Rack → Shelf → Bin. Each combination must be unique.
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
 *               - zone
 *               - rack
 *               - shelf
 *               - bin
 *             properties:
 *               zone:
 *                 type: string
 *                 description: Zone identifier (auto-uppercased, max 50 chars)
 *                 maxLength: 50
 *                 example: A
 *               rack:
 *                 type: string
 *                 description: Rack identifier (max 50 chars)
 *                 maxLength: 50
 *                 example: R01
 *               shelf:
 *                 type: string
 *                 description: Shelf identifier (max 50 chars)
 *                 maxLength: 50
 *                 example: S01
 *               bin:
 *                 type: string
 *                 description: Bin identifier (max 50 chars)
 *                 maxLength: 50
 *                 example: B01
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Main electronics storage area
 *               capacity:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum capacity (null = unlimited)
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
 *         description: Validation error or duplicate location
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
 *         name: zone
 *         schema:
 *           type: string
 *         description: Filter by zone identifier
 *       - in: query
 *         name: rack
 *         schema:
 *           type: string
 *         description: Filter by rack identifier
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search across zone, rack, shelf, bin fields
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
 *     description: >
 *       Returns all locations organized in a hierarchical tree structure:
 *       Zone → Rack → Shelf → Bin. Useful for displaying warehouse layout.
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
 *                         type: object
 *                         properties:
 *                           zone:
 *                             type: string
 *                             example: A
 *                           racks:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 rack:
 *                                   type: string
 *                                   example: R01
 *                                 shelves:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       shelf:
 *                                         type: string
 *                                         example: S01
 *                                       bins:
 *                                         type: array
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             _id:
 *                                               type: string
 *                                             bin:
 *                                               type: string
 *                                             description:
 *                                               type: string
 *                                             capacity:
 *                                               type: integer
 *                                               nullable: true
 *                                             currentOccupancy:
 *                                               type: integer
 *                                             fullPath:
 *                                               type: string
 *                                               example: A-R01-S01-B01
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
 *               zone:
 *                 type: string
 *                 description: Zone identifier (auto-uppercased)
 *                 maxLength: 50
 *                 example: B
 *               rack:
 *                 type: string
 *                 maxLength: 50
 *                 example: R02
 *               shelf:
 *                 type: string
 *                 maxLength: 50
 *                 example: S03
 *               bin:
 *                 type: string
 *                 maxLength: 50
 *                 example: B05
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Updated storage area description
 *               capacity:
 *                 type: integer
 *                 minimum: 0
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
 *         description: Validation error or duplicate location combination
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
 *     description: Assigns a product's storage location to this warehouse location.
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
 *                 description: Product ObjectId to assign to this location
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
 *     summary: Get products stored in location
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
 *     description: Marks a location as deleted (soft delete). The location is not permanently removed.
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
