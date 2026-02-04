import express from "express";
import {
  createTaskHandler,
  getTasksHandler,
  getStaffTasksHandler,
  getTaskByIdHandler,
  updateTaskStatusHandler,
  assignTaskHandler,
  deleteTaskHandler,
  getTaskActivityLogsHandler,
} from "../controllers/taskController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Task Management Routes
 * All task management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createTaskHandler
);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get("/", getTasksHandler);

/**
 * @route   GET /api/tasks/staff/:staffId
 * @desc    Get tasks assigned to specific staff member
 * @access  Private (All authenticated users)
 */
router.get("/staff/:staffId", getStaffTasksHandler);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID
 * @access  Private (All authenticated users)
 */
router.get("/:id", getTaskByIdHandler);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status
 * @access  Private (All authenticated users)
 */
router.patch("/:id/status", updateTaskStatusHandler);

/**
 * @route   PATCH /api/tasks/:id/assign
 * @desc    Assign or reassign task
 * @access  Private (Admin, Manager)
 */
router.patch(
  "/:id/assign",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  assignTaskHandler
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Soft delete task
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteTaskHandler
);

/**
 * @route   GET /api/tasks/:id/activity
 * @desc    Get task activity logs
 * @access  Private (All authenticated users)
 */
router.get("/:id/activity", getTaskActivityLogsHandler);

export default router;
