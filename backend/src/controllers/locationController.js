import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createLocation,
  getLocations,
  getLocationTree,
  getLocationById,
  updateLocation,
  assignProductToLocation,
  getLocationProducts,
  deleteLocation,
} from "../services/locationService.js";
import {
  validateCreateLocation,
  validateUpdateLocation,
  validateAssignProduct,
  validatePaginationQuery,
} from "../validators/locationValidator.js";
import logger from "../logs/logger.js";

/**
 * Location Management Controller
 * Handles HTTP requests and responses for location management endpoints
 */

/**
 * @route   POST /api/locations
 * @desc    Create a new location
 * @access  Private (Admin, Manager)
 */
export const createLocationHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateLocation(req.body);

  // Create location
  const location = await createLocation(validatedData, performedBy);

  res.status(201).json({
    success: true,
    message: "Location created successfully",
    data: { location },
  });
});

/**
 * @route   GET /api/locations
 * @desc    Get all locations with pagination and filtering
 * @access  Private (All authenticated users)
 */
export const getLocationsHandler = asyncHandler(async (req, res) => {
  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get locations
  const result = await getLocations(validatedQuery);

  res.status(200).json({
    success: true,
    message: "Locations retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/locations/tree
 * @desc    Get location hierarchy tree
 * @access  Private (All authenticated users)
 */
export const getLocationTreeHandler = asyncHandler(async (req, res) => {
  // Get location tree
  const tree = await getLocationTree();

  res.status(200).json({
    success: true,
    message: "Location tree retrieved successfully",
    data: { tree },
  });
});

/**
 * @route   GET /api/locations/:id
 * @desc    Get location by ID
 * @access  Private (All authenticated users)
 */
export const getLocationByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Location ID is required");
  }

  // Get location
  const location = await getLocationById(id);

  res.status(200).json({
    success: true,
    message: "Location retrieved successfully",
    data: { location },
  });
});

/**
 * @route   PUT /api/locations/:id
 * @desc    Update location
 * @access  Private (Admin, Manager)
 */
export const updateLocationHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Location ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateUpdateLocation(req.body);

  // Update location
  const location = await updateLocation(id, validatedData, performedBy);

  res.status(200).json({
    success: true,
    message: "Location updated successfully",
    data: { location },
  });
});

/**
 * @route   PATCH /api/locations/:id/assign-product
 * @desc    Assign product to location
 * @access  Private (Admin, Manager)
 */
export const assignProductHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Location ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateAssignProduct(req.body);

  // Assign product to location
  const result = await assignProductToLocation(id, validatedData.productId, performedBy);

  res.status(200).json({
    success: true,
    message: "Product assigned to location successfully",
    data: result,
  });
});

/**
 * @route   GET /api/locations/:id/products
 * @desc    Get products in location
 * @access  Private (All authenticated users)
 */
export const getLocationProductsHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Location ID is required");
  }

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get location products
  const result = await getLocationProducts(id, validatedQuery);

  res.status(200).json({
    success: true,
    message: "Location products retrieved successfully",
    data: result,
  });
});

/**
 * @route   DELETE /api/locations/:id
 * @desc    Soft delete location
 * @access  Private (Admin, Manager)
 */
export const deleteLocationHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Location ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete location (soft delete)
  const location = await deleteLocation(id, performedBy);

  res.status(200).json({
    success: true,
    message: "Location deleted successfully",
    data: { location },
  });
});
