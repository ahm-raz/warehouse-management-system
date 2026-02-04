import express from "express";
import {
  createProductHandler,
  getProductsHandler,
  getProductByIdHandler,
  updateProductHandler,
  deleteProductHandler,
} from "../controllers/productController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Product Management Routes
 * All product management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createProductHandler
);

/**
 * @route   GET /api/products
 * @desc    Get all products with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get("/", getProductsHandler);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private (All authenticated users)
 */
router.get("/:id", getProductByIdHandler);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  updateProductHandler
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Soft delete product
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteProductHandler
);

export default router;
