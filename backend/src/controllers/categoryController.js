import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../services/categoryService.js";
import {
  validateCreateCategory,
  validateUpdateCategory,
  validatePaginationQuery,
} from "../validators/categoryValidator.js";
import logger from "../logs/logger.js";

/**
 * Category Management Controller
 * Handles HTTP requests and responses for category management endpoints
 */

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Admin, Manager)
 */
export const createCategoryHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateCategory(req.body);

  // Create category
  const category = await createCategory(validatedData, performedBy);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: { category },
  });
});

/**
 * @route   GET /api/categories
 * @desc    Get all categories with pagination and filtering
 * @access  Private (All authenticated users)
 */
export const getCategoriesHandler = asyncHandler(async (req, res) => {
  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get categories
  const result = await getCategories(validatedQuery);

  res.status(200).json({
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/categories/tree
 * @desc    Get hierarchical category tree
 * @access  Private (All authenticated users)
 */
export const getCategoryTreeHandler = asyncHandler(async (req, res) => {
  // Get category tree
  const tree = await getCategoryTree();

  res.status(200).json({
    success: true,
    message: "Category tree retrieved successfully",
    data: { tree },
  });
});

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Private (All authenticated users)
 */
export const getCategoryByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Category ID is required");
  }

  // Get category
  const category = await getCategoryById(id);

  res.status(200).json({
    success: true,
    message: "Category retrieved successfully",
    data: { category },
  });
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin, Manager)
 */
export const updateCategoryHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Category ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateUpdateCategory(req.body);

  // Update category
  const category = await updateCategory(id, validatedData, performedBy);

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: { category },
  });
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Soft delete category
 * @access  Private (Admin, Manager)
 */
export const deleteCategoryHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Category ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete category (soft delete)
  const category = await deleteCategory(id, performedBy);

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
    data: { category },
  });
});
