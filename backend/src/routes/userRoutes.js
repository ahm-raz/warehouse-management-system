import express from "express";
import {
  createUserHandler,
  getUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  changeUserRoleHandler,
  toggleUserStatusHandler,
  deleteUserHandler,
  getUserActivityLogsHandler,
} from "../controllers/userController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * User Management Routes
 * All user management endpoints (Admin only)
 */

const router = express.Router();

// All routes require authentication and Admin role
router.use(authenticate);
router.use(authorizeRoles(userRoles.ADMIN));

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin)
 */
router.post("/", createUserHandler);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin)
 */
router.get("/", getUsersHandler);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
router.get("/:id", getUserByIdHandler);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin)
 */
router.put("/:id", updateUserHandler);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Change user role
 * @access  Private (Admin)
 */
router.patch("/:id/role", changeUserRoleHandler);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Toggle user active status
 * @access  Private (Admin)
 */
router.patch("/:id/status", toggleUserStatusHandler);

/**
 * @route   DELETE /api/users/:id
 * @desc    Soft delete user
 * @access  Private (Admin)
 */
router.delete("/:id", deleteUserHandler);

/**
 * @route   GET /api/users/:id/activity
 * @desc    Get user activity logs
 * @access  Private (Admin)
 */
router.get("/:id/activity", getUserActivityLogsHandler);

export default router;
