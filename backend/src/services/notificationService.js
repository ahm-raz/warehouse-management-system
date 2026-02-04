import mongoose from "mongoose";
import Notification, { notificationType } from "../models/Notification.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import { getSocket } from "../config/socket.js";

/**
 * Notification Management Service
 * Business logic for notification operations
 * Handles CRUD operations, event-driven triggers, and real-time socket events
 */

/**
 * Emit notification to user via Socket.io
 * Uses user-specific socket rooms for targeted delivery
 * @param {string} userId - User ID to notify
 * @param {Object} notificationData - Notification data
 */
const emitNotificationToUser = (userId, notificationData) => {
  try {
    const io = getSocket();
    // Emit to user-specific room: notification:userId
    io.to(`notification:${userId}`).emit("notificationCreated", notificationData);
    // Also emit globally for clients that listen to all notifications
    io.emit("notificationCreated", notificationData);
  } catch (socketError) {
    logger.error("Failed to emit notification event", {
      error: socketError.message,
      userId: userId,
      notificationId: notificationData.notificationId,
    });
  }
};

/**
 * Create a notification
 * @param {Object} notificationData - Notification creation data
 * @param {string} createdBy - User ID creating the notification (optional)
 * @returns {Promise<Object>} - Created notification
 */
export const createNotification = async (notificationData, createdBy = null) => {
  const { title, message, user, type, metadata = {} } = notificationData;

  // Validate user exists
  const userDoc = await User.findOne({
    _id: user,
    isDeleted: false,
  });

  if (!userDoc) {
    throw new ApiError(404, "User not found or has been deleted");
  }

  // Create notification
  const notification = new Notification({
    title,
    message,
    user,
    type,
    metadata,
  });

  await notification.save();

  // Emit Socket.io event to user-specific room
  const notificationPayload = {
    notificationId: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    userId: notification.user.toString(),
    metadata: notification.metadata,
    readStatus: notification.readStatus,
    createdAt: notification.createdAt,
    timestamp: new Date().toISOString(),
  };

  emitNotificationToUser(user.toString(), notificationPayload);

  logger.info("Notification created", {
    notificationId: notification._id,
    userId: user.toString(),
    type: type,
    createdBy: createdBy,
  });

  // Populate user for response
  const populatedNotification = await Notification.findById(notification._id)
    .populate("user", "name email role")
    .lean();

  return populatedNotification;
};

/**
 * Create notifications for multiple users
 * Useful for system-wide alerts (e.g., low stock alerts to all admins)
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data (without user field)
 * @param {string} createdBy - User ID creating the notification (optional)
 * @returns {Promise<Array>} - Created notifications
 */
export const createNotificationsForUsers = async (userIds, notificationData, createdBy = null) => {
  const { title, message, type, metadata = {} } = notificationData;

  const notifications = [];

  for (const userId of userIds) {
    try {
      const notification = await createNotification(
        {
          title,
          message,
          user: userId,
          type,
          metadata,
        },
        createdBy
      );
      notifications.push(notification);
    } catch (error) {
      logger.error("Failed to create notification for user", {
        error: error.message,
        userId: userId,
        type: type,
      });
      // Continue with other users even if one fails
    }
  }

  return notifications;
};

/**
 * Get user notifications with pagination and filtering
 * @param {string} userId - User ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated notifications
 */
export const getUserNotifications = async (userId, queryParams) => {
  const {
    page = 1,
    limit = 10,
    type,
    readStatus,
    sortBy = "createdAt",
    order = "desc",
  } = queryParams;

  // Build query
  const query = {
    user: userId,
    isDeleted: false,
  };

  // Type filter
  if (type) {
    query.type = type;
  }

  // ReadStatus filter
  if (readStatus !== undefined) {
    query.readStatus = readStatus === "true" || readStatus === true;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  // Execute query
  const [notifications, totalNotifications, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate("user", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({
      user: userId,
      isDeleted: false,
      readStatus: false,
    }),
  ]);

  const totalPages = Math.ceil(totalNotifications / limit);

  return {
    notifications,
    pagination: {
      totalNotifications,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    unreadCount,
  };
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Updated notification
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
    isDeleted: false,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found or access denied");
  }

  // Mark as read if not already read
  if (!notification.readStatus) {
    await notification.markAsRead();

    // Emit Socket.io event
    try {
      const io = getSocket();
      io.to(`notification:${userId}`).emit("notificationRead", {
        notificationId: notification._id.toString(),
        userId: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (socketError) {
      logger.error("Failed to emit notification read event", {
        error: socketError.message,
        notificationId: notification._id,
      });
    }

    logger.info("Notification marked as read", {
      notificationId: notification._id,
      userId: userId,
    });
  }

  const populatedNotification = await Notification.findById(notification._id)
    .populate("user", "name email")
    .lean();

  return populatedNotification;
};

/**
 * Mark all notifications as read for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Update result
 */
export const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany(
    {
      user: userId,
      isDeleted: false,
      readStatus: false,
    },
    {
      $set: {
        readStatus: true,
        readAt: new Date(),
      },
    }
  );

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.to(`notification:${userId}`).emit("allNotificationsRead", {
      userId: userId,
      count: result.modifiedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit all notifications read event", {
      error: socketError.message,
      userId: userId,
    });
  }

  logger.info("All notifications marked as read", {
    userId: userId,
    count: result.modifiedCount,
  });

  return {
    modifiedCount: result.modifiedCount,
  };
};

/**
 * Soft delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Deleted notification
 */
export const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
    isDeleted: false,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found or access denied");
  }

  // Soft delete
  await notification.softDelete();

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.to(`notification:${userId}`).emit("notificationDeleted", {
      notificationId: notification._id.toString(),
      userId: userId,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit notification deleted event", {
      error: socketError.message,
      notificationId: notification._id,
    });
  }

  logger.info("Notification deleted (soft delete)", {
    notificationId: notification._id,
    userId: userId,
  });

  return notification.toJSON();
};

