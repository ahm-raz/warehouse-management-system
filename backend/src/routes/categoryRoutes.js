import express from "express";
import {
  createCategoryHandler,
  getCategoriesHandler,
  getCategoryTreeHandler,
  getCategoryByIdHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "../controllers/categoryController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Category Management Routes
 * All category management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createCategoryHandler
);

/**
 * @route   GET /api/categories
 * @desc    Get all categories with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get("/", getCategoriesHandler);

/**
 * @route   GET /api/categories/tree
 * @desc    Get hierarchical category tree
 * @access  Private (All authenticated users)
 */
router.get("/tree", getCategoryTreeHandler);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Private (All authenticated users)
 */
router.get("/:id", getCategoryByIdHandler);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  updateCategoryHandler
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Soft delete category
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteCategoryHandler
);

export default router;
