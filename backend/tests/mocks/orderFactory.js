/**
 * Order Mock Data Factory
 * Generates realistic order test data for various scenarios
 */

import mongoose from "mongoose";

let counter = 0;

/**
 * Generate a unique mock order data object
 * Requires valid product IDs to be passed in items
 *
 * @param {Object} overrides - Fields to override
 * @returns {Object} Order data suitable for API creation
 */
export const createMockOrder = (overrides = {}) => {
  counter++;

  return {
    customerName: `Customer ${counter}`,
    items: [],
    ...overrides,
  };
};

/**
 * Generate a mock order with a single item
 * @param {string} productId - Valid product ObjectId
 * @param {number} quantity - Order quantity
 * @param {Object} overrides - Additional overrides
 * @returns {Object} Order data with one item
 */
export const createSingleItemOrder = (
  productId,
  quantity = 2,
  overrides = {}
) => {
  return createMockOrder({
    items: [
      {
        product: productId.toString(),
        quantity,
      },
    ],
    ...overrides,
  });
};

/**
 * Generate a mock order with multiple items
 * @param {Array<{productId: string, quantity: number}>} products - Product array
 * @param {Object} overrides - Additional overrides
 * @returns {Object} Order data with multiple items
 */
export const createMultiItemOrder = (products, overrides = {}) => {
  return createMockOrder({
    items: products.map(({ productId, quantity }) => ({
      product: productId.toString(),
      quantity: quantity || 1,
    })),
    ...overrides,
  });
};

/**
 * Generate invalid order data for validation failure tests
 * @returns {Object} Invalid order data
 */
export const createInvalidOrder = () => ({
  customerName: "", // Empty customer name
  items: [], // Empty items array
});

/**
 * Reset the counter
 */
export const resetOrderCounter = () => {
  counter = 0;
};
