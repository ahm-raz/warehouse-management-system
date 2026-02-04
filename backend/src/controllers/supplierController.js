import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  changeSupplierStatus,
  deleteSupplier,
  getSupplierProducts,
  getSupplierActivityLogs,
} from "../services/supplierService.js";
import {
  validateCreateSupplier,
  validateUpdateSupplier,
  validateSupplierStatus,
  validatePaginationQuery,
} from "../validators/supplierValidator.js";
import logger from "../logs/logger.js";

/**
 * Supplier Management Controller
 * Handles HTTP requests and responses for supplier management endpoints
 */

/**
 * @route   POST /api/suppliers
 * @desc    Create a new supplier
 * @access  Private (Admin, Manager)
 */
export const createSupplierHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateSupplier(req.body);

  // Create supplier
  const supplier = await createSupplier(validatedData, performedBy, req);

  res.status(201).json({
    success: true,
    message: "Supplier created successfully",
    data: { supplier },
  });
});

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers with pagination and filtering
 * @access  Private (All authenticated users)
 */
export const getSuppliersHandler = asyncHandler(async (req, res) => {
  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get suppliers
  const result = await getSuppliers(validatedQuery);

  res.status(200).json({
    success: true,
    message: "Suppliers retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private (All authenticated users)
 */
export const getSupplierByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Supplier ID is required");
  }

  // Get supplier
  const supplier = await getSupplierById(id);

  res.status(200).json({
    success: true,
    message: "Supplier retrieved successfully",
    data: { supplier },
  });
});

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (Admin, Manager)
 */
export const updateSupplierHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Supplier ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateUpdateSupplier(req.body);

  // Update supplier
  const supplier = await updateSupplier(id, validatedData, performedBy, req);

  res.status(200).json({
    success: true,
    message: "Supplier updated successfully",
    data: { supplier },
  });
});

/**
 * @route   PATCH /api/suppliers/:id/status
 * @desc    Change supplier status
 * @access  Private (Admin, Manager)
 */
export const changeSupplierStatusHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Supplier ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateSupplierStatus(req.body);

  // Change status
  const supplier = await changeSupplierStatus(
    id,
    validatedData.status,
    performedBy,
    req
  );

  res.status(200).json({
    success: true,
    message: `Supplier status changed to ${validatedData.status}`,
    data: { supplier },
  });
});

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Soft delete supplier
 * @access  Private (Admin, Manager)
 */
export const deleteSupplierHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Supplier ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete supplier (soft delete)
  const supplier = await deleteSupplier(id, performedBy, req);

  res.status(200).json({
    success: true,
    message: "Supplier deleted successfully",
    data: { supplier },
  });
});

/**
 * @route   GET /api/suppliers/:id/products
 * @desc    Get products linked to supplier
 * @access  Private (All authenticated users)
 */
export const getSupplierProductsHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Supplier ID is required");
  }

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get supplier products
  const result = await getSupplierProducts(id, validatedQuery);

  res.status(200).json({
    success: true,
    message: "Supplier products retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/suppliers/:id/activity
 * @desc    Get supplier activity logs
 * @access  Private (Admin, Manager)
 */
export const getSupplierActivityLogsHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Supplier ID is required");
  }

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get activity logs
  const result = await getSupplierActivityLogs(id, validatedQuery);

  res.status(200).json({
    success: true,
    message: "Supplier activity logs retrieved successfully",
    data: result,
  });
});
