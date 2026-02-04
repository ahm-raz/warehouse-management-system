import mongoose from "mongoose";
import Order, { orderStatus } from "../models/Order.js";
import OrderActivityLog, { actionTypes } from "../models/OrderActivityLog.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import InventoryLog, { actionTypes as inventoryActionTypes } from "../models/InventoryLog.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import { getSocket } from "../config/socket.js";

/**
 * Order Management Service
 * Business logic for order operations
 * Handles CRUD operations, status workflow, inventory deduction, and activity logging
 */

/**
 * Create activity log entry
 * @param {Object} logData - Activity log data
 * @returns {Promise<Object>} - Created log entry
 */
const createActivityLog = async (logData) => {
  try {
    const log = new OrderActivityLog(logData);
    await log.save();
    return log;
  } catch (error) {
    logger.error("Failed to create order activity log", {
      error: error.message,
      logData: logData,
    });
    // Don't throw error - logging failure shouldn't break order operations
  }
};

/**
 * Create a new order
 * Validates stock availability but does NOT deduct inventory
 * @param {Object} orderData - Order creation data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Created order
 */
export const createOrder = async (orderData, performedBy) => {
  const { customerName, items } = orderData;

  // Validate products exist and get current prices
  const productIds = items.map((item) => item.product);
  const products = await Product.find({
    _id: { $in: productIds },
    isDeleted: false,
  }).lean();

  if (products.length !== productIds.length) {
    throw new ApiError(404, "One or more products not found or have been deleted");
  }

  // Create product map for quick lookup
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // Validate stock availability and prepare order items with price snapshots
  const orderItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = productMap.get(item.product.toString());

    if (!product) {
      throw new ApiError(404, `Product ${item.product} not found`);
    }

    // Check stock availability
    if (product.quantity < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for product ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
      );
    }

    // Capture price snapshot
    const unitPrice = product.unitPrice;
    const subtotal = unitPrice * item.quantity;
    totalAmount += subtotal;

    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      unitPrice: unitPrice,
      subtotal: subtotal,
    });
  }

  // Generate unique order number
  const orderNumber = await Order.generateOrderNumber();

  // Create new order
  const order = new Order({
    orderNumber,
    customerName: customerName.trim(),
    items: orderItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    orderStatus: orderStatus.PENDING,
  });

  await order.save();

  // Log activity
  await createActivityLog({
    orderId: order._id,
    performedBy: performedBy,
    actionType: actionTypes.ORDER_CREATED,
    newValues: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      orderStatus: order.orderStatus,
      itemCount: order.items.length,
    },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("orderCreated", {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.orderStatus,
      totalAmount: order.totalAmount,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit order created event", {
      error: socketError.message,
      orderId: order._id,
    });
  }

  logger.info("Order created", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    performedBy: performedBy,
  });

  // Populate product details for response
  const populatedOrder = await Order.findById(order._id)
    .populate("items.product", "name SKU")
    .lean();

  return populatedOrder;
};

/**
 * Get all orders with pagination and filtering
 * @param {Object} queryParams - Query parameters
 * @param {string} userId - Current user ID (for staff filtering)
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} - Paginated orders
 */
