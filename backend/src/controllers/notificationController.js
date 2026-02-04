import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../services/notificationService.js";
import {
  validateCreateNotification,
  validatePaginationQuery,
} from "../validators/notificationValidator.js";
import logger from "../logs/logger.js";

/**
 * Notification Management Controller
 * Handles HTTP requests and responses for notification management endpoints
 */

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification (Admin, Manager only)
 * @access  Private (Admin, Manager)
 */
export const createNotificationHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateNotification(req.body);

  // Create notification
  const notification = await createNotification(validatedData, performedBy);

  res.status(201).json({
    success: true,
    message: "Notification created successfully",
    data: { notification },
  });
});

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with pagination and filtering
 * @access  Private (All authenticated users)
 */
export const getNotificationsHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get user notifications
  const result = await getUserNotifications(userId, validatedQuery);

  res.status(200).json({
    success: true,
    message: "Notifications retrieved successfully",
    data: result,
  });
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (All authenticated users)
 */
export const markNotificationAsReadHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Notification ID is required");
  }

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  // Mark notification as read
  const notification = await markNotificationAsRead(id, userId);

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: { notification },
  });
});

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read for logged-in user
 * @access  Private (All authenticated users)
 */
export const markAllNotificationsAsReadHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  // Mark all notifications as read
  const result = await markAllNotificationsAsRead(userId);

  res.status(200).json({
    success: true,
    message: `Marked ${result.modifiedCount} notification(s) as read`,
    data: result,
  });
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Soft delete notification
 * @access  Private (All authenticated users)
 */
export const deleteNotificationHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Notification ID is required");
  }

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete notification (soft delete)
  const notification = await deleteNotification(id, userId);

  res.status(200).json({
    success: true,
    message: "Notification deleted successfully",
    data: { notification },
  });
});
