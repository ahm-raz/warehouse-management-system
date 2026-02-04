import Supplier, { supplierStatus } from "../models/Supplier.js";
import SupplierActivityLog, { actionTypes } from "../models/SupplierActivityLog.js";
import Product from "../models/Product.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import mongoose from "mongoose";
import { getSocket } from "../config/socket.js";

/**
 * Supplier Management Service
 * Business logic for supplier operations
 * Handles CRUD operations, status management, and product relationships
 */

/**
 * Create activity log entry
 * @param {Object} logData - Activity log data
 * @returns {Promise<Object>} - Created log entry
 */
const createActivityLog = async (logData) => {
  try {
    const log = new SupplierActivityLog(logData);
    await log.save();
    return log;
  } catch (error) {
    logger.error("Failed to create supplier activity log", {
      error: error.message,
      logData: logData,
    });
    // Don't throw error - logging failure shouldn't break supplier operations
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
 * Create a new supplier
 * @param {Object} supplierData - Supplier creation data
 * @param {string} performedBy - User ID performing the action
 * @param {Object} req - Express request object (for metadata)
 * @returns {Promise<Object>} - Created supplier
 */
export const createSupplier = async (supplierData, performedBy, req) => {
  const { email } = supplierData;

  // Check if email already exists (excluding deleted suppliers)
  const existingSupplier = await Supplier.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
  });

  if (existingSupplier) {
    logger.warn("Supplier creation attempt with existing email", {
      email: email.toLowerCase(),
      performedBy: performedBy,
    });
    throw new ApiError(409, "Email already registered");
  }

  // Create new supplier
  const supplier = new Supplier({
    ...supplierData,
    email: email.toLowerCase(),
    status: supplierData.status || supplierStatus.ACTIVE,
  });

  await supplier.save();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    supplier: supplier._id,
    performedBy: performedBy,
    actionType: actionTypes.SUPPLIER_CREATED,
    newValues: {
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      company: supplier.company,
      status: supplier.status,
    },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("supplierCreated", {
      supplierId: supplier._id.toString(),
      supplierName: supplier.name,
      status: supplier.status,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit supplier created event", {
      error: socketError.message,
      supplierId: supplier._id,
    });
  }

  logger.info("Supplier created", {
    supplierId: supplier._id,
    name: supplier.name,
    email: supplier.email,
    performedBy: performedBy,
  });

  return supplier.toJSON();
};

/**
 * Get all suppliers with pagination and filtering
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated suppliers
 */
export const getSuppliers = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status,
    sortBy = "createdAt",
    order = "desc",
  } = queryParams;

  // Build query
  const query = { isDeleted: false };

  // Search filter (name, email, or company)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  // Execute query
  const [suppliers, totalSuppliers] = await Promise.all([
    Supplier.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Supplier.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalSuppliers / limit);

  return {
    suppliers,
    pagination: {
      totalSuppliers,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get supplier by ID
 * @param {string} supplierId - Supplier ID
 * @returns {Promise<Object>} - Supplier object
 */
export const getSupplierById = async (supplierId) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    isDeleted: false,
  }).lean();

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  return supplier;
};

/**
 * Update supplier
 * @param {string} supplierId - Supplier ID
 * @param {Object} updateData - Update data
 * @param {string} performedBy - User ID performing the action
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Updated supplier
 */
export const updateSupplier = async (supplierId, updateData, performedBy, req) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    isDeleted: false,
  });

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  // Store old values for logging
  const oldValues = {
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    company: supplier.company,
  };

  // Check if email is being changed and if it's already taken
  if (updateData.email && updateData.email.toLowerCase() !== supplier.email) {
    const existingSupplier = await Supplier.findOne({
      email: updateData.email.toLowerCase(),
      isDeleted: false,
      _id: { $ne: supplierId },
    });

    if (existingSupplier) {
      throw new ApiError(409, "Email already registered");
    }
  }

  // Update fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      if (key === "email") {
        supplier[key] = updateData[key].toLowerCase();
      } else {
        supplier[key] = updateData[key];
      }
    }
  });

  await supplier.save();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    supplier: supplier._id,
    performedBy: performedBy,
    actionType: actionTypes.SUPPLIER_UPDATED,
    oldValues: oldValues,
    newValues: {
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      company: supplier.company,
    },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("supplierUpdated", {
      supplierId: supplier._id.toString(),
      supplierName: supplier.name,
      status: supplier.status,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit supplier updated event", {
      error: socketError.message,
      supplierId: supplier._id,
    });
  }

  logger.info("Supplier updated", {
    supplierId: supplier._id,
    name: supplier.name,
    email: supplier.email,
    performedBy: performedBy,
  });

  return supplier.toJSON();
};

