import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  adjustStock,
  getInventoryLogs,
  getProductInventoryLogs,
} from "../services/inventoryService.js";
import {
  validateStockAdjustment,
  validateInventoryLogQuery,
} from "../validators/inventoryValidator.js";
import logger from "../logs/logger.js";

/**
 * Inventory Management Controller
 * Handles HTTP requests and responses for inventory operations
 */

/**
 * @route   PATCH /api/inventory/adjust
 * @desc    Adjust stock quantity
 * @access  Private (Admin, Manager)
 */
export const adjustStockHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate request body
  const validatedData = validateStockAdjustment(req.body);

  const { productId, adjustmentType, quantity, note } = validatedData;

  // Adjust stock
  const result = await adjustStock(
    productId,
    adjustmentType,
    quantity,
    performedBy,
    note
  );

  res.status(200).json({
    success: true,
    message: `Stock ${adjustmentType === "ADD" ? "added" : "removed"} successfully`,
    data: result,
  });
});

/**
 * @route   GET /api/inventory/logs
 * @desc    Get inventory logs with filtering
 * @access  Private (Admin, Manager)
 */
export const getInventoryLogsHandler = asyncHandler(async (req, res) => {
  // Validate query parameters
  const validatedQuery = validateInventoryLogQuery(req.query);

  // Get inventory logs
  const result = await getInventoryLogs(validatedQuery);

  res.status(200).json({
    success: true,
    message: "Inventory logs retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/inventory/logs/:productId
 * @desc    Get inventory logs for a specific product
 * @access  Private (Admin, Manager)
 */
export const getProductInventoryLogsHandler = asyncHandler(
  async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
      throw new ApiError(400, "Product ID is required");
    }

    // Validate query parameters
    const validatedQuery = validateInventoryLogQuery(req.query);

    // Get product inventory logs
    const result = await getProductInventoryLogs(productId, validatedQuery);

    res.status(200).json({
      success: true,
      message: "Product inventory logs retrieved successfully",
      data: result,
    });
  }
);
