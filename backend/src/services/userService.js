import User, { userRoles } from "../models/User.js";
import UserActivityLog, { actionTypes } from "../models/UserActivityLog.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";

/**
 * User Management Service
 * Business logic for user management operations
 * Handles CRUD operations, role management, and activity logging
 */

/**
 * Create activity log entry
 * @param {Object} logData - Activity log data
 * @returns {Promise<Object>} - Created log entry
 */
const createActivityLog = async (logData) => {
  try {
    const log = new UserActivityLog(logData);
    await log.save();
    return log;
  } catch (error) {
    logger.error("Failed to create activity log", {
      error: error.message,
      logData: logData,
    });
    // Don't throw error - logging failure shouldn't break user operations
  }
};

/**
 * Get client IP and user agent from request
 * @param {Object} req - Express request object
 * @returns {Object} - IP and user agent
 */
const getRequestMetadata = (req) => {
  return {
    ipAddress:
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      req.ip ||
      "unknown",
    userAgent: req.get("user-agent") || "unknown",
  };
};

/**
 * Create a new user
 * @param {Object} userData - User creation data
 * @param {string} performedBy - Admin user ID performing the action
 * @param {Object} req - Express request object (for metadata)
 * @returns {Promise<Object>} - Created user
 */
export const createUser = async (userData, performedBy, req) => {
  const { name, email, password, role } = userData;

  // Check if email already exists (excluding deleted users)
  const existingUser = await User.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
  });

  if (existingUser) {
    logger.warn("User creation attempt with existing email", {
      email: email.toLowerCase(),
      performedBy: performedBy,
    });
    throw new ApiError(409, "Email already registered");
  }

  // Create new user
  const user = new User({
    name,
    email: email.toLowerCase(),
    password,
    role: role || userRoles.STAFF,
    isActive: true,
    isDeleted: false,
  });

  await user.save();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    user: user._id,
    performedBy: performedBy,
    actionType: actionTypes.USER_CREATED,
    newValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    ...metadata,
  });

  logger.info("User created", {
    userId: user._id,
    email: user.email,
    role: user.role,
    performedBy: performedBy,
  });

  return user.toJSON();
};

/**
 * Get all users with pagination and filtering
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated users
 */
export const getUsers = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    role,
    isActive,
    sortBy = "createdAt",
    order = "desc",
  } = queryParams;

  // Build query
  const query = { isDeleted: false };

  // Search filter (name or email)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Role filter
  if (role) {
    query.role = role;
  }

  // Active status filter
  if (isActive !== undefined) {
    query.isActive = isActive === true || isActive === "true";
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  // Execute query
  const [users, totalUsers] = await Promise.all([
    User.find(query)
      .select("-password -refreshToken -loginAttempts -lockUntil")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  return {
    users,
    pagination: {
      totalUsers,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User object
 */
export const getUserById = async (userId) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  }).select("-password -refreshToken -loginAttempts -lockUntil");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user.toJSON();
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @param {string} performedBy - Admin user ID performing the action
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Updated user
 */
export const updateUser = async (userId, updateData, performedBy, req) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Store old values for logging
  const oldValues = {
    name: user.name,
    email: user.email,
    isActive: user.isActive,
  };

  // Check if email is being changed and if it's already taken
  if (updateData.email && updateData.email.toLowerCase() !== user.email) {
    const existingUser = await User.findOne({
      email: updateData.email.toLowerCase(),
      isDeleted: false,
      _id: { $ne: userId },
    });

    if (existingUser) {
      throw new ApiError(409, "Email already registered");
    }
  }

  // Update fields
  if (updateData.name) user.name = updateData.name;
  if (updateData.email) user.email = updateData.email.toLowerCase();
  if (updateData.isActive !== undefined) {
    const wasActive = user.isActive;
    user.isActive = updateData.isActive;

    // Log activation/deactivation
    const metadata = getRequestMetadata(req);
    await createActivityLog({
      user: user._id,
      performedBy: performedBy,
      actionType: updateData.isActive
        ? actionTypes.USER_ACTIVATED
        : actionTypes.USER_DEACTIVATED,
      oldValues: { isActive: wasActive },
      newValues: { isActive: user.isActive },
      ...metadata,
    });
  }

  await user.save();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    user: user._id,
    performedBy: performedBy,
    actionType: actionTypes.USER_UPDATED,
    oldValues: oldValues,
    newValues: {
      name: user.name,
      email: user.email,
      isActive: user.isActive,
    },
    ...metadata,
  });

  logger.info("User updated", {
    userId: user._id,
    email: user.email,
    performedBy: performedBy,
  });

  return user.toJSON();
};

