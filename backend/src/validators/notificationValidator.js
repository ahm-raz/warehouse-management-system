import Joi from "joi";
import { notificationType } from "../models/Notification.js";

/**
 * Notification Validators
 * Joi validation schemas for notification management endpoints
 */

/**
 * Create notification validation schema
 */
export const createNotificationValidator = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      "string.empty": "Notification title is required",
      "string.min": "Title must be at least 3 characters",
      "string.max": "Title cannot exceed 200 characters",
    }),

  message: Joi.string()
    .trim()
    .max(1000)
    .required()
    .messages({
      "string.empty": "Notification message is required",
      "string.max": "Message cannot exceed 1000 characters",
    }),

  user: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "User ID is required",
      "string.hex": "User must be a valid MongoDB ObjectId",
      "string.length": "User must be a valid MongoDB ObjectId",
    }),

  type: Joi.string()
    .valid(...Object.values(notificationType))
    .required()
    .messages({
      "string.empty": "Notification type is required",
      "any.only": `Type must be one of: ${Object.values(notificationType).join(", ")}`,
    }),

  metadata: Joi.object()
    .optional()
    .messages({
      "object.base": "Metadata must be an object",
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

  type: Joi.string()
    .valid(...Object.values(notificationType))
    .optional()
    .messages({
      "any.only": `Type must be one of: ${Object.values(notificationType).join(", ")}`,
    }),

  readStatus: Joi.boolean()
    .optional()
    .messages({
      "boolean.base": "readStatus must be a boolean",
    }),

  sortBy: Joi.string()
    .valid("createdAt", "readAt", "type")
    .default("createdAt")
    .messages({
      "any.only": "sortBy must be one of: createdAt, readAt, type",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("desc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create notification data
 * @param {Object} data - Notification creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateNotification = (data) => {
  const { error, value } = createNotificationValidator.validate(data, {
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
