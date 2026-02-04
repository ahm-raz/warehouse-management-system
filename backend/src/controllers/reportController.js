import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  generateInventorySummary,
  generateLowStockReport,
  generateOrderStatistics,
  generateSupplierPerformance,
  generateTaskProductivity,
  emitReportGenerated,
} from "../services/reportService.js";
import { validateReportQuery } from "../validators/reportValidator.js";
import logger from "../logs/logger.js";

/**
 * Report Management Controller
 * Handles HTTP requests and responses for reporting endpoints
 */

/**
 * @route   GET /api/reports/inventory-summary
 * @desc    Generate inventory summary report
 * @access  Private (Admin, Manager)
 */
export const getInventorySummaryHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate query parameters
  const validatedQuery = validateReportQuery(req.query);

  // Generate report
  const report = await generateInventorySummary(validatedQuery);

  // Emit socket event (optional)
  emitReportGenerated("inventory-summary", performedBy);

  res.status(200).json({
    success: true,
    message: "Inventory summary report generated successfully",
    data: { report },
  });
});

/**
 * @route   GET /api/reports/low-stock
 * @desc    Generate low stock report
 * @access  Private (Admin, Manager)
 */
export const getLowStockReportHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate query parameters
  const validatedQuery = validateReportQuery(req.query);

  // Generate report
  const report = await generateLowStockReport(validatedQuery);

  // Emit socket event (optional)
  emitReportGenerated("low-stock", performedBy);

  res.status(200).json({
    success: true,
    message: "Low stock report generated successfully",
    data: { report },
  });
});

/**
 * @route   GET /api/reports/order-statistics
 * @desc    Generate order statistics report
 * @access  Private (Admin, Manager)
 */
export const getOrderStatisticsHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate query parameters
  const validatedQuery = validateReportQuery(req.query);

  // Generate report
  const report = await generateOrderStatistics(validatedQuery);

  // Emit socket event (optional)
  emitReportGenerated("order-statistics", performedBy);

  res.status(200).json({
    success: true,
    message: "Order statistics report generated successfully",
    data: { report },
  });
});

/**
 * @route   GET /api/reports/supplier-performance
 * @desc    Generate supplier performance report
 * @access  Private (Admin, Manager)
 */
export const getSupplierPerformanceHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate query parameters
  const validatedQuery = validateReportQuery(req.query);

  // Generate report
  const report = await generateSupplierPerformance(validatedQuery);

  // Emit socket event (optional)
  emitReportGenerated("supplier-performance", performedBy);

  res.status(200).json({
    success: true,
    message: "Supplier performance report generated successfully",
    data: { report },
  });
});

/**
 * @route   GET /api/reports/task-productivity
 * @desc    Generate task productivity report
 * @access  Private (Admin, Manager)
 */
export const getTaskProductivityHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate query parameters
  const validatedQuery = validateReportQuery(req.query);

  // Generate report
  const report = await generateTaskProductivity(validatedQuery);

  // Emit socket event (optional)
  emitReportGenerated("task-productivity", performedBy);

  res.status(200).json({
    success: true,
    message: "Task productivity report generated successfully",
    data: { report },
  });
});
