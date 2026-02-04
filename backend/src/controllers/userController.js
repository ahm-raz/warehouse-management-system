import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changeUserRole,
  toggleUserStatus,
  deleteUser,
  getUserActivityLogs,
} from "../services/userService.js";
import {
  validateCreateUser,
  validateUpdateUser,
  validateRoleChange,
  validateUserStatus,
  validatePaginationQuery,
} from "../validators/userValidator.js";
import logger from "../logs/logger.js";

/**
 * User Management Controller
 * Handles HTTP requests and responses for user management endpoints
 */

/**
 * @route   POST /api/users
 * @desc    Create a new user (Admin only)
 * @access  Private (Admin)
 */
export const createUserHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateUser(req.body);

  // Create user
  const user = await createUser(validatedData, performedBy, req);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: { user },
  });
});

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering (Admin only)
 * @access  Private (Admin)
 */
export const getUsersHandler = asyncHandler(async (req, res) => {
  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get users
  const result = await getUsers(validatedQuery);

  res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Private (Admin)
 */
export const getUserByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "User ID is required");
  }

  // Get user
  const user = await getUserById(id);

  res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: { user },
  });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (Admin only)
 * @access  Private (Admin)
 */
export const updateUserHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "User ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateUpdateUser(req.body);

  // Update user
  const user = await updateUser(id, validatedData, performedBy, req);

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: { user },
  });
});

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Change user role (Admin only)
 * @access  Private (Admin)
 */
export const changeUserRoleHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "User ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateRoleChange(req.body);

  // Change role
  const user = await changeUserRole(id, validatedData.role, performedBy, req);

  res.status(200).json({
    success: true,
    message: "User role updated successfully",
    data: { user },
  });
});

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Toggle user active status (Admin only)
 * @access  Private (Admin)
 */
export const toggleUserStatusHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "User ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateUserStatus(req.body);

  // Toggle status
  const user = await toggleUserStatus(id, validatedData.isActive, performedBy, req);

  res.status(200).json({
    success: true,
    message: `User ${validatedData.isActive ? "activated" : "deactivated"} successfully`,
    data: { user },
  });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Soft delete user (Admin only)
 * @access  Private (Admin)
 */
export const deleteUserHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "User ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete user (soft delete)
  const user = await deleteUser(id, performedBy, req);

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
    data: { user },
  });
});

/**
 * @route   GET /api/users/:id/activity
 * @desc    Get user activity logs (Admin only)
 * @access  Private (Admin)
 */
export const getUserActivityLogsHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "User ID is required");
  }

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get activity logs
  const result = await getUserActivityLogs(id, validatedQuery);

  res.status(200).json({
    success: true,
    message: "User activity logs retrieved successfully",
    data: result,
  });
});
