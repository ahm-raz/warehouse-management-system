import Joi from "joi";

/**
 * Authentication Validators
 * Joi validation schemas for authentication endpoints
 */

/**
 * Password validation regex
 * Requires: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Registration validation schema
 */
export const registerSchema = Joi.object({
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
    .valid("Admin", "Manager", "Staff")
    .default("Staff")
    .messages({
      "any.only": "Role must be Admin, Manager, or Staff",
    }),
});

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(), // Optional because it can come from cookie
});

/**
 * Validate registration data
 * @param {Object} data - Registration data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateRegister = (data) => {
  const { error, value } = registerSchema.validate(data, {
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
 * Validate login data
 * @param {Object} data - Login data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateLogin = (data) => {
  const { error, value } = loginSchema.validate(data, {
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
 * Validate refresh token data
 * @param {Object} data - Refresh token data
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateRefreshToken = (data) => {
  const { error, value } = refreshTokenSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    throw new Error(errors.join(", "));
  }

  return value;
};
