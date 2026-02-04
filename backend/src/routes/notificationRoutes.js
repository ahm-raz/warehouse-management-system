import express from "express";
import {
  createNotificationHandler,
  getNotificationsHandler,
  markNotificationAsReadHandler,
  markAllNotificationsAsReadHandler,
  deleteNotificationHandler,
} from "../controllers/notificationController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Notification Management Routes
 * All notification management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createNotificationHandler
);

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get("/", getNotificationsHandler);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (All authenticated users)
 */
router.patch("/:id/read", markNotificationAsReadHandler);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read for logged-in user
 * @access  Private (All authenticated users)
 */
router.patch("/read-all", markAllNotificationsAsReadHandler);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Soft delete notification
 * @access  Private (All authenticated users)
 */
router.delete("/:id", deleteNotificationHandler);

export default router;
