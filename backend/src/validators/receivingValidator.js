import Joi from "joi";
import { receivingStatus } from "../models/Receiving.js";

/**
 * Receiving Validators
 * Joi validation schemas for receiving management endpoints
 */

/**
 * Received item validation schema
 */
const receivedItemSchema = Joi.object({
  product: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "Product ID is required",
      "string.hex": "Product ID must be a valid MongoDB ObjectId",
      "string.length": "Product ID must be a valid MongoDB ObjectId",
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

  unitCost: Joi.number()
    .min(0)
    .required()
    .messages({
      "number.base": "Unit cost must be a number",
      "number.min": "Unit cost cannot be negative",
      "any.required": "Unit cost is required",
    }),
});

/**
 * Create receiving validation schema
 */
export const createReceivingValidator = Joi.object({
  supplier: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "Supplier ID is required",
      "string.hex": "Supplier ID must be a valid MongoDB ObjectId",
      "string.length": "Supplier ID must be a valid MongoDB ObjectId",
    }),

  receivedItems: Joi.array()
    .items(receivedItemSchema)
    .min(1)
    .required()
    .messages({
      "array.min": "Receiving must have at least one item",
      "any.required": "Received items are required",
    })
    .custom((items, helpers) => {
      // Check for duplicate products
      const productIds = items.map((item) => item.product);
      const uniqueProductIds = new Set(productIds);

      if (productIds.length !== uniqueProductIds.size) {
        return helpers.error("array.unique", { message: "Duplicate products are not allowed" });
      }

      return items;
    }, "Duplicate products validation"),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow("")
    .messages({
      "string.max": "Notes cannot exceed 1000 characters",
    }),
});

/**
 * Update receiving status validation schema
 */
export const updateReceivingStatusValidator = Joi.object({
  status: Joi.string()
    .valid(...Object.values(receivingStatus))
    .required()
    .messages({
      "string.empty": "Status is required",
      "any.only": `Status must be one of: ${Object.values(receivingStatus).join(", ")}`,
    }),
});

/**
 * Pagination query validation schema
 */
export const paginationQueryValidator = Joi.object({
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
    .default(10)
    .messages({
      "number.base": "Limit must be a number",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow("")
    .messages({
      "string.max": "Search query cannot exceed 100 characters",
    }),

  supplier: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow("")
    .messages({
      "string.hex": "Supplier must be a valid MongoDB ObjectId",
      "string.length": "Supplier must be a valid MongoDB ObjectId",
    }),

  status: Joi.string()
    .valid(...Object.values(receivingStatus))
    .optional()
    .messages({
      "any.only": `Status must be one of: ${Object.values(receivingStatus).join(", ")}`,
    }),

  receivedBy: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow("")
    .messages({
      "string.hex": "Received by must be a valid MongoDB ObjectId",
      "string.length": "Received by must be a valid MongoDB ObjectId",
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

  sortBy: Joi.string()
    .valid("receivingNumber", "supplier", "status", "totalQuantity", "createdAt", "updatedAt")
    .default("createdAt")
    .messages({
      "any.only": "sortBy must be one of: receivingNumber, supplier, status, totalQuantity, createdAt, updatedAt",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("desc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create receiving data
 * @param {Object} data - Receiving creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateReceiving = (data) => {
  const { error, value } = createReceivingValidator.validate(data, {
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
 * Validate update receiving status data
 * @param {Object} data - Status update data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUpdateReceivingStatus = (data) => {
  const { error, value } = updateReceivingStatusValidator.validate(data, {
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
 * Validate pagination query parameters
 * @param {Object} data - Query parameters
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validatePaginationQuery = (data) => {
  const { error, value } = paginationQueryValidator.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    throw new Error(errors.join(", "));
  }

  return value;
};
