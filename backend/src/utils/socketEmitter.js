import { getSocket } from "../sockets/index.js";
import { getUserRoom, getRoleRoom, getNotificationRoom, getAdminRooms } from "../sockets/socketRooms.js";
import logger from "../logs/logger.js";

/**
 * Socket Emitter Utility
 * Provides reusable functions for emitting socket events from services
 * Prevents circular dependencies and centralizes event emission logic
 * 
 * Usage:
 * - Import in services: import { emitOrderStatusUpdated } from "../utils/socketEmitter.js"
 * - Call emit functions: await emitOrderStatusUpdated(orderData, oldStatus, newStatus)
 */

/**
 * Emit event to specific user room
 * @param {string} userId - User ID
 * @param {string} eventName - Event name
 * @param {Object} payload - Event payload
 */
const emitToUser = (userId, eventName, payload) => {
  try {
    const io = getSocket();
    const roomName = getUserRoom(userId);
    io.to(roomName).emit(eventName, payload);

    logger.debug("Socket event emitted to user", {
      eventName: eventName,
      userId: userId,
      roomName: roomName,
    });
  } catch (error) {
    logger.error("Failed to emit socket event to user", {
      eventName: eventName,
      userId: userId,
      error: error.message,
    });
  }
};

/**
 * Emit event to role-specific room
 * @param {string} role - User role
 * @param {string} eventName - Event name
 * @param {Object} payload - Event payload
 */
const emitToRole = (role, eventName, payload) => {
  try {
    const io = getSocket();
    const roomName = getRoleRoom(role);
    io.to(roomName).emit(eventName, payload);

    logger.debug("Socket event emitted to role", {
      eventName: eventName,
      role: role,
      roomName: roomName,
    });
  } catch (error) {
    logger.error("Failed to emit socket event to role", {
      eventName: eventName,
      role: role,
      error: error.message,
    });
  }
};

/**
 * Emit event to admin and manager rooms
 * @param {string} eventName - Event name
 * @param {Object} payload - Event payload
 */
const emitToAdmins = (eventName, payload) => {
  try {
    const io = getSocket();
    const adminRooms = getAdminRooms();
    
    adminRooms.forEach((roomName) => {
      io.to(roomName).emit(eventName, payload);
    });

    logger.debug("Socket event emitted to admins", {
      eventName: eventName,
      rooms: adminRooms,
    });
  } catch (error) {
    logger.error("Failed to emit socket event to admins", {
      eventName: eventName,
      error: error.message,
    });
  }
};

/**
 * Emit event to notification room
 * @param {string} userId - User ID
 * @param {string} eventName - Event name
 * @param {Object} payload - Event payload
 */
const emitToNotificationRoom = (userId, eventName, payload) => {
  try {
    const io = getSocket();
    const roomName = getNotificationRoom(userId);
    io.to(roomName).emit(eventName, payload);

    logger.debug("Socket event emitted to notification room", {
      eventName: eventName,
      userId: userId,
      roomName: roomName,
    });
  } catch (error) {
    logger.error("Failed to emit socket event to notification room", {
      eventName: eventName,
      userId: userId,
      error: error.message,
    });
  }
};

/**
 * Emit event globally (all connected clients)
 * Use sparingly - prefer targeted room emissions
 * @param {string} eventName - Event name
 * @param {Object} payload - Event payload
 */
const emitGlobal = (eventName, payload) => {
  try {
    const io = getSocket();
    io.emit(eventName, payload);

    logger.debug("Socket event emitted globally", {
      eventName: eventName,
    });
  } catch (error) {
    logger.error("Failed to emit global socket event", {
      eventName: eventName,
      error: error.message,
    });
  }
};

// ==================== ORDER EVENTS ====================

/**
 * Emit order created event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} orderData - Order data
 */