// ==================== EVENT-DRIVEN NOTIFICATION TRIGGERS ====================

/**
 * Trigger low stock alert notification
 * Notifies Admin and Manager users when product quantity <= minimumStockLevel
 * @param {Object} productData - Product data
 * @returns {Promise<void>}
 */
export const triggerLowStockAlert = async (productData) => {
  try {
    const { productId, productName, SKU, quantity, minimumStockLevel } = productData;

    // Find all Admin and Manager users
    const adminUsers = await User.find({
      role: { $in: ["Admin", "Manager"] },
      isDeleted: false,
      isActive: true,
    }).select("_id");

    if (adminUsers.length === 0) {
      logger.warn("No Admin or Manager users found for low stock alert", {
        productId: productId,
      });
      return;
    }

    const userIds = adminUsers.map((user) => user._id.toString());

    // Create notifications for all Admin and Manager users
    await createNotificationsForUsers(
      userIds,
      {
        title: "Low Stock Alert",
        message: `Product ${productName} (${SKU}) is running low. Current quantity: ${quantity}, Minimum: ${minimumStockLevel}`,
        type: notificationType.LOW_STOCK,
        metadata: {
          productId: productId.toString(),
          productName: productName,
          SKU: SKU,
          quantity: quantity,
          minimumStockLevel: minimumStockLevel,
        },
      },
      "system"
    );

    logger.info("Low stock alert notifications created", {
      productId: productId,
      productName: productName,
      notificationCount: userIds.length,
    });
  } catch (error) {
    logger.error("Failed to trigger low stock alert", {
      error: error.message,
      productData: productData,
    });
    // Don't throw - notification failure shouldn't break inventory operations
  }
};

/**
 * Trigger order status change notification
 * Notifies assigned staff and optionally Admin/Manager
 * @param {Object} orderData - Order data
 * @param {string} oldStatus - Previous order status
 * @param {string} newStatus - New order status
 * @returns {Promise<void>}
 */
export const triggerOrderStatusNotification = async (orderData, oldStatus, newStatus) => {
  try {
    const { orderId, orderNumber, assignedStaff, customerName } = orderData;

    const notifications = [];

    // Notify assigned staff if exists
    if (assignedStaff) {
      const staffUser = await User.findById(assignedStaff);
      if (staffUser && !staffUser.isDeleted && staffUser.isActive) {
        await createNotification(
          {
            title: "Order Status Updated",
            message: `Order ${orderNumber} status changed from ${oldStatus} to ${newStatus}`,
            user: assignedStaff.toString(),
            type: notificationType.ORDER_STATUS,
            metadata: {
              orderId: orderId.toString(),
              orderNumber: orderNumber,
              oldStatus: oldStatus,
              newStatus: newStatus,
              customerName: customerName,
            },
          },
          "system"
        );
      }
    }

    // Optionally notify Admin and Manager for important status changes
    if (newStatus === "Shipped" || newStatus === "Delivered" || newStatus === "Cancelled") {
      const adminUsers = await User.find({
        role: { $in: ["Admin", "Manager"] },
        isDeleted: false,
        isActive: true,
      }).select("_id");

      const userIds = adminUsers.map((user) => user._id.toString());

      await createNotificationsForUsers(
        userIds,
        {
          title: "Order Status Updated",
          message: `Order ${orderNumber} status changed to ${newStatus}`,
          type: notificationType.ORDER_STATUS,
          metadata: {
            orderId: orderId.toString(),
            orderNumber: orderNumber,
            oldStatus: oldStatus,
            newStatus: newStatus,
            customerName: customerName,
          },
        },
        "system"
      );
    }

    logger.info("Order status notification created", {
      orderId: orderId,
      orderNumber: orderNumber,
      oldStatus: oldStatus,
      newStatus: newStatus,
    });
  } catch (error) {
    logger.error("Failed to trigger order status notification", {
      error: error.message,
      orderData: orderData,
    });
    // Don't throw - notification failure shouldn't break order operations
  }
};

/**
 * Trigger task assignment notification
 * Notifies assigned staff when task is assigned or reassigned
 * @param {Object} taskData - Task data
 * @param {string} assignedTo - Assigned user ID
 * @returns {Promise<void>}
 */
export const triggerTaskAssignmentNotification = async (taskData, assignedTo) => {
  try {
    const { taskId, title, taskType } = taskData;

    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser || assignedUser.isDeleted || !assignedUser.isActive) {
      logger.warn("Assigned user not found or inactive for task notification", {
        taskId: taskId,
        assignedTo: assignedTo,
      });
      return;
    }

    await createNotification(
      {
        title: "New Task Assigned",
        message: `You have been assigned a new ${taskType} task: ${title}`,
        user: assignedTo.toString(),
        type: notificationType.TASK_ASSIGNMENT,
        metadata: {
          taskId: taskId.toString(),
          title: title,
          taskType: taskType,
        },
      },
      "system"
    );

    logger.info("Task assignment notification created", {
      taskId: taskId,
      assignedTo: assignedTo,
    });
  } catch (error) {
    logger.error("Failed to trigger task assignment notification", {
      error: error.message,
      taskData: taskData,
      assignedTo: assignedTo,
    });
    // Don't throw - notification failure shouldn't break task operations
  }
};
