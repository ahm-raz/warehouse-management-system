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
 * @route   POST /api/locations
 * @desc    Create a new location
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createLocationHandler
);

/**
 * @route   GET /api/locations
 * @desc    Get all locations with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get("/", getLocationsHandler);

/**
 * @route   GET /api/locations/tree
 * @desc    Get location hierarchy tree
 * @access  Private (All authenticated users)
 */
router.get("/tree", getLocationTreeHandler);

/**
 * @route   GET /api/locations/:id
 * @desc    Get location by ID
 * @access  Private (All authenticated users)
 */
router.get("/:id", getLocationByIdHandler);

/**
 * @route   PUT /api/locations/:id
 * @desc    Update location
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  updateLocationHandler
);

/**
 * @route   PATCH /api/locations/:id/assign-product
 * @desc    Assign product to location
 * @access  Private (Admin, Manager)
 */
router.patch(
  "/:id/assign-product",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  assignProductHandler
);

/**
 * @route   GET /api/locations/:id/products
 * @desc    Get products in location
 * @access  Private (All authenticated users)
 */
router.get("/:id/products", getLocationProductsHandler);

/**
 * @route   DELETE /api/locations/:id
 * @desc    Soft delete location
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteLocationHandler
);

export default router;