/**
 * Change supplier status
 * @param {string} supplierId - Supplier ID
 * @param {string} newStatus - New status
 * @param {string} performedBy - User ID performing the action
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Updated supplier
 */
export const changeSupplierStatus = async (supplierId, newStatus, performedBy, req) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    isDeleted: false,
  });

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  const oldStatus = supplier.status;

  if (oldStatus === newStatus) {
    throw new ApiError(400, `Supplier is already ${newStatus}`);
  }

  supplier.status = newStatus;
  await supplier.save();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    supplier: supplier._id,
    performedBy: performedBy,
    actionType: actionTypes.STATUS_CHANGED,
    oldValues: { status: oldStatus },
    newValues: { status: newStatus },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("supplierStatusChanged", {
      supplierId: supplier._id.toString(),
      supplierName: supplier.name,
      oldStatus: oldStatus,
      newStatus: newStatus,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit supplier status changed event", {
      error: socketError.message,
      supplierId: supplier._id,
    });
  }

  logger.info("Supplier status changed", {
    supplierId: supplier._id,
    name: supplier.name,
    oldStatus: oldStatus,
    newStatus: newStatus,
    performedBy: performedBy,
  });

  return supplier.toJSON();
};

/**
 * Soft delete supplier
 * @param {string} supplierId - Supplier ID
 * @param {string} performedBy - User ID performing the action
 * @param {Object} req - Express request object
 * @param {boolean} checkProducts - Whether to check for linked products (default: true)
 * @returns {Promise<Object>} - Deleted supplier
 */
export const deleteSupplier = async (supplierId, performedBy, req, checkProducts = true) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    isDeleted: false,
  });

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  // Check if any products use this supplier (optional validation)
  if (checkProducts) {
    const productCount = await Product.countDocuments({
      supplier: supplierId,
      isDeleted: false,
    });

    if (productCount > 0) {
      logger.warn("Supplier deletion attempt with linked products", {
        supplierId: supplierId,
        name: supplier.name,
        productCount: productCount,
        performedBy: performedBy,
      });
      throw new ApiError(
        400,
        `Cannot delete supplier. ${productCount} product(s) are linked to this supplier. Please reassign products to another supplier first.`
      );
    }
  }

  // Store old values for logging
  const oldValues = {
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    company: supplier.company,
    status: supplier.status,
  };

  // Soft delete
  await supplier.softDelete();

  // Log activity
  const metadata = getRequestMetadata(req);
  await createActivityLog({
    supplier: supplier._id,
    performedBy: performedBy,
    actionType: actionTypes.SUPPLIER_DELETED,
    oldValues: oldValues,
    newValues: {
      isDeleted: true,
      deletedAt: supplier.deletedAt,
    },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("supplierDeleted", {
      supplierId: supplier._id.toString(),
      supplierName: supplier.name,
      status: supplier.status,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit supplier deleted event", {
      error: socketError.message,
      supplierId: supplier._id,
    });
  }

  logger.info("Supplier deleted (soft delete)", {
    supplierId: supplier._id,
    name: supplier.name,
    email: supplier.email,
    performedBy: performedBy,
  });

  return supplier.toJSON();
};

/**
 * Get products linked to supplier
 * @param {string} supplierId - Supplier ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated products
 */
export const getSupplierProducts = async (supplierId, queryParams) => {
  // Verify supplier exists
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  const { page = 1, limit = 20 } = queryParams;
  const skip = (page - 1) * limit;

  const [products, totalProducts] = await Promise.all([
    Product.find({
      supplier: supplierId,
      isDeleted: false,
    })
      .populate("category", "name")
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments({
      supplier: supplierId,
      isDeleted: false,
    }),
  ]);

  const totalPages = Math.ceil(totalProducts / limit);

  return {
    products,
    pagination: {
      totalProducts,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get supplier activity logs
 * @param {string} supplierId - Supplier ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated activity logs
 */
export const getSupplierActivityLogs = async (supplierId, queryParams) => {
  // Verify supplier exists
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  const { page = 1, limit = 20 } = queryParams;
  const skip = (page - 1) * limit;

  const [logs, totalLogs] = await Promise.all([
    SupplierActivityLog.find({ supplier: supplierId })
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupplierActivityLog.countDocuments({ supplier: supplierId }),
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
