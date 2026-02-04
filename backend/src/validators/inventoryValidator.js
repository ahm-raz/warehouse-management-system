import Joi from "joi";
import { actionTypes } from "../models/InventoryLog.js";

/**
 * Inventory Validators
 * Joi validation schemas for inventory management endpoints
 */

/**
 * Stock adjustment validation schema
 */
export const stockAdjustmentValidator = Joi.object({
  productId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "Product ID is required",
      "string.hex": "Product ID must be a valid MongoDB ObjectId",
      "string.length": "Product ID must be a valid MongoDB ObjectId",
    }),

  adjustmentType: Joi.string()
    .valid(actionTypes.ADD, actionTypes.REMOVE)
    .required()
    .messages({
      "string.empty": "Adjustment type is required",
      "any.only": "Adjustment type must be ADD or REMOVE",
    }),

  quantity: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      "number.base": "Quantity must be a number",
      "number.integer": "Quantity must be an integer",
      "number.min": "Quantity must be at least 1",
      "any.required": "Quantity is required",
    }),

  note: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Note cannot exceed 500 characters",
    }),
});

/**
 * Inventory log query validation schema
 */
export const inventoryLogQueryValidator = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      "number.base": "Page must be a number",
      "number.min": "Page must be at least 1",
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      "number.base": "Limit must be a number",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),

  productId: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow("")
    .messages({
      "string.hex": "Product ID must be a valid MongoDB ObjectId",
      "string.length": "Product ID must be a valid MongoDB ObjectId",
    }),

  action: Joi.string()
    .valid(...Object.values(actionTypes))
    .optional()
    .messages({
      "any.only": `Action must be one of: ${Object.values(actionTypes).join(", ")}`,
    }),

  startDate: Joi.date()
    .optional()
    .messages({
      "date.base": "Start date must be a valid date",
    }),

  endDate: Joi.date()
    .min(Joi.ref("startDate"))
    .optional()
    .messages({
      "date.base": "End date must be a valid date",
      "date.min": "End date must be after start date",
    }),
});

/**
 * Validate stock adjustment data
 * @param {Object} data - Stock adjustment data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateStockAdjustment = (data) => {
  const { error, value } = stockAdjustmentValidator.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    throw new Error(errors.join(", "));
  }

  return value;
};

/**
 * Validate inventory log query parameters
 * @param {Object} data - Query parameters
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateInventoryLogQuery = (data) => {
  const { error, value } = inventoryLogQueryValidator.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    throw new Error(errors.join(", "));
  }

  return value;
};
