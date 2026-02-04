import express from "express";
import {
  adjustStockHandler,
  getInventoryLogsHandler,
  getProductInventoryLogsHandler,
} from "../controllers/inventoryController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Inventory Management Routes
 * All inventory management endpoints
 */

const router = express.Router();

// All routes require authentication and Admin/Manager role
router.use(authenticate);
router.use(authorizeRoles(userRoles.ADMIN, userRoles.MANAGER));

/**
 * @route   PATCH /api/inventory/adjust
 * @desc    Adjust stock quantity
 * @access  Private (Admin, Manager)
 */
router.patch("/adjust", adjustStockHandler);

/**
 * @route   GET /api/inventory/logs
 * @desc    Get inventory logs with filtering
 * @access  Private (Admin, Manager)
 */
router.get("/logs", getInventoryLogsHandler);

/**
 * @route   GET /api/inventory/logs/:productId
 * @desc    Get inventory logs for a specific product
 * @access  Private (Admin, Manager)
 */
router.get("/logs/:productId", getProductInventoryLogsHandler);

export default router;