export const emitOrderCreated = (orderData) => {
  const { orderId, orderNumber, assignedStaff, updatedBy } = orderData;
  const payload = {
    orderId: orderId.toString(),
    orderNumber: orderNumber,
    status: "Pending",
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to assigned staff if exists
  if (assignedStaff) {
    emitToUser(assignedStaff.toString(), "orderCreated", payload);
  }

  // Emit to admin and manager rooms
  emitToAdmins("orderCreated", payload);
};

/**
 * Emit order status updated event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} orderData - Order data
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
export const emitOrderStatusUpdated = (orderData, oldStatus, newStatus) => {
  const { orderId, orderNumber, assignedStaff, updatedBy } = orderData;
  const payload = {
    orderId: orderId.toString(),
    orderNumber: orderNumber,
    oldStatus: oldStatus,
    newStatus: newStatus,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to assigned staff if exists
  if (assignedStaff) {
    emitToUser(assignedStaff.toString(), "orderStatusUpdated", payload);
  }

  // Emit to admin and manager rooms
  emitToAdmins("orderStatusUpdated", payload);
};

/**
 * Emit order cancelled event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} orderData - Order data
 * @param {string} oldStatus - Previous status
 */
export const emitOrderCancelled = (orderData, oldStatus) => {
  const { orderId, orderNumber, assignedStaff, updatedBy } = orderData;
  const payload = {
    orderId: orderId.toString(),
    orderNumber: orderNumber,
    oldStatus: oldStatus,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to assigned staff if exists
  if (assignedStaff) {
    emitToUser(assignedStaff.toString(), "orderCancelled", payload);
  }

  // Emit to admin and manager rooms
  emitToAdmins("orderCancelled", payload);
};

/**
 * Emit order staff assigned event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} orderData - Order data
 * @param {string} staffId - Assigned staff ID
 * @param {string} staffName - Assigned staff name
 */
export const emitOrderStaffAssigned = (orderData, staffId, staffName) => {
  const { orderId, orderNumber, updatedBy } = orderData;
  const payload = {
    orderId: orderId.toString(),
    orderNumber: orderNumber,
    staffId: staffId.toString(),
    staffName: staffName,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to assigned staff
  emitToUser(staffId.toString(), "orderStaffAssigned", payload);

  // Emit to admin and manager rooms
  emitToAdmins("orderStaffAssigned", payload);
};

// ==================== INVENTORY EVENTS ====================

/**
 * Emit inventory updated event
 * Sends to admin and manager rooms
 * @param {Object} inventoryData - Inventory data
 */
export const emitInventoryUpdated = (inventoryData) => {
  const { productId, productName, SKU, previousQuantity, newQuantity, updatedBy } = inventoryData;
  const payload = {
    productId: productId.toString(),
    productName: productName,
    SKU: SKU,
    previousQuantity: previousQuantity,
    newQuantity: newQuantity,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to admin and manager rooms
  emitToAdmins("inventoryUpdated", payload);
};

/**
 * Emit low stock alert event
 * Sends to admin and manager rooms
 * @param {Object} productData - Product data
 */
export const emitLowStockAlert = (productData) => {
  const { productId, productName, SKU, quantity, minimumStockLevel, updatedBy } = productData;
  const payload = {
    productId: productId.toString(),
    productName: productName,
    SKU: SKU,
    quantity: quantity,
    minimumStockLevel: minimumStockLevel,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to admin and manager rooms
  emitToAdmins("lowStockAlert", payload);
};

// ==================== TASK EVENTS ====================

/**
 * Emit task created event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} taskData - Task data
 */
export const emitTaskCreated = (taskData) => {
  const { taskId, title, taskType, assignedTo, assignedToName, status, priority, updatedBy } = taskData;
  const payload = {
    taskId: taskId.toString(),
    title: title,
    taskType: taskType,
    assignedTo: assignedTo.toString(),
    assignedToName: assignedToName,
    status: status,
    priority: priority,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to assigned staff
  emitToUser(assignedTo.toString(), "taskCreated", payload);

  // Emit to admin and manager rooms
  emitToAdmins("taskCreated", payload);
};

/**
 * Emit task assigned event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} taskData - Task data
 * @param {string} oldAssignedTo - Previous assignee ID
 * @param {string} newAssignedTo - New assignee ID
 * @param {string} newAssignedToName - New assignee name
 */
export const emitTaskAssigned = (taskData, oldAssignedTo, newAssignedTo, newAssignedToName) => {
  const { taskId, title, updatedBy } = taskData;
  const payload = {
    taskId: taskId.toString(),
    title: title,
    oldAssignedTo: oldAssignedTo.toString(),
    newAssignedTo: newAssignedTo.toString(),
    newAssignedToName: newAssignedToName,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to new assigned staff
  emitToUser(newAssignedTo.toString(), "taskAssigned", payload);

  // Emit to admin and manager rooms
  emitToAdmins("taskAssigned", payload);
};

/**
 * Emit task status updated event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} taskData - Task data
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
export const emitTaskStatusUpdated = (taskData, oldStatus, newStatus) => {
  const { taskId, title, assignedTo, updatedBy } = taskData;
  const payload = {
    taskId: taskId.toString(),
    title: title,
    assignedTo: assignedTo.toString(),
    oldStatus: oldStatus,
    newStatus: newStatus,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to assigned staff
  emitToUser(assignedTo.toString(), "taskStatusUpdated", payload);

  // Emit to admin and manager rooms
  emitToAdmins("taskStatusUpdated", payload);
};

/**
 * Emit task completed event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} taskData - Task data
 * @param {number} completionDuration - Completion duration in minutes
 */
export const emitTaskCompleted = (taskData, completionDuration) => {
  const { taskId, title, assignedTo, updatedBy } = taskData;
  const payload = {
    taskId: taskId.toString(),
    title: title,
    assignedTo: assignedTo.toString(),
    completionDuration: completionDuration,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to assigned staff
  emitToUser(assignedTo.toString(), "taskCompleted", payload);

  // Emit to admin and manager rooms
  emitToAdmins("taskCompleted", payload);
};

/**
 * Emit task cancelled event
 * Sends to assigned staff and admin/manager rooms
 * @param {Object} taskData - Task data
 * @param {string} oldStatus - Previous status
 */
export const emitTaskCancelled = (taskData, oldStatus) => {
  const { taskId, title, assignedTo, updatedBy } = taskData;
  const payload = {
    taskId: taskId.toString(),
    title: title,
    assignedTo: assignedTo.toString(),
    oldStatus: oldStatus,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
  };

  // Emit to assigned staff
  emitToUser(assignedTo.toString(), "taskCancelled", payload);

  // Emit to admin and manager rooms
  emitToAdmins("taskCancelled", payload);
};

// ==================== NOTIFICATION EVENTS ====================

/**
 * Emit notification created event
 * Sends only to target user's notification room
 * @param {string} userId - User ID
 * @param {Object} notificationData - Notification data
 */
export const emitNotificationCreated = (userId, notificationData) => {
  const payload = {
    ...notificationData,
    timestamp: new Date().toISOString(),
  };

  // Emit only to target user's notification room
  emitToNotificationRoom(userId, "notificationCreated", payload);
};

/**
 * Emit notification read event
 * Sends only to target user's notification room
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 */
export const emitNotificationRead = (userId, notificationId) => {
  const payload = {
    notificationId: notificationId.toString(),
    userId: userId,
    timestamp: new Date().toISOString(),
  };

  // Emit only to target user's notification room
  emitToNotificationRoom(userId, "notificationRead", payload);
};

/**
 * Emit all notifications read event
 * Sends only to target user's notification room
 * @param {string} userId - User ID
 * @param {number} count - Number of notifications marked as read
 */
export const emitAllNotificationsRead = (userId, count) => {
  const payload = {
    userId: userId,
    count: count,
    timestamp: new Date().toISOString(),
  };

  // Emit only to target user's notification room
  emitToNotificationRoom(userId, "allNotificationsRead", payload);
};

/**
 * Emit notification deleted event
 * Sends only to target user's notification room
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 */
export const emitNotificationDeleted = (userId, notificationId) => {
  const payload = {
    notificationId: notificationId.toString(),
    userId: userId,
    timestamp: new Date().toISOString(),
  };

  // Emit only to target user's notification room
  emitToNotificationRoom(userId, "notificationDeleted", payload);
};