export const getOrders = async (queryParams, userId, userRole) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    orderStatus: statusFilter,
    assignedStaff,
    startDate,
    endDate,
    sortBy = "createdAt",
    order = "desc",
  } = queryParams;

  // Build query
  const query = { isDeleted: false };

  // Staff can only see their assigned orders
  if (userRole === "Staff") {
    query.assignedStaff = userId;
  }

  // Search filter (orderNumber or customerName)
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
    ];
  }

  // Status filter
  if (statusFilter) {
    query.orderStatus = statusFilter;
  }

  // Assigned staff filter (Admin/Manager only)
  if (assignedStaff && (userRole === "Admin" || userRole === "Manager")) {
    query.assignedStaff = new mongoose.Types.ObjectId(assignedStaff);
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
  const [orders, totalOrders] = await Promise.all([
    Order.find(query)
      .populate("items.product", "name SKU")
      .populate("assignedStaff", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalOrders / limit);

  return {
    orders,
    pagination: {
      totalOrders,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} - Order object
 */
export const getOrderById = async (orderId, userId, userRole) => {
  const query = {
    _id: orderId,
    isDeleted: false,
  };

  // Staff can only access their assigned orders
  if (userRole === "Staff") {
    query.assignedStaff = userId;
  }

  const order = await Order.findOne(query)
    .populate("items.product", "name SKU description")
    .populate("assignedStaff", "name email role")
    .lean();

  if (!order) {
    throw new ApiError(404, "Order not found or access denied");
  }

  return order;
};

/**
 * Assign staff to order
 * @param {string} orderId - Order ID
 * @param {string} staffId - Staff user ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Updated order
 */
export const assignStaff = async (orderId, staffId, performedBy) => {
  const order = await Order.findOne({
    _id: orderId,
    isDeleted: false,
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Verify staff exists and is active
  const staff = await User.findOne({
    _id: staffId,
    isDeleted: false,
    isActive: true,
  });

  if (!staff) {
    throw new ApiError(404, "Staff member not found or inactive");
  }

  const oldStaffId = order.assignedStaff?.toString();
  order.assignedStaff = staffId;
  await order.save();

  // Log activity
  await createActivityLog({
    orderId: order._id,
    performedBy: performedBy,
    actionType: actionTypes.STAFF_ASSIGNED,
    oldValues: { assignedStaff: oldStaffId || null },
    newValues: { assignedStaff: staffId },
    timestamp: new Date(),
  });

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("orderStaffAssigned", {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      staffId: staffId,
      staffName: staff.name,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit order staff assigned event", {
      error: socketError.message,
      orderId: order._id,
    });
  }

  logger.info("Staff assigned to order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    staffId: staffId,
    performedBy: performedBy,
  });

  const populatedOrder = await Order.findById(order._id)
    .populate("items.product", "name SKU")
    .populate("assignedStaff", "name email")
    .lean();

  return populatedOrder;
};

/**
 * Update order status
 * Handles workflow validation and inventory deduction for Shipped status
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New order status
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Updated order
 */
export const updateOrderStatus = async (orderId, newStatus, performedBy) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({
      _id: orderId,
      isDeleted: false,
    }).session(session);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    const oldStatus = order.orderStatus;

    // Validate status transition
    if (!order.canTransitionTo(newStatus)) {
      throw new ApiError(
        400,
        `Invalid status transition from ${oldStatus} to ${newStatus}`
      );
    }

    // Handle cancellation
    if (newStatus === orderStatus.CANCELLED) {
      if (!order.canBeCancelled()) {
        throw new ApiError(
          400,
          `Order cannot be cancelled from ${oldStatus} status. Only Pending or Picking orders can be cancelled.`
        );
      }

      order.orderStatus = newStatus;
      await order.save({ session });

      // Log cancellation
      await createActivityLog({
        orderId: order._id,
        performedBy: performedBy,
        actionType: actionTypes.ORDER_CANCELLED,
        oldValues: { orderStatus: oldStatus },
        newValues: { orderStatus: newStatus },
        timestamp: new Date(),
      });

      await session.commitTransaction();

      // Emit Socket.io event
      try {
        const io = getSocket();
        io.emit("orderCancelled", {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          oldStatus: oldStatus,
          updatedBy: performedBy,
          timestamp: new Date().toISOString(),
        });
      } catch (socketError) {
        logger.error("Failed to emit order cancelled event", {
          error: socketError.message,
          orderId: order._id,
        });
      }

      logger.info("Order cancelled", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        oldStatus: oldStatus,
        performedBy: performedBy,
      });

      const populatedOrder = await Order.findById(order._id)
        .populate("items.product", "name SKU")
        .populate("assignedStaff", "name email")
        .lean();

      return populatedOrder;
    }

    // Handle shipment - deduct inventory
    if (newStatus === orderStatus.SHIPPED) {
      // Deduct inventory for each product using transaction
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);

        if (!product || product.isDeleted) {
          throw new ApiError(404, `Product ${item.product} not found or deleted`);
        }

        // Verify stock is still available
        if (product.quantity < item.quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for product ${product.name}. Available: ${product.quantity}, Required: ${item.quantity}`
          );
        }

        // Deduct inventory
        const previousQuantity = product.quantity;
        product.quantity -= item.quantity;
        await product.save({ session });

        // Create inventory log entry
        const inventoryLog = new InventoryLog({
          productId: product._id,
          action: inventoryActionTypes.REMOVE,
          quantityChanged: -item.quantity,
          previousQuantity: previousQuantity,
          newQuantity: product.quantity,
          performedBy: performedBy,
          note: `Order ${order.orderNumber} shipped`,
        });

        await inventoryLog.save({ session });

        logger.info("Inventory deducted for order shipment", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: product._id,
          quantity: item.quantity,
          previousQuantity: previousQuantity,
          newQuantity: product.quantity,
        });
      }
    }

    // Update order status
    order.orderStatus = newStatus;
    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Log activity
    await createActivityLog({
      orderId: order._id,
      performedBy: performedBy,
      actionType: actionTypes.STATUS_UPDATED,
      oldValues: { orderStatus: oldStatus },
      newValues: { orderStatus: newStatus },
      timestamp: new Date(),
    });

    // Emit Socket.io event
    try {
      const io = getSocket();
      io.emit("orderStatusUpdated", {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        oldStatus: oldStatus,
        newStatus: newStatus,
        updatedBy: performedBy,
        timestamp: new Date().toISOString(),
      });
    } catch (socketError) {
      logger.error("Failed to emit order status updated event", {
        error: socketError.message,
        orderId: order._id,
      });
    }

    logger.info("Order status updated", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      oldStatus: oldStatus,
      newStatus: newStatus,
      performedBy: performedBy,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("items.product", "name SKU")
      .populate("assignedStaff", "name email")
      .lean();

    return populatedOrder;
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();

    if (error instanceof ApiError) {
      throw error;
    }

    logger.error("Order status update failed", {
      error: error.message,
      orderId: orderId,
      newStatus: newStatus,
      performedBy: performedBy,
    });

    throw new ApiError(500, "Failed to update order status");
  } finally {
    session.endSession();
  }
};

/**
 * Soft delete order
 * @param {string} orderId - Order ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Deleted order
 */
export const deleteOrder = async (orderId, performedBy) => {
  const order = await Order.findOne({
    _id: orderId,
    isDeleted: false,
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Prevent deletion of shipped or delivered orders
  if (
    order.orderStatus === orderStatus.SHIPPED ||
    order.orderStatus === orderStatus.DELIVERED
  ) {
    throw new ApiError(
      400,
      `Cannot delete order with status ${order.orderStatus}. Only orders in Pending, Picking, Packed, or Cancelled status can be deleted.`
    );
  }

  // Store old values for logging
  const oldValues = {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    orderStatus: order.orderStatus,
    totalAmount: order.totalAmount,
  };

  // Soft delete
  await order.softDelete();

  // Log activity
  await createActivityLog({
    orderId: order._id,
    performedBy: performedBy,
    actionType: actionTypes.ORDER_DELETED,
    oldValues: oldValues,
    newValues: {
      isDeleted: true,
      deletedAt: order.deletedAt,
    },
    timestamp: new Date(),
  });

  logger.info("Order deleted (soft delete)", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    performedBy: performedBy,
  });

  return order.toJSON();
};

/**
 * Get order activity logs
 * @param {string} orderId - Order ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated activity logs
 */
export const getOrderActivityLogs = async (orderId, queryParams) => {
  // Verify order exists
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const { page = 1, limit = 20 } = queryParams;
  const skip = (page - 1) * limit;

  const [logs, totalLogs] = await Promise.all([
    OrderActivityLog.find({ orderId })
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OrderActivityLog.countDocuments({ orderId }),
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
