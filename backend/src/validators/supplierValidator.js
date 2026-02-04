import Joi from "joi";
import { supplierStatus } from "../models/Supplier.js";

/**
 * Supplier Validators
 * Joi validation schemas for supplier management endpoints
 */

/**
 * Create supplier validation schema
 */
export const createSupplierValidator = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.empty": "Supplier name is required",
      "string.min": "Supplier name must be at least 2 characters",
      "string.max": "Supplier name cannot exceed 100 characters",
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[\d\s\-\+\(\)]+$/)
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Please provide a valid phone number",
    }),

  address: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Address cannot exceed 500 characters",
    }),

  company: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow("")
    .messages({
      "string.max": "Company name cannot exceed 100 characters",
    }),

  status: Joi.string()
    .valid(...Object.values(supplierStatus))
    .default(supplierStatus.ACTIVE)
    .optional()
    .messages({
      "any.only": "Status must be ACTIVE or INACTIVE",
    }),
});

/**
 * Update supplier validation schema
 */
export const updateSupplierValidator = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      "string.min": "Supplier name must be at least 2 characters",
      "string.max": "Supplier name cannot exceed 100 characters",
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .messages({
      "string.email": "Please provide a valid email address",
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[\d\s\-\+\(\)]+$/)
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),

  address: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Address cannot exceed 500 characters",
    }),

  company: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow("")
    .messages({
      "string.max": "Company name cannot exceed 100 characters",
    }),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

/**
 * Supplier status validation schema
 */
export const supplierStatusValidator = Joi.object({
  status: Joi.string()
    .valid(...Object.values(supplierStatus))
    .required()
    .messages({
      "string.empty": "Status is required",
      "any.only": "Status must be ACTIVE or INACTIVE",
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

  status: Joi.string()
    .valid(...Object.values(supplierStatus))
    .optional()
    .messages({
      "any.only": "Status must be ACTIVE or INACTIVE",
    }),

  sortBy: Joi.string()
    .valid("name", "email", "company", "status", "createdAt", "updatedAt")
    .default("createdAt")
    .messages({
      "any.only": "sortBy must be one of: name, email, company, status, createdAt, updatedAt",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("desc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create supplier data
 * @param {Object} data - Supplier creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateSupplier = (data) => {
  const { error, value } = createSupplierValidator.validate(data, {
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
 * Validate update supplier data
 * @param {Object} data - Supplier update data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUpdateSupplier = (data) => {
  const { error, value } = updateSupplierValidator.validate(data, {
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
 * Validate supplier status data
 * @param {Object} data - Supplier status data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateSupplierStatus = (data) => {
  const { error, value } = supplierStatusValidator.validate(data, {
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
