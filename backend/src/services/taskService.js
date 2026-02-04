import mongoose from "mongoose";
import Task, { taskStatus, taskType } from "../models/Task.js";
import TaskActivityLog, { actionTypes } from "../models/TaskActivityLog.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Receiving from "../models/Receiving.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import { getSocket } from "../config/socket.js";

/**
 * Task Management Service
 * Business logic for task operations
 * Handles CRUD operations, status workflow, time tracking, and activity logging
 */

/**
 * Create activity log entry
 * @param {Object} logData - Activity log data
 * @returns {Promise<Object>} - Created log entry
 */
const createActivityLog = async (logData) => {
  try {
    const log = new TaskActivityLog(logData);
    await log.save();
    return log;
  } catch (error) {
    logger.error("Failed to create task activity log", {
      error: error.message,
      logData: logData,
    });
    // Don't throw error - logging failure shouldn't break task operations
  }
};

/**
 * Create a new task
 * @param {Object} taskData - Task creation data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Created task
 */
export const createTask = async (taskData, performedBy) => {
  const { assignedTo, taskType: type, relatedOrder, relatedReceiving } = taskData;

  // Validate assigned user exists and is active Staff
  const assignedUser = await User.findOne({
    _id: assignedTo,
    isDeleted: false,
    isActive: true,
    role: "Staff",
  });

  if (!assignedUser) {
    throw new ApiError(404, "Assigned user not found, inactive, or is not a Staff member");
  }

  // Validate relatedOrder for Picking and Packing tasks
  if (type === taskType.PICKING || type === taskType.PACKING) {
    if (!relatedOrder) {
      throw new ApiError(400, "Related order is required for Picking and Packing tasks");
    }

    const order = await Order.findOne({
      _id: relatedOrder,
      isDeleted: false,
    });

    if (!order) {
      throw new ApiError(404, "Related order not found or has been deleted");
    }
  }

  // Validate relatedReceiving for Receiving tasks
  if (type === taskType.RECEIVING) {
    if (!relatedReceiving) {
      throw new ApiError(400, "Related receiving is required for Receiving tasks");
    }

    const receiving = await Receiving.findOne({
      _id: relatedReceiving,
      isDeleted: false,
    });

    if (!receiving) {
      throw new ApiError(404, "Related receiving not found or has been deleted");
    }
  }

  // Create new task
  const task = new Task({
    ...taskData,
    assignedBy: performedBy,
    status: taskStatus.PENDING,
  });

  await task.save();

  // Log activity
  await createActivityLog({
    taskId: task._id,
    performedBy: performedBy,
    actionType: actionTypes.TASK_CREATED,
    newValues: {
      title: task.title,
      taskType: task.taskType,
      assignedTo: task.assignedTo.toString(),
      status: task.status,
      priority: task.priority,
    },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("taskCreated", {
      taskId: task._id.toString(),
      title: task.title,
      taskType: task.taskType,
      assignedTo: task.assignedTo.toString(),
      assignedToName: assignedUser.name,
      status: task.status,
      priority: task.priority,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit task created event", {
      error: socketError.message,
      taskId: task._id,
    });
  }

  logger.info("Task created", {
    taskId: task._id,
    title: task.title,
    taskType: task.taskType,
    assignedTo: task.assignedTo.toString(),
    performedBy: performedBy,
  });

  // Populate related fields for response
  const populatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .populate("relatedOrder", "orderNumber customerName")
    .populate("relatedReceiving", "receivingNumber supplier")
    .lean();

  return populatedTask;
};

/**
 * Get all tasks with pagination and filtering
 * @param {Object} queryParams - Query parameters
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} - Paginated tasks
 */
export const getTasks = async (queryParams, userId, userRole) => {
  const {
    page = 1,
    limit = 10,
    assignedTo,
    taskType: type,
    status,
    priority,
    startDate,
    endDate,
    sortBy = "createdAt",
    order = "desc",
  } = queryParams;

  // Build query
  const query = { isDeleted: false };

  // AssignedTo filter (Staff can only see their own tasks)
  if (assignedTo) {
    if (userRole === "Admin" || userRole === "Manager") {
      query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    } else if (userRole === "Staff") {
      // Staff can only see their own tasks
      query.assignedTo = userId;
    }
  } else if (userRole === "Staff") {
    // Staff can only see their own tasks
    query.assignedTo = userId;
  }

  // TaskType filter
  if (type) {
    query.taskType = type;
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // Priority filter
  if (priority) {
    query.priority = priority;
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  // Execute query
  const [tasks, totalTasks] = await Promise.all([
    Task.find(query)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("relatedOrder", "orderNumber customerName")
      .populate("relatedReceiving", "receivingNumber supplier")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalTasks / limit);

  return {
    tasks,
    pagination: {
      totalTasks,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get tasks assigned to specific staff member
 * @param {string} staffId - Staff user ID
 * @param {Object} queryParams - Query parameters
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} - Paginated tasks
 */
export const getStaffTasks = async (staffId, queryParams, userId, userRole) => {
  // Staff can only view their own tasks
  if (userRole === "Staff" && staffId !== userId.toString()) {
    throw new ApiError(403, "Staff can only view their own tasks");
  }

  // Verify staff exists
  const staff = await User.findOne({
    _id: staffId,
    isDeleted: false,
    role: "Staff",
  });

  if (!staff) {
    throw new ApiError(404, "Staff member not found");
  }

  const {
    page = 1,
    limit = 10,
    taskType: type,
    status,
    priority,
    sortBy = "createdAt",
    order = "desc",
  } = queryParams;

  // Build query
  const query = {
    assignedTo: staffId,
    isDeleted: false,
  };

  // TaskType filter
  if (type) {
    query.taskType = type;
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // Priority filter
  if (priority) {
    query.priority = priority;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  // Execute query
  const [tasks, totalTasks] = await Promise.all([
    Task.find(query)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("relatedOrder", "orderNumber customerName")
      .populate("relatedReceiving", "receivingNumber supplier")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalTasks / limit);

  return {
    tasks,
    staff: {
      _id: staff._id,
      name: staff.name,
      email: staff.email,
    },
    pagination: {
      totalTasks,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get task by ID
 * @param {string} taskId - Task ID
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} - Task object
 */
export const getTaskById = async (taskId, userId, userRole) => {
  const query = {
    _id: taskId,
    isDeleted: false,
  };

  // Staff can only access their own tasks
  if (userRole === "Staff") {
    query.assignedTo = userId;
  }

  const task = await Task.findOne(query)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .populate("relatedOrder", "orderNumber customerName totalAmount orderStatus")
    .populate("relatedReceiving", "receivingNumber supplier totalQuantity status")
    .lean();

  if (!task) {
    throw new ApiError(404, "Task not found or access denied");
  }

  return task;
};

/**
 * Assign or reassign task
 * @param {string} taskId - Task ID
 * @param {string} newAssignedTo - New assigned user ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Updated task
 */
export const assignTask = async (taskId, newAssignedTo, performedBy) => {
  const task = await Task.findOne({
    _id: taskId,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Validate new assigned user exists and is active Staff
  const newAssignedUser = await User.findOne({
    _id: newAssignedTo,
    isDeleted: false,
    isActive: true,
    role: "Staff",
  });

  if (!newAssignedUser) {
    throw new ApiError(404, "Assigned user not found, inactive, or is not a Staff member");
  }

  // Store old values for logging
  const oldValues = {
    assignedTo: task.assignedTo.toString(),
  };

  // Update assignedTo
  task.assignedTo = newAssignedTo;
  await task.save();

  // Log activity
  await createActivityLog({
    taskId: task._id,
    performedBy: performedBy,
    actionType: actionTypes.TASK_ASSIGNED,
    oldValues: oldValues,
    newValues: {
      assignedTo: task.assignedTo.toString(),
    },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("taskAssigned", {
      taskId: task._id.toString(),
      title: task.title,
      oldAssignedTo: oldValues.assignedTo,
      newAssignedTo: task.assignedTo.toString(),
      newAssignedToName: newAssignedUser.name,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit task assigned event", {
      error: socketError.message,
      taskId: task._id,
    });
  }

  logger.info("Task assigned", {
    taskId: task._id,
    title: task.title,
    oldAssignedTo: oldValues.assignedTo,
    newAssignedTo: task.assignedTo.toString(),
    performedBy: performedBy,
  });

  const populatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .populate("relatedOrder", "orderNumber customerName")
    .populate("relatedReceiving", "receivingNumber supplier")
    .lean();

  return populatedTask;
};

/**
 * Update task status
 * Handles workflow validation and time tracking
 * @param {string} taskId - Task ID
 * @param {string} newStatus - New task status
 * @param {string} performedBy - User ID performing the action
 * @param {string} userRole - Current user role
 * @param {string} userId - Current user ID
 * @returns {Promise<Object>} - Updated task
 */
export const updateTaskStatus = async (taskId, newStatus, performedBy, userRole, userId) => {
  const task = await Task.findOne({
    _id: taskId,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Staff can only update their own tasks
  if (userRole === "Staff" && task.assignedTo.toString() !== userId.toString()) {
    throw new ApiError(403, "Staff can only update status of their assigned tasks");
  }

  const oldStatus = task.status;

  // Validate status transition
  if (!task.canTransitionTo(newStatus)) {
    throw new ApiError(
      400,
      `Invalid status transition from ${oldStatus} to ${newStatus}`
    );
  }

  // Handle status changes
  if (newStatus === taskStatus.IN_PROGRESS) {
    // Start task - set startedAt timestamp
    if (!task.startedAt) {
      task.startedAt = new Date();
    }
    task.status = newStatus;
  } else if (newStatus === taskStatus.COMPLETED) {
    // Complete task - set completedAt and calculate duration
    task.completedAt = new Date();
    task.status = newStatus;

    // Calculate completion duration if startedAt exists
    if (task.startedAt) {
      const durationMs = task.completedAt.getTime() - task.startedAt.getTime();
      task.completionDuration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
    }
  } else if (newStatus === taskStatus.CANCELLED) {
    // Cancel task
    if (!task.canBeCancelled()) {
      throw new ApiError(
        400,
        `Task cannot be cancelled from ${oldStatus} status. Only Pending or InProgress tasks can be cancelled.`
      );
    }
    task.status = newStatus;
  } else {
    task.status = newStatus;
  }

  await task.save();

  // Determine action type for logging
  let actionType = actionTypes.TASK_STATUS_UPDATED;
  if (newStatus === taskStatus.COMPLETED) {
    actionType = actionTypes.TASK_COMPLETED;
  } else if (newStatus === taskStatus.CANCELLED) {
    actionType = actionTypes.TASK_CANCELLED;
  }

  // Log activity
  await createActivityLog({
    taskId: task._id,
    performedBy: performedBy,
    actionType: actionType,
    oldValues: { status: oldStatus },
    newValues: {
      status: newStatus,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      completionDuration: task.completionDuration,
    },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    const eventName = newStatus === taskStatus.COMPLETED
      ? "taskCompleted"
      : newStatus === taskStatus.CANCELLED
      ? "taskCancelled"
      : "taskStatusUpdated";

    io.emit(eventName, {
      taskId: task._id.toString(),
      title: task.title,
      assignedTo: task.assignedTo.toString(),
      oldStatus: oldStatus,
      newStatus: newStatus,
      completionDuration: task.completionDuration,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit task status updated event", {
      error: socketError.message,
      taskId: task._id,
    });
  }

  logger.info("Task status updated", {
    taskId: task._id,
    title: task.title,
    oldStatus: oldStatus,
    newStatus: newStatus,
    completionDuration: task.completionDuration,
    performedBy: performedBy,
  });

  const populatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email role")
    .populate("relatedOrder", "orderNumber customerName")
    .populate("relatedReceiving", "receivingNumber supplier")
    .lean();

  return populatedTask;
};

/**
 * Soft delete task
 * @param {string} taskId - Task ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Deleted task
 */
export const deleteTask = async (taskId, performedBy) => {
  const task = await Task.findOne({
    _id: taskId,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Store old values for logging
  const oldValues = {
    title: task.title,
    taskType: task.taskType,
    assignedTo: task.assignedTo.toString(),
    status: task.status,
  };

  // Soft delete
  await task.softDelete();

  // Log activity
  await createActivityLog({
    taskId: task._id,
    performedBy: performedBy,
    actionType: actionTypes.TASK_DELETED,
    oldValues: oldValues,
    newValues: {
      isDeleted: true,
      deletedAt: task.deletedAt,
    },
    timestamp: new Date(),
  });

  logger.info("Task deleted (soft delete)", {
    taskId: task._id,
    title: task.title,
    performedBy: performedBy,
  });

  return task.toJSON();
};

/**
 * Get task activity logs
 * @param {string} taskId - Task ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated activity logs
 */
export const getTaskActivityLogs = async (taskId, queryParams) => {
  // Verify task exists
  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const { page = 1, limit = 20 } = queryParams;
  const skip = (page - 1) * limit;

  const [logs, totalLogs] = await Promise.all([
    TaskActivityLog.find({ taskId })
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TaskActivityLog.countDocuments({ taskId }),
  ]);

  const totalPages = Math.ceil(totalLogs / limit);

  return {
    logs,
    pagination: {
      totalLogs,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