/**
 * Change user role
 * @param {string} userId - User ID
 * @param {string} newRole - New role
 * @param {string} performedBy - Admin user ID performing the action
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Updated user
 */
export const changeUserRole = async (userId, newRole, performedBy, req) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Prevent Admin from removing their own Admin role
  if (userId === performedBy && user.role === userRoles.ADMIN && newRole !== userRoles.ADMIN) {
    throw new ApiError(403, "Cannot remove Admin role from yourself");
  }

  // Check if this is the last Admin
  if (user.role === userRoles.ADMIN && newRole !== userRoles.ADMIN) {
    const adminCount = await User.countDocuments({
      role: userRoles.ADMIN,
      isDeleted: false,
      isActive: true,
    });

    if (adminCount <= 1) {
      throw new ApiError(
        403,
        "Cannot remove Admin role. At least one active Admin must exist in the system"
      );
    }
  }

  const oldRole = user.role;
  user.role = newRole;
  await user.save();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    user: user._id,
    performedBy: performedBy,
    actionType: actionTypes.ROLE_CHANGED,
    oldValues: { role: oldRole },
    newValues: { role: newRole },
    ...metadata,
  });

  logger.info("User role changed", {
    userId: user._id,
    email: user.email,
    oldRole: oldRole,
    newRole: newRole,
    performedBy: performedBy,
  });

  return user.toJSON();
};

/**
 * Toggle user active status
 * @param {string} userId - User ID
 * @param {boolean} isActive - New active status
 * @param {string} performedBy - Admin user ID performing the action
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Updated user
 */
export const toggleUserStatus = async (userId, isActive, performedBy, req) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Prevent Admin from deactivating themselves
  if (userId === performedBy && !isActive) {
    throw new ApiError(403, "Cannot deactivate yourself");
  }

  // Prevent deactivating last Admin
  if (user.role === userRoles.ADMIN && !isActive) {
    const activeAdminCount = await User.countDocuments({
      role: userRoles.ADMIN,
      isDeleted: false,
      isActive: true,
      _id: { $ne: userId },
    });

    if (activeAdminCount === 0) {
      throw new ApiError(
        403,
        "Cannot deactivate last Admin. At least one active Admin must exist"
      );
    }
  }

  const oldStatus = user.isActive;
  user.isActive = isActive;
  await user.save();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    user: user._id,
    performedBy: performedBy,
    actionType: isActive ? actionTypes.USER_ACTIVATED : actionTypes.USER_DEACTIVATED,
    oldValues: { isActive: oldStatus },
    newValues: { isActive: isActive },
    ...metadata,
  });

  logger.info(`User ${isActive ? "activated" : "deactivated"}`, {
    userId: user._id,
    email: user.email,
    performedBy: performedBy,
  });

  return user.toJSON();
};

/**
 * Soft delete user
 * @param {string} userId - User ID
 * @param {string} performedBy - Admin user ID performing the action
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Deleted user
 */
export const deleteUser = async (userId, performedBy, req) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Prevent Admin from deleting themselves
  if (userId === performedBy) {
    throw new ApiError(403, "Cannot delete yourself");
  }

  // Prevent deleting last Admin
  if (user.role === userRoles.ADMIN) {
    const adminCount = await User.countDocuments({
      role: userRoles.ADMIN,
      isDeleted: false,
      isActive: true,
      _id: { $ne: userId },
    });

    if (adminCount === 0) {
      throw new ApiError(
        403,
        "Cannot delete last Admin. At least one active Admin must exist"
      );
    }
  }

  // Store old values for logging
  const oldValues = {
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  // Soft delete
  await user.softDelete();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    user: user._id,
    performedBy: performedBy,
    actionType: actionTypes.USER_DELETED,
    oldValues: oldValues,
    newValues: {
      isDeleted: true,
      deletedAt: user.deletedAt,
    },
    ...metadata,
  });

  logger.info("User deleted (soft delete)", {
    userId: user._id,
    email: user.email,
    performedBy: performedBy,
  });

  return user.toJSON();
};

/**
 * Get user activity logs
 * @param {string} userId - User ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated activity logs
 */
export const getUserActivityLogs = async (userId, queryParams) => {
  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { page = 1, limit = 20 } = queryParams;
  const skip = (page - 1) * limit;

  const [logs, totalLogs] = await Promise.all([
    UserActivityLog.find({ user: userId })
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserActivityLog.countDocuments({ user: userId }),
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
