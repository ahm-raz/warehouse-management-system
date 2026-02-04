import Joi from "joi";

/**
 * Location Validators
 * Joi validation schemas for location management endpoints
 */

/**
 * Create location validation schema
 */
export const createLocationValidator = Joi.object({
  zone: Joi.string()
    .trim()
    .max(50)
    .required()
    .messages({
      "string.empty": "Zone is required",
      "string.max": "Zone cannot exceed 50 characters",
    }),

  rack: Joi.string()
    .trim()
    .max(50)
    .required()
    .messages({
      "string.empty": "Rack is required",
      "string.max": "Rack cannot exceed 50 characters",
    }),

  shelf: Joi.string()
    .trim()
    .max(50)
    .required()
    .messages({
      "string.empty": "Shelf is required",
      "string.max": "Shelf cannot exceed 50 characters",
    }),

  bin: Joi.string()
    .trim()
    .max(50)
    .required()
    .messages({
      "string.empty": "Bin is required",
      "string.max": "Bin cannot exceed 50 characters",
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description cannot exceed 500 characters",
    }),

  capacity: Joi.number()
    .integer()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      "number.base": "Capacity must be a number",
      "number.integer": "Capacity must be an integer",
      "number.min": "Capacity cannot be negative",
    }),
});

/**
 * Update location validation schema
 */
export const updateLocationValidator = Joi.object({
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description cannot exceed 500 characters",
    }),

  capacity: Joi.number()
    .integer()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      "number.base": "Capacity must be a number",
      "number.integer": "Capacity must be an integer",
      "number.min": "Capacity cannot be negative",
    }),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

/**
 * Assign product to location validation schema
 */
export const assignProductValidator = Joi.object({
  productId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "Product ID is required",
      "string.hex": "Product ID must be a valid MongoDB ObjectId",
      "string.length": "Product ID must be a valid MongoDB ObjectId",
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

  zone: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow("")
    .messages({
      "string.max": "Zone cannot exceed 50 characters",
    }),

  rack: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow("")
    .messages({
      "string.max": "Rack cannot exceed 50 characters",
    }),

  occupancy: Joi.string()
    .valid("available", "full", "partial")
    .optional()
    .messages({
      "any.only": "Occupancy filter must be: available, full, or partial",
    }),

  sortBy: Joi.string()
    .valid("zone", "rack", "shelf", "bin", "currentOccupancy", "capacity", "createdAt", "updatedAt")
    .default("createdAt")
    .messages({
      "any.only": "sortBy must be one of: zone, rack, shelf, bin, currentOccupancy, capacity, createdAt, updatedAt",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("asc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create location data
 * @param {Object} data - Location creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateLocation = (data) => {
  const { error, value } = createLocationValidator.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    throw new Error(errors.join(", "));
  }

  // Normalize zone to uppercase
  if (value.zone) {
    value.zone = value.zone.toUpperCase();
  }

  return value;
};

/**
 * Validate update location data
 * @param {Object} data - Location update data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUpdateLocation = (data) => {
  const { error, value } = updateLocationValidator.validate(data, {
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
 * Validate assign product data
 * @param {Object} data - Product assignment data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateAssignProduct = (data) => {
  const { error, value } = assignProductValidator.validate(data, {
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

  // Normalize zone to uppercase if provided
  if (value.zone) {
    value.zone = value.zone.toUpperCase();
  }

  return value;
};
