import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  createOrder,
  getOrders,
  getOrderById,
  assignStaff,
  updateOrderStatus,
  deleteOrder,
  getOrderActivityLogs,
} from "../services/orderService.js";
import {
  validateCreateOrder,
  validateUpdateStatus,
  validateAssignStaff,
  validatePaginationQuery,
} from "../validators/orderValidator.js";
import logger from "../logs/logger.js";

/**
 * Order Management Controller
 * Handles HTTP requests and responses for order management endpoints
 */

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private (Admin, Manager, Staff)
 */
export const createOrderHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateCreateOrder(req.body);

  // Create order
  const order = await createOrder(validatedData, performedBy);

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: { order },
  });
});

/**
 * @route   GET /api/orders
 * @desc    Get all orders with pagination and filtering
 * @access  Private (All authenticated users)
 */
export const getOrdersHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get orders
  const result = await getOrders(validatedQuery, userId, userRole);

  res.status(200).json({
    success: true,
    message: "Orders retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private (All authenticated users)
 */
export const getOrderByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!id) {
    throw new ApiError(400, "Order ID is required");
  }

  // Get order
  const order = await getOrderById(id, userId, userRole);

  res.status(200).json({
    success: true,
    message: "Order retrieved successfully",
    data: { order },
  });
});

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin, Manager, Staff - for assigned orders)
 */
export const updateOrderStatusHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;
  const userRole = req.user?.role;

  if (!id) {
    throw new ApiError(400, "Order ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateUpdateStatus(req.body);

  // Check authorization for Staff
  if (userRole === "Staff") {
    const order = await getOrderById(id, performedBy, userRole);
    if (order.assignedStaff?.toString() !== performedBy) {
      throw new ApiError(403, "You can only update orders assigned to you");
    }
  }

  // Update order status
  const order = await updateOrderStatus(id, validatedData.status, performedBy);

  res.status(200).json({
    success: true,
    message: `Order status updated to ${validatedData.status}`,
    data: { order },
  });
});

/**
 * @route   PATCH /api/orders/:id/assign-staff
 * @desc    Assign staff to order
 * @access  Private (Admin, Manager)
 */
export const assignStaffHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Order ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateAssignStaff(req.body);

  // Assign staff
  const order = await assignStaff(id, validatedData.staffId, performedBy);

  res.status(200).json({
    success: true,
    message: "Staff assigned to order successfully",
    data: { order },
  });
});

/**
 * @route   DELETE /api/orders/:id
 * @desc    Soft delete order
 * @access  Private (Admin, Manager)
 */
export const deleteOrderHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performedBy = req.user?.userId;

  if (!id) {
    throw new ApiError(400, "Order ID is required");
  }

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Delete order (soft delete)
  const order = await deleteOrder(id, performedBy);

  res.status(200).json({
    success: true,
    message: "Order deleted successfully",
    data: { order },
  });
});

/**
 * @route   GET /api/orders/:id/activity
 * @desc    Get order activity logs
 * @access  Private (All authenticated users)
 */
export const getOrderActivityLogsHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!id) {
    throw new ApiError(400, "Order ID is required");
  }

  // Verify order access
  await getOrderById(id, userId, userRole);

  // Validate query parameters
  const validatedQuery = validatePaginationQuery(req.query);

  // Get activity logs
  const result = await getOrderActivityLogs(id, validatedQuery);

  res.status(200).json({
    success: true,
    message: "Order activity logs retrieved successfully",
    data: result,
  });
});
