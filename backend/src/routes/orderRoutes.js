import express from "express";
import {
  createOrderHandler,
  getOrdersHandler,
  getOrderByIdHandler,
  updateOrderStatusHandler,
  assignStaffHandler,
  deleteOrderHandler,
  getOrderActivityLogsHandler,
} from "../controllers/orderController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Order Management Routes
 * All order management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private (Admin, Manager, Staff)
 */
router.post("/", createOrderHandler);

/**
 * @route   GET /api/orders
 * @desc    Get all orders with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get("/", getOrdersHandler);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private (All authenticated users)
 */
router.get("/:id", getOrderByIdHandler);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin, Manager, Staff - for assigned orders)
 */
router.patch("/:id/status", updateOrderStatusHandler);

/**
 * @route   PATCH /api/orders/:id/assign-staff
 * @desc    Assign staff to order
 * @access  Private (Admin, Manager)
 */
router.patch(
  "/:id/assign-staff",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  assignStaffHandler
);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Soft delete order
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteOrderHandler
);

/**
 * @route   GET /api/orders/:id/activity
 * @desc    Get order activity logs
 * @access  Private (All authenticated users)
 */
router.get("/:id/activity", getOrderActivityLogsHandler);

export default router;
