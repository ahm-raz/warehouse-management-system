import express from "express";
import {
  getInventorySummaryHandler,
  getLowStockReportHandler,
  getOrderStatisticsHandler,
  getSupplierPerformanceHandler,
  getTaskProductivityHandler,
} from "../controllers/reportController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Report Management Routes
 * All reporting endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require Admin or Manager role
router.use(authorizeRoles(userRoles.ADMIN, userRoles.MANAGER));

/**
 * @route   GET /api/reports/inventory-summary
 * @desc    Generate inventory summary report
 * @access  Private (Admin, Manager)
 */
router.get("/inventory-summary", getInventorySummaryHandler);

/**
 * @route   GET /api/reports/low-stock
 * @desc    Generate low stock report
 * @access  Private (Admin, Manager)
 */
router.get("/low-stock", getLowStockReportHandler);

/**
 * @route   GET /api/reports/order-statistics
 * @desc    Generate order statistics report
 * @access  Private (Admin, Manager)
 */
router.get("/order-statistics", getOrderStatisticsHandler);

/**
 * @route   GET /api/reports/supplier-performance
 * @desc    Generate supplier performance report
 * @access  Private (Admin, Manager)
 */
router.get("/supplier-performance", getSupplierPerformanceHandler);

/**
 * @route   GET /api/reports/task-productivity
 * @desc    Generate task productivity report
 * @access  Private (Admin, Manager)
 */
router.get("/task-productivity", getTaskProductivityHandler);

export default router;
