import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createReceiving,
  getReceivings,
  getReceivingById,
  updateReceivingStatus,
  deleteReceiving,
  getReceivingActivityLogs,
} from "../services/receivingService.js";
import {
  validateCreateReceiving,
  validateUpdateReceivingStatus,
  validatePaginationQuery,
} from "../validators/receivingValidator.js";
import logger from "../logs/logger.js";

/**
 * Receiving Management Controller
 * Handles HTTP requests and responses for receiving management endpoints
 */

/**
 * @route   POST /api/receiving
 * @desc    Create a new receiving record
 * @access  Private (Admin, Manager, Staff)
 */
export const createReceivingHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateReceiving(req.body);

  // Create receiving
  const receiving = await createReceiving(validatedData, performedBy);

  res.status(201).json({
    success: true,
    message: "Receiving record created successfully",
    data: { receiving },
  });
});

/**
 * @route   GET /api/receiving
 * @desc    Get all receiving records with pagination and filtering
 * @access  Private (All authenticated users)
 */
export const getReceivingsHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get receivings
  const result = await getReceivings(validatedQuery, userId, userRole);

  res.status(200).json({
    success: true,
    message: "Receiving records retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/receiving/:id
 * @desc    Get receiving by ID
 * @access  Private (All authenticated users)
 */
export const getReceivingByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!id) {
    throw new ApiError(400, "Receiving ID is required");
  }

  // Get receiving
  const receiving = await getReceivingById(id, userId, userRole);

  res.status(200).json({
    success: true,
    message: "Receiving record retrieved successfully",
    data: { receiving },
  });
});

/**
 * @route   PATCH /api/receiving/:id/status
 * @desc    Update receiving status
 * @access  Private (Admin, Manager)
 */
export const updateReceivingStatusHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;
  const userRole = req.user?.role;

  if (!id) {
    throw new ApiError(400, "Receiving ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Only Admin and Manager can update receiving status
  if (userRole !== "Admin" && userRole !== "Manager") {
    throw new ApiError(403, "Only Admin and Manager can update receiving status");
  }

  // Validate request body
  const validatedData = validateUpdateReceivingStatus(req.body);

  // Update receiving status
  const receiving = await updateReceivingStatus(id, validatedData.status, performedBy);

  res.status(200).json({
    success: true,
    message: `Receiving status updated to ${validatedData.status}`,
    data: { receiving },
  });
});

/**
 * @route   DELETE /api/receiving/:id
 * @desc    Soft delete receiving
 * @access  Private (Admin, Manager)
 */
export const deleteReceivingHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Receiving ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete receiving (soft delete)
  const receiving = await deleteReceiving(id, performedBy);

  res.status(200).json({
    success: true,
    message: "Receiving record deleted successfully",
    data: { receiving },
  });
});

/**
 * @route   GET /api/receiving/:id/activity
 * @desc    Get receiving activity logs
 * @access  Private (All authenticated users)
 */
export const getReceivingActivityLogsHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!id) {
    throw new ApiError(400, "Receiving ID is required");
  }

  // Verify receiving access
  await getReceivingById(id, userId, userRole);

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get activity logs
  const result = await getReceivingActivityLogs(id, validatedQuery);

  res.status(200).json({
    success: true,
    message: "Receiving activity logs retrieved successfully",
    data: result,
  });
});
