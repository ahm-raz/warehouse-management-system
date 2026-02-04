import Joi from "joi";
import { taskType, taskStatus, taskPriority } from "../models/Task.js";

/**
 * Task Validators
 * Joi validation schemas for task management endpoints
 */

/**
 * Create task validation schema
 */
export const createTaskValidator = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      "string.empty": "Task title is required",
      "string.min": "Task title must be at least 3 characters",
      "string.max": "Task title cannot exceed 200 characters",
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description cannot exceed 1000 characters",
    }),

  assignedTo: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "Assigned to user ID is required",
      "string.hex": "Assigned to must be a valid MongoDB ObjectId",
      "string.length": "Assigned to must be a valid MongoDB ObjectId",
    }),

  taskType: Joi.string()
    .valid(...Object.values(taskType))
    .required()
    .messages({
      "string.empty": "Task type is required",
      "any.only": `Task type must be one of: ${Object.values(taskType).join(", ")}`,
    }),

  relatedOrder: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Related order must be a valid MongoDB ObjectId",
      "string.length": "Related order must be a valid MongoDB ObjectId",
    }),

  relatedReceiving: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null, "")
    .messages({
      "string.hex": "Related receiving must be a valid MongoDB ObjectId",
      "string.length": "Related receiving must be a valid MongoDB ObjectId",
    }),

  priority: Joi.string()
    .valid(...Object.values(taskPriority))
    .default(taskPriority.MEDIUM)
    .optional()
    .messages({
      "any.only": `Priority must be one of: ${Object.values(taskPriority).join(", ")}`,
    }),
}).custom((value, helpers) => {
  // Validate relatedOrder is required for Picking and Packing tasks
  if (value.taskType === taskType.PICKING || value.taskType === taskType.PACKING) {
    if (!value.relatedOrder) {
      return helpers.error("any.required", { message: "Related order is required for Picking and Packing tasks" });
    }
  }

  // Validate relatedReceiving is required for Receiving tasks
  if (value.taskType === taskType.RECEIVING) {
    if (!value.relatedReceiving) {
      return helpers.error("any.required", { message: "Related receiving is required for Receiving tasks" });
    }
  }

  return value;
}, "Task relationship validation");

/**
 * Update task status validation schema
 */
export const updateTaskStatusValidator = Joi.object({
  status: Joi.string()
    .valid(...Object.values(taskStatus))
    .required()
    .messages({
      "string.empty": "Status is required",
      "any.only": `Status must be one of: ${Object.values(taskStatus).join(", ")}`,
    }),
});

/**
 * Assign task validation schema
 */
export const assignTaskValidator = Joi.object({
  assignedTo: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "Assigned to user ID is required",
      "string.hex": "Assigned to must be a valid MongoDB ObjectId",
      "string.length": "Assigned to must be a valid MongoDB ObjectId",
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

  assignedTo: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow("")
    .messages({
      "string.hex": "Assigned to must be a valid MongoDB ObjectId",
      "string.length": "Assigned to must be a valid MongoDB ObjectId",
    }),

  taskType: Joi.string()
    .valid(...Object.values(taskType))
    .optional()
    .messages({
      "any.only": `Task type must be one of: ${Object.values(taskType).join(", ")}`,
    }),

  status: Joi.string()
    .valid(...Object.values(taskStatus))
    .optional()
    .messages({
      "any.only": `Status must be one of: ${Object.values(taskStatus).join(", ")}`,
    }),

  priority: Joi.string()
    .valid(...Object.values(taskPriority))
    .optional()
    .messages({
      "any.only": `Priority must be one of: ${Object.values(taskPriority).join(", ")}`,
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
    .valid("title", "taskType", "status", "priority", "createdAt", "updatedAt", "completedAt")
    .default("createdAt")
    .messages({
      "any.only": "sortBy must be one of: title, taskType, status, priority, createdAt, updatedAt, completedAt",
    }),

  order: Joi.string()
    .valid("asc", "desc")
    .default("desc")
    .messages({
      "any.only": "Order must be either 'asc' or 'desc'",
    }),
});

/**
 * Validate create task data
 * @param {Object} data - Task creation data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateCreateTask = (data) => {
  const { error, value } = createTaskValidator.validate(data, {
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
 * Validate update task status data
 * @param {Object} data - Status update data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateUpdateTaskStatus = (data) => {
  const { error, value } = updateTaskStatusValidator.validate(data, {
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
 * Validate assign task data
 * @param {Object} data - Task assignment data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateAssignTask = (data) => {
  const { error, value } = assignTaskValidator.validate(data, {
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
