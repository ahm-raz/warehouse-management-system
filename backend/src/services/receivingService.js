import mongoose from "mongoose";
import Receiving, { receivingStatus } from "../models/Receiving.js";
import ReceivingActivityLog, { actionTypes } from "../models/ReceivingActivityLog.js";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
import InventoryLog, { actionTypes as inventoryActionTypes } from "../models/InventoryLog.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import { getSocket } from "../config/socket.js";

/**
 * Receiving Management Service
 * Business logic for receiving operations
 * Handles CRUD operations, status workflow, inventory increment, and activity logging
 */

/**
 * Create activity log entry
 * @param {Object} logData - Activity log data
 * @returns {Promise<Object>} - Created log entry
 */
const createActivityLog = async (logData) => {
  try {
    const log = new ReceivingActivityLog(logData);
    await log.save();
    return log;
  } catch (error) {
    logger.error("Failed to create receiving activity log", {
      error: error.message,
      logData: logData,
    });
    // Don't throw error - logging failure shouldn't break receiving operations
  }
};

/**
 * Create a new receiving record
 * Validates supplier and products but does NOT increment inventory yet
 * @param {Object} receivingData - Receiving creation data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Created receiving record
 */
export const createReceiving = async (receivingData, performedBy) => {
  const { supplier, receivedItems, notes } = receivingData;

  // Validate supplier exists and is active
  const supplierDoc = await Supplier.findOne({
    _id: supplier,
    isDeleted: false,
    status: "ACTIVE",
  });

  if (!supplierDoc) {
    throw new ApiError(404, "Supplier not found, inactive, or has been deleted");
  }

  // Validate products exist and get current data
  const productIds = receivedItems.map((item) => item.product);
  const products = await Product.find({
    _id: { $in: productIds },
    isDeleted: false,
  }).lean();

  if (products.length !== productIds.length) {
    throw new ApiError(404, "One or more products not found or have been deleted");
  }

  // Create product map for quick lookup
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // Prepare received items with cost snapshots and calculate totals
  const processedItems = [];
  let totalQuantity = 0;

  for (const item of receivedItems) {
    const product = productMap.get(item.product.toString());

    if (!product) {
      throw new ApiError(404, `Product ${item.product} not found`);
    }

    // Capture cost snapshot
    const unitCost = item.unitCost;
    const subtotal = unitCost * item.quantity;
    totalQuantity += item.quantity;

    processedItems.push({
      product: product._id,
      quantity: item.quantity,
      unitCost: unitCost,
      subtotal: parseFloat(subtotal.toFixed(2)),
    });
  }

  // Generate unique receiving number
  const receivingNumber = await Receiving.generateReceivingNumber();

  // Create new receiving record
  const receiving = new Receiving({
    receivingNumber,
    supplier: supplier,
    receivedItems: processedItems,
    receivedBy: performedBy,
    totalItems: processedItems.length,
    totalQuantity: totalQuantity,
    status: receivingStatus.PENDING,
    notes: notes || undefined,
  });

  await receiving.save();

  // Log activity
  await createActivityLog({
    receivingId: receiving._id,
    performedBy: performedBy,
    actionType: actionTypes.RECEIVING_CREATED,
    newValues: {
      receivingNumber: receiving.receivingNumber,
      supplier: supplier.toString(),
      totalItems: receiving.totalItems,
      totalQuantity: receiving.totalQuantity,
      status: receiving.status,
    },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("receivingCreated", {
      receivingId: receiving._id.toString(),
      receivingNumber: receiving.receivingNumber,
      supplier: supplier.toString(),
      supplierName: supplierDoc.name,
      totalQuantity: receiving.totalQuantity,
      status: receiving.status,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit receiving created event", {
      error: socketError.message,
      receivingId: receiving._id,
    });
  }

  logger.info("Receiving created", {
    receivingId: receiving._id,
    receivingNumber: receiving.receivingNumber,
    supplier: supplier.toString(),
    totalQuantity: receiving.totalQuantity,
    performedBy: performedBy,
  });

  // Populate supplier and product details for response
  const populatedReceiving = await Receiving.findById(receiving._id)
    .populate("supplier", "name email company")
    .populate("receivedItems.product", "name SKU")
    .populate("receivedBy", "name email")
    .lean();

  return populatedReceiving;
};

/**
 * Get all receiving records with pagination and filtering
 * @param {Object} queryParams - Query parameters
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} - Paginated receiving records
 */
export const getReceivings = async (queryParams, userId, userRole) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    supplier,
    status,
    receivedBy,
    startDate,
    endDate,
    sortBy = "createdAt",
    order = "desc",
  } = queryParams;

  // Build query
  const query = { isDeleted: false };

  // Search filter (receivingNumber)
  if (search) {
    query.receivingNumber = { $regex: search, $options: "i" };
  }

  // Supplier filter
  if (supplier) {
    query.supplier = new mongoose.Types.ObjectId(supplier);
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // ReceivedBy filter (Admin/Manager can filter by any user, Staff see only their own)
  if (receivedBy) {
    if (userRole === "Admin" || userRole === "Manager") {
      query.receivedBy = new mongoose.Types.ObjectId(receivedBy);
    }
  } else if (userRole === "Staff") {
    // Staff can only see their own receiving records
    query.receivedBy = userId;
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
  const [receivings, totalReceivings] = await Promise.all([
    Receiving.find(query)
      .populate("supplier", "name email company")
      .populate("receivedItems.product", "name SKU")
      .populate("receivedBy", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Receiving.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalReceivings / limit);

  return {
    receivings,
    pagination: {
      totalReceivings,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get receiving by ID
 * @param {string} receivingId - Receiving ID
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} - Receiving object
 */
export const getReceivingById = async (receivingId, userId, userRole) => {
  const query = {
    _id: receivingId,
    isDeleted: false,
  };

  // Staff can only access their own receiving records
  if (userRole === "Staff") {
    query.receivedBy = userId;
  }

  const receiving = await Receiving.findOne(query)
    .populate("supplier", "name email company phone address")
    .populate("receivedItems.product", "name SKU description")
    .populate("receivedBy", "name email role")
    .lean();

  if (!receiving) {
    throw new ApiError(404, "Receiving record not found or access denied");
  }

  return receiving;
};

/**
 * Update receiving status
 * Handles workflow validation and inventory increment for Completed status
 * @param {string} receivingId - Receiving ID
 * @param {string} newStatus - New receiving status
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Updated receiving record
 */
export const updateReceivingStatus = async (receivingId, newStatus, performedBy) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const receiving = await Receiving.findOne({
      _id: receivingId,
      isDeleted: false,
    }).session(session);

    if (!receiving) {
      throw new ApiError(404, "Receiving record not found");
    }

    const oldStatus = receiving.status;

    // Validate status transition
    if (!receiving.canTransitionTo(newStatus)) {
      throw new ApiError(
        400,
        `Invalid status transition from ${oldStatus} to ${newStatus}`
      );
    }

    // Handle cancellation
    if (newStatus === receivingStatus.CANCELLED) {
      if (!receiving.canBeCancelled()) {
        throw new ApiError(
          400,
          `Receiving cannot be cancelled from ${oldStatus} status. Only Pending receivings can be cancelled.`
        );
      }

      receiving.status = newStatus;
      await receiving.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Log cancellation
      await createActivityLog({
        receivingId: receiving._id,
        performedBy: performedBy,
        actionType: actionTypes.RECEIVING_CANCELLED,
        oldValues: { status: oldStatus },
        newValues: { status: newStatus },
        timestamp: new Date(),
      });

      // Emit Socket.io event
      try {
        const io = getSocket();
        io.emit("receivingCancelled", {
          receivingId: receiving._id.toString(),
          receivingNumber: receiving.receivingNumber,
          supplier: receiving.supplier.toString(),
          oldStatus: oldStatus,
          updatedBy: performedBy,
          timestamp: new Date().toISOString(),
        });
      } catch (socketError) {
        logger.error("Failed to emit receiving cancelled event", {
          error: socketError.message,
          receivingId: receiving._id,
        });
      }

      logger.info("Receiving cancelled", {
        receivingId: receiving._id,
        receivingNumber: receiving.receivingNumber,
        oldStatus: oldStatus,
        performedBy: performedBy,
      });

      const populatedReceiving = await Receiving.findById(receiving._id)
        .populate("supplier", "name email company")
        .populate("receivedItems.product", "name SKU")
        .populate("receivedBy", "name email")
        .lean();

      return populatedReceiving;
    }

    // Handle completion - increment inventory
    if (newStatus === receivingStatus.COMPLETED) {
      // Increment inventory for each product using transaction
      for (const item of receiving.receivedItems) {
        const product = await Product.findById(item.product).session(session);

        if (!product || product.isDeleted) {
          throw new ApiError(404, `Product ${item.product} not found or deleted`);
        }

        // Increment inventory
        const previousQuantity = product.quantity;
        product.quantity += item.quantity;
        await product.save({ session });

        // Create inventory log entry
        const inventoryLog = new InventoryLog({
          productId: product._id,
          action: inventoryActionTypes.ADD,
          quantityChanged: item.quantity,
          previousQuantity: previousQuantity,
          newQuantity: product.quantity,
          performedBy: performedBy,
          note: `Receiving ${receiving.receivingNumber} completed`,
        });

        await inventoryLog.save({ session });

        // Update location occupancy if product has storage location
        if (product.storageLocation) {
          try {
            const Location = mongoose.model("Location");
            const location = await Location.findById(product.storageLocation).session(session);
            if (location && !location.isDeleted) {
              location.currentOccupancy += item.quantity;
              await location.save({ session });
            }
          } catch (locationError) {
            logger.error("Failed to update location occupancy during receiving completion", {
              error: locationError.message,
              locationId: product.storageLocation,
              productId: product._id,
            });
            // Don't throw - location update failure shouldn't break receiving completion
          }
        }

        logger.info("Inventory incremented for receiving completion", {
          receivingId: receiving._id,
          receivingNumber: receiving.receivingNumber,
          productId: product._id,
          quantity: item.quantity,
          previousQuantity: previousQuantity,
          newQuantity: product.quantity,
        });
      }
    }

    // Update receiving status
    receiving.status = newStatus;
    await receiving.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Log activity
    await createActivityLog({
      receivingId: receiving._id,
      performedBy: performedBy,
      actionType: newStatus === receivingStatus.COMPLETED
        ? actionTypes.RECEIVING_COMPLETED
        : actionTypes.RECEIVING_UPDATED,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      timestamp: new Date(),
    });

    // Emit Socket.io event
    try {
      const io = getSocket();
      if (newStatus === receivingStatus.COMPLETED) {
        io.emit("receivingCompleted", {
          receivingId: receiving._id.toString(),
          receivingNumber: receiving.receivingNumber,
          supplier: receiving.supplier.toString(),
          totalQuantity: receiving.totalQuantity,
          updatedBy: performedBy,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (socketError) {
      logger.error("Failed to emit receiving completed event", {
        error: socketError.message,
        receivingId: receiving._id,
      });
    }

    logger.info("Receiving status updated", {
      receivingId: receiving._id,
      receivingNumber: receiving.receivingNumber,
      oldStatus: oldStatus,
      newStatus: newStatus,
      performedBy: performedBy,
    });

    const populatedReceiving = await Receiving.findById(receiving._id)
      .populate("supplier", "name email company")
      .populate("receivedItems.product", "name SKU")
      .populate("receivedBy", "name email")
      .lean();

    return populatedReceiving;
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();

    if (error instanceof ApiError) {
      throw error;
    }

    logger.error("Receiving status update failed", {
      error: error.message,
      receivingId: receivingId,
      newStatus: newStatus,
      performedBy: performedBy,
    });

    throw new ApiError(500, "Failed to update receiving status");
  } finally {
    session.endSession();
  }
};

/**
 * Soft delete receiving
 * @param {string} receivingId - Receiving ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Deleted receiving record
 */
export const deleteReceiving = async (receivingId, performedBy) => {
  const receiving = await Receiving.findOne({
    _id: receivingId,
    isDeleted: false,
  });

  if (!receiving) {
    throw new ApiError(404, "Receiving record not found");
  }

  // Prevent deletion of completed receivings
  if (receiving.status === receivingStatus.COMPLETED) {
    throw new ApiError(
      400,
      `Cannot delete receiving with status ${receiving.status}. Only Pending or Cancelled receivings can be deleted.`
    );
  }

  // Store old values for logging
  const oldValues = {
    receivingNumber: receiving.receivingNumber,
    supplier: receiving.supplier.toString(),
    status: receiving.status,
    totalQuantity: receiving.totalQuantity,
  };

  // Soft delete
  await receiving.softDelete();

  // Log activity
  await createActivityLog({
    receivingId: receiving._id,
    performedBy: performedBy,
    actionType: actionTypes.RECEIVING_DELETED,
    oldValues: oldValues,
    newValues: {
      isDeleted: true,
      deletedAt: receiving.deletedAt,
    },
    timestamp: new Date(),
  });

  logger.info("Receiving deleted (soft delete)", {
    receivingId: receiving._id,
    receivingNumber: receiving.receivingNumber,
    performedBy: performedBy,
  });

  return receiving.toJSON();
};

/**
 * Get receiving activity logs
 * @param {string} receivingId - Receiving ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated activity logs
 */
export const getReceivingActivityLogs = async (receivingId, queryParams) => {
  // Verify receiving exists
  const receiving = await Receiving.findById(receivingId);
  if (!receiving) {
    throw new ApiError(404, "Receiving record not found");
  }

  const { page = 1, limit = 20 } = queryParams;
  const skip = (page - 1) * limit;

  const [logs, totalLogs] = await Promise.all([
    ReceivingActivityLog.find({ receivingId })
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReceivingActivityLog.countDocuments({ receivingId }),
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
