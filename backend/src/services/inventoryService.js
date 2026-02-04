import mongoose from "mongoose";
import Product from "../models/Product.js";
import InventoryLog, { actionTypes } from "../models/InventoryLog.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import { getSocket } from "../config/socket.js";

/**
 * Inventory Management Service
 * Business logic for inventory operations
 * Handles stock adjustments with transactional consistency
 */

/**
 * Adjust stock quantity
 * Uses MongoDB transactions to ensure data consistency
 * @param {string} productId - Product ID
 * @param {string} adjustmentType - ADD or REMOVE
 * @param {number} quantity - Quantity to adjust
 * @param {string} performedBy - User ID performing the action
 * @param {string} note - Optional note
 * @returns {Promise<Object>} - Updated product and log entry
 */
export const adjustStock = async (
  productId,
  adjustmentType,
  quantity,
  performedBy,
  note = ""
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find product (excluding deleted)
    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
    }).session(session);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const previousQuantity = product.quantity;
    let newQuantity;

    // Calculate new quantity based on adjustment type
    if (adjustmentType === actionTypes.ADD) {
      newQuantity = previousQuantity + quantity;
    } else if (adjustmentType === actionTypes.REMOVE) {
      newQuantity = previousQuantity - quantity;

      // Prevent negative stock
      if (newQuantity < 0) {
        throw new ApiError(
          400,
          `Insufficient stock. Available: ${previousQuantity}, Requested: ${quantity}`
        );
      }
    } else {
      throw new ApiError(400, "Invalid adjustment type");
    }

    // Update product quantity
    product.quantity = newQuantity;
    await product.save({ session });

    // Create inventory log entry
    const inventoryLog = new InventoryLog({
      productId: product._id,
      action: adjustmentType,
      quantityChanged: adjustmentType === actionTypes.ADD ? quantity : -quantity,
      previousQuantity,
      newQuantity,
      performedBy,
      note: note || undefined,
    });

    await inventoryLog.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Update location occupancy if product has storage location
    if (product.storageLocation) {
      try {
        const { recalculateLocationOccupancy } = await import("./locationService.js");
        await recalculateLocationOccupancy(product.storageLocation.toString());
      } catch (locationError) {
        logger.error("Failed to update location occupancy", {
          error: locationError.message,
          locationId: product.storageLocation,
          productId: product._id,
        });
        // Don't throw - location update failure shouldn't break inventory update
      }
    }

    // Check for low stock alert
    const isLowStock = product.isLowStock();
    if (isLowStock) {
      logger.warn("Low stock alert", {
        productId: product._id,
        SKU: product.SKU,
        name: product.name,
        quantity: newQuantity,
        minimumStockLevel: product.minimumStockLevel,
      });

      // Emit low stock alert via Socket.io
      try {
        const io = getSocket();
        io.emit("lowStockAlert", {
          productId: product._id.toString(),
          SKU: product.SKU,
          name: product.name,
          quantity: newQuantity,
          minimumStockLevel: product.minimumStockLevel,
          updatedBy: performedBy,
          timestamp: new Date().toISOString(),
        });
      } catch (socketError) {
        logger.error("Failed to emit low stock alert", {
          error: socketError.message,
          productId: product._id,
        });
        // Don't throw - socket failure shouldn't break inventory update
      }
    }

    // Emit inventory update event via Socket.io
    try {
      const io = getSocket();
      io.emit("inventoryUpdated", {
        productId: product._id.toString(),
        SKU: product.SKU,
        name: product.name,
        previousQuantity,
        newQuantity,
        adjustmentType,
        updatedBy: performedBy,
        timestamp: new Date().toISOString(),
      });
    } catch (socketError) {
      logger.error("Failed to emit inventory update", {
        error: socketError.message,
        productId: product._id,
      });
      // Don't throw - socket failure shouldn't break inventory update
    }

    logger.info("Stock adjusted", {
      productId: product._id,
      SKU: product.SKU,
      adjustmentType,
      quantity,
      previousQuantity,
      newQuantity,
      performedBy: performedBy,
    });

    return {
      product: product.toJSON(),
      inventoryLog: inventoryLog.toJSON(),
    };
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();

    if (error instanceof ApiError) {
      throw error;
    }

    logger.error("Stock adjustment failed", {
      error: error.message,
      productId,
      adjustmentType,
      quantity,
      performedBy,
    });

    throw new ApiError(500, "Failed to adjust stock");
  } finally {
    session.endSession();
  }
};

/**
 * Get inventory logs with filtering and pagination
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated inventory logs
 */
export const getInventoryLogs = async (queryParams) => {
  const {
    page = 1,
    limit = 20,
    productId,
    action,
    startDate,
    endDate,
  } = queryParams;

  // Build query
  const query = {};

  if (productId) {
    query.productId = new mongoose.Types.ObjectId(productId);
  }

  if (action) {
    query.action = action;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) {
      query.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      query.timestamp.$lte = new Date(endDate);
    }
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query
  const [logs, totalLogs] = await Promise.all([
    InventoryLog.find(query)
      .populate("productId", "name SKU")
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InventoryLog.countDocuments(query),
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

/**
 * Get inventory logs for a specific product
 * @param {string} productId - Product ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated inventory logs
 */
export const getProductInventoryLogs = async (productId, queryParams) => {
  // Verify product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const { page = 1, limit = 20 } = queryParams;
  const skip = (page - 1) * limit;

  const [logs, totalLogs] = await Promise.all([
    InventoryLog.find({ productId })
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InventoryLog.countDocuments({ productId }),
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
