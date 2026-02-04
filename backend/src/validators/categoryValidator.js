import Joi from "joi";

/**
 * Category Validators
 * Joi validation schemas for category management endpoints
 */

/**
 * Create category validation schema
 */
export const createCategoryValidator = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.empty": "Category name is required",
      "string.min": "Category name must be at least 2 characters",
      "string.max": "Category name cannot exceed 100 characters",
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description cannot exceed 500 characters",
    }),

  parentCategory: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Parent category must be a valid MongoDB ObjectId",
      "string.length": "Parent category must be a valid MongoDB ObjectId",
    }),
});

/**
 * Update category validation schema
 */
export const updateCategoryValidator = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      "string.min": "Category name must be at least 2 characters",
      "string.max": "Category name cannot exceed 100 characters",
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description cannot exceed 500 characters",
    }),

  parentCategory: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Parent category must be a valid MongoDB ObjectId",
      "string.length": "Parent category must be a valid MongoDB ObjectId",
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

  parentCategory: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Parent category must be a valid MongoDB ObjectId",
      "string.length": "Parent category must be a valid MongoDB ObjectId",
    }),

  sortBy: Joi.string()
    .valid("name", "createdAt", "updatedAt")
    .default("name")
    .messages({
      "any.only": "sortBy must be one of: name, createdAt, updatedAt",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("asc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create category data
 * @param {Object} data - Category creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateCategory = (data) => {
  const { error, value } = createCategoryValidator.validate(data, {
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
 * Validate update category data
 * @param {Object} data - Category update data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUpdateCategory = (data) => {
  const { error, value } = updateCategoryValidator.validate(data, {
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
