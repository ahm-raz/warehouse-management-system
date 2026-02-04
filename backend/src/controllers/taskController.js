import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createTask,
  getTasks,
  getStaffTasks,
  getTaskById,
  assignTask,
  updateTaskStatus,
  deleteTask,
  getTaskActivityLogs,
} from "../services/taskService.js";
import {
  validateCreateTask,
  validateUpdateTaskStatus,
  validateAssignTask,
  validatePaginationQuery,
} from "../validators/taskValidator.js";
import logger from "../logs/logger.js";

/**
 * Task Management Controller
 * Handles HTTP requests and responses for task management endpoints
 */

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private (Admin, Manager)
 */
export const createTaskHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateTask(req.body);

  // Create task
  const task = await createTask(validatedData, performedBy);

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: { task },
  });
});

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with pagination and filtering
 * @access  Private (All authenticated users)
 */
export const getTasksHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get tasks
  const result = await getTasks(validatedQuery, userId, userRole);

  res.status(200).json({
    success: true,
    message: "Tasks retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/tasks/staff/:staffId
 * @desc    Get tasks assigned to specific staff member
 * @access  Private (All authenticated users)
 */
export const getStaffTasksHandler = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!staffId) {
    throw new ApiError(400, "Staff ID is required");
  }

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get staff tasks
  const result = await getStaffTasks(staffId, validatedQuery, userId, userRole);

  res.status(200).json({
    success: true,
    message: "Staff tasks retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID
 * @access  Private (All authenticated users)
 */
export const getTaskByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!id) {
    throw new ApiError(400, "Task ID is required");
  }

  // Get task
  const task = await getTaskById(id, userId, userRole);

  res.status(200).json({
    success: true,
    message: "Task retrieved successfully",
    data: { task },
  });
});

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status
 * @access  Private (All authenticated users)
 */
export const updateTaskStatusHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;
  const userRole = req.user?.role;
  const userId = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Task ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateUpdateTaskStatus(req.body);

  // Update task status
  const task = await updateTaskStatus(id, validatedData.status, performedBy, userRole, userId);

  res.status(200).json({
    success: true,
    message: `Task status updated to ${validatedData.status}`,
    data: { task },
  });
});

/**
 * @route   PATCH /api/tasks/:id/assign
 * @desc    Assign or reassign task
 * @access  Private (Admin, Manager)
 */
export const assignTaskHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Task ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateAssignTask(req.body);

  // Assign task
  const task = await assignTask(id, validatedData.assignedTo, performedBy);

  res.status(200).json({
    success: true,
    message: "Task assigned successfully",
    data: { task },
  });
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Soft delete task
 * @access  Private (Admin, Manager)
 */
export const deleteTaskHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Task ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete task (soft delete)
  const task = await deleteTask(id, performedBy);

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
    data: { task },
  });
});

/**
 * @route   GET /api/tasks/:id/activity
 * @desc    Get task activity logs
 * @access  Private (All authenticated users)
 */
export const getTaskActivityLogsHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Task ID is required");
  }

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get activity logs
  const result = await getTaskActivityLogs(id, validatedQuery);

  res.status(200).json({
    success: true,
    message: "Task activity logs retrieved successfully",
    data: result,
  });
});
