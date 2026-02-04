import Joi from "joi";

/**
 * Upload Validators
 * Joi validation schemas for file upload endpoints
 */

/**
 * Product ID validation schema
 */
export const productIdValidator = Joi.object({
  productId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.hex": "Product ID must be a valid MongoDB ObjectId",
      "string.length": "Product ID must be a valid MongoDB ObjectId",
      "any.required": "Product ID is required",
    }),
});

/**
 * Validate product ID parameter
 * @param {string} productId - Product ID to validate
 * @returns {Object} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateProductId = (productId) => {
  const { error, value } = productIdValidator.validate(
    { productId },
    {
      abortEarly: false,
      stripUnknown: true,
    }
  );

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    throw new Error(errors.join(", "));
  }

  return value.productId;
};
