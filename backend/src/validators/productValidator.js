import Joi from "joi";

/**
 * Product Validators
 * Joi validation schemas for product management endpoints
 */

/**
 * Create product validation schema
 */
export const createProductValidator = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      "string.empty": "Product name is required",
      "string.min": "Product name must be at least 2 characters",
      "string.max": "Product name cannot exceed 200 characters",
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),

  SKU: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9-_]+$/)
    .required()
    .messages({
      "string.empty": "SKU is required",
      "string.pattern.base":
        "SKU must contain only uppercase letters, numbers, hyphens, and underscores",
    }),

  category: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Category must be a valid MongoDB ObjectId",
      "string.length": "Category must be a valid MongoDB ObjectId",
    }),

  quantity: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      "number.base": "Quantity must be a number",
      "number.min": "Quantity cannot be negative",
      "number.integer": "Quantity must be an integer",
    }),

  minimumStockLevel: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      "number.base": "Minimum stock level must be a number",
      "number.min": "Minimum stock level cannot be negative",
      "number.integer": "Minimum stock level must be an integer",
    }),

  unitPrice: Joi.number()
    .min(0)
    .required()
    .messages({
      "number.base": "Unit price must be a number",
      "number.min": "Unit price cannot be negative",
      "any.required": "Unit price is required",
    }),

  supplier: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Supplier must be a valid MongoDB ObjectId",
      "string.length": "Supplier must be a valid MongoDB ObjectId",
    }),

  storageLocation: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Storage location must be a valid MongoDB ObjectId",
      "string.length": "Storage location must be a valid MongoDB ObjectId",
    }),
});

/**
 * Update product validation schema
 */
export const updateProductValidator = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .optional()
    .messages({
      "string.min": "Product name must be at least 2 characters",
      "string.max": "Product name cannot exceed 200 characters",
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),

  SKU: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9-_]+$/)
    .optional()
    .messages({
      "string.pattern.base":
        "SKU must contain only uppercase letters, numbers, hyphens, and underscores",
    }),

  category: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Category must be a valid MongoDB ObjectId",
      "string.length": "Category must be a valid MongoDB ObjectId",
    }),

  minimumStockLevel: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      "number.base": "Minimum stock level must be a number",
      "number.min": "Minimum stock level cannot be negative",
      "number.integer": "Minimum stock level must be an integer",
    }),

  unitPrice: Joi.number()
    .min(0)
    .optional()
    .messages({
      "number.base": "Unit price must be a number",
      "number.min": "Unit price cannot be negative",
    }),

  supplier: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Supplier must be a valid MongoDB ObjectId",
      "string.length": "Supplier must be a valid MongoDB ObjectId",
    }),

  storageLocation: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Storage location must be a valid MongoDB ObjectId",
      "string.length": "Storage location must be a valid MongoDB ObjectId",
    }),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
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

  category: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow("")
    .messages({
      "string.hex": "Category must be a valid MongoDB ObjectId",
      "string.length": "Category must be a valid MongoDB ObjectId",
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

  lowStockOnly: Joi.boolean()
    .optional()
    .messages({
      "boolean.base": "lowStockOnly must be a boolean",
    }),

  sortBy: Joi.string()
    .valid("name", "SKU", "quantity", "unitPrice", "createdAt", "updatedAt")
    .default("createdAt")
    .messages({
      "any.only": "sortBy must be one of: name, SKU, quantity, unitPrice, createdAt, updatedAt",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("desc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create product data
 * @param {Object} data - Product creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateProduct = (data) => {
  const { error, value } = createProductValidator.validate(data, {
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
 * Validate update product data
 * @param {Object} data - Product update data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUpdateProduct = (data) => {
  const { error, value } = updateProductValidator.validate(data, {
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
