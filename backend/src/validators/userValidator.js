import Joi from "joi";
import { userRoles } from "../models/User.js";

/**
 * User Management Validators
 * Joi validation schemas for user management endpoints
 */

/**
 * Password validation regex
 * Requires: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Create user validation schema
 */
export const createUserValidator = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 50 characters",
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

  password: Joi.string()
    .min(8)
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),

  role: Joi.string()
    .valid(...Object.values(userRoles))
    .default(userRoles.STAFF)
    .messages({
      "any.only": "Role must be Admin, Manager, or Staff",
    }),
});

/**
 * Update user validation schema
 */
export const updateUserValidator = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 50 characters",
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .messages({
      "string.email": "Please provide a valid email address",
    }),

  isActive: Joi.boolean().optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

/**
 * Role change validation schema
 */
export const roleChangeValidator = Joi.object({
  role: Joi.string()
    .valid(...Object.values(userRoles))
    .required()
    .messages({
      "string.empty": "Role is required",
      "any.only": "Role must be Admin, Manager, or Staff",
    }),
});

/**
 * User status validation schema
 */
export const userStatusValidator = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      "boolean.base": "isActive must be a boolean",
      "any.required": "isActive is required",
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

  role: Joi.string()
    .valid(...Object.values(userRoles))
    .optional()
    .messages({
      "any.only": "Role must be Admin, Manager, or Staff",
    }),

  isActive: Joi.boolean()
    .optional()
    .messages({
      "boolean.base": "isActive must be a boolean",
    }),

  sortBy: Joi.string()
    .valid("name", "email", "role", "createdAt", "lastLogin")
    .default("createdAt")
    .messages({
      "any.only": "sortBy must be one of: name, email, role, createdAt, lastLogin",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("desc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create user data
 * @param {Object} data - User creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateUser = (data) => {
  const { error, value } = createUserValidator.validate(data, {
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
 * Validate update user data
 * @param {Object} data - User update data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUpdateUser = (data) => {
  const { error, value } = updateUserValidator.validate(data, {
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
 * Validate role change data
 * @param {Object} data - Role change data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateRoleChange = (data) => {
  const { error, value } = roleChangeValidator.validate(data, {
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
 * Validate user status data
 * @param {Object} data - User status data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUserStatus = (data) => {
  const { error, value } = userStatusValidator.validate(data, {
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
