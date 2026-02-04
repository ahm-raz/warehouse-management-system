import Joi from "joi";
import { orderStatus } from "../models/Order.js";

/**
 * Order Validators
 * Joi validation schemas for order management endpoints
 */

/**
 * Order item validation schema
 */
const orderItemSchema = Joi.object({
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
});

/**
 * Create order validation schema
 */
export const createOrderValidator = Joi.object({
  customerName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      "string.empty": "Customer name is required",
      "string.min": "Customer name must be at least 2 characters",
      "string.max": "Customer name cannot exceed 200 characters",
    }),

  items: Joi.array()
    .items(orderItemSchema)
    .min(1)
    .required()
    .messages({
      "array.min": "Order must have at least one item",
      "any.required": "Order items are required",
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
});

/**
 * Update order status validation schema
 */
export const updateStatusValidator = Joi.object({
  status: Joi.string()
    .valid(...Object.values(orderStatus))
    .required()
    .messages({
      "string.empty": "Status is required",
      "any.only": `Status must be one of: ${Object.values(orderStatus).join(", ")}`,
    }),
});

/**
 * Assign staff validation schema
 */
export const assignStaffValidator = Joi.object({
  staffId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "Staff ID is required",
      "string.hex": "Staff ID must be a valid MongoDB ObjectId",
      "string.length": "Staff ID must be a valid MongoDB ObjectId",
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

  orderStatus: Joi.string()
    .valid(...Object.values(orderStatus))
    .optional()
    .messages({
      "any.only": `Order status must be one of: ${Object.values(orderStatus).join(", ")}`,
    }),

  assignedStaff: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow("")
    .messages({
      "string.hex": "Assigned staff must be a valid MongoDB ObjectId",
      "string.length": "Assigned staff must be a valid MongoDB ObjectId",
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
    .valid("orderNumber", "customerName", "orderStatus", "totalAmount", "createdAt", "updatedAt")
    .default("createdAt")
    .messages({
      "any.only": "sortBy must be one of: orderNumber, customerName, orderStatus, totalAmount, createdAt, updatedAt",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("desc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create order data
 * @param {Object} data - Order creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateOrder = (data) => {
  const { error, value } = createOrderValidator.validate(data, {
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
 * Validate update status data
 * @param {Object} data - Status update data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUpdateStatus = (data) => {
  const { error, value } = updateStatusValidator.validate(data, {
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
 * Validate assign staff data
 * @param {Object} data - Staff assignment data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateAssignStaff = (data) => {
  const { error, value } = assignStaffValidator.validate(data, {
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
