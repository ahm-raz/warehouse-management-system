import Joi from "joi";

/**
 * Report Validators
 * Joi validation schemas for reporting endpoints
 */

/**
 * Date range validation schema
 */
export const dateRangeValidator = Joi.object({
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
 * Report query validation schema
 * Base schema for all report endpoints
 */
export const reportQueryValidator = Joi.object({
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

  location: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow("")
    .messages({
      "string.hex": "Location must be a valid MongoDB ObjectId",
      "string.length": "Location must be a valid MongoDB ObjectId",
    }),

  groupBy: Joi.string()
    .valid("day", "week", "month", "year")
    .optional()
    .messages({
      "any.only": "groupBy must be one of: day, week, month, year",
    }),
});

/**
 * Validate date range
 * @param {Object} data - Date range data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateDateRange = (data) => {
  const { error, value } = dateRangeValidator.validate(data, {
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
 * Validate report query parameters
 * @param {Object} data - Query parameters
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateReportQuery = (data) => {
  const { error, value } = reportQueryValidator.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    throw new Error(errors.join(", "));
  }

  return value;
};
