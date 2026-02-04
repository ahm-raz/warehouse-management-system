import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../services/productService.js";
import {
  validateCreateProduct,
  validateUpdateProduct,
  validatePaginationQuery,
} from "../validators/productValidator.js";
import logger from "../logs/logger.js";

/**
 * Product Management Controller
 * Handles HTTP requests and responses for product management endpoints
 */

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Admin, Manager)
 */
export const createProductHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateProduct(req.body);

  // Create product
  const product = await createProduct(validatedData, performedBy);

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: { product },
  });
});

/**
 * @route   GET /api/products
 * @desc    Get all products with pagination and filtering
 * @access  Private (All authenticated users)
 */
export const getProductsHandler = asyncHandler(async (req, res) => {
  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get products
  const result = await getProducts(validatedQuery);

  res.status(200).json({
    success: true,
    message: "Products retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private (All authenticated users)
 */
export const getProductByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  // Get product
  const product = await getProductById(id);

  res.status(200).json({
    success: true,
    message: "Product retrieved successfully",
    data: { product },
  });
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Admin, Manager)
 */
export const updateProductHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateUpdateProduct(req.body);

  // Update product
  const product = await updateProduct(id, validatedData, performedBy);

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: { product },
  });
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Soft delete product
 * @access  Private (Admin, Manager)
 */
export const deleteProductHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete product (soft delete)
  const product = await deleteProduct(id, performedBy);

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
    data: { product },
  });
});
