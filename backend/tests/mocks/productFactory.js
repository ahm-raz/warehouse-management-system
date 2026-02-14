/**
 * Product Mock Data Factory
 * Generates realistic product test data for various scenarios
 */

import mongoose from "mongoose";

let counter = 0;

/**
 * Generate a unique mock product data object
 * @param {Object} overrides - Fields to override
 * @returns {Object} Product data suitable for API creation
 */
export const createMockProduct = (overrides = {}) => {
  counter++;
  const id = `${Date.now()}_${counter}`;

  return {
    name: `Test Product ${counter}`,
    description: `Description for test product ${counter}`,
    SKU: `SKU-${id}`.toUpperCase(),
    quantity: 100,
    minimumStockLevel: 10,
    unitPrice: 29.99,
    ...overrides,
  };
};

/**
 * Generate a product with low stock
 * @param {Object} overrides - Fields to override
 * @returns {Object} Low stock product data
 */
export const createLowStockProduct = (overrides = {}) => {
  return createMockProduct({
    quantity: 5,
    minimumStockLevel: 10,
    ...overrides,
  });
};

/**
 * Generate a product with zero stock
 * @param {Object} overrides - Fields to override
 * @returns {Object} Zero stock product data
 */
export const createOutOfStockProduct = (overrides = {}) => {
  return createMockProduct({
    quantity: 0,
    minimumStockLevel: 10,
    ...overrides,
  });
};

/**
 * Generate invalid product data for validation failure tests
 * @returns {Object} Invalid product data
 */
export const createInvalidProduct = () => ({
  name: "", // Empty name - should fail validation
  SKU: "invalid sku with spaces!", // Invalid SKU format
  unitPrice: -10, // Negative price
  quantity: -5, // Negative quantity
});

/**
 * Generate multiple mock products
 * @param {number} count - Number of products to generate
 * @param {Object} overrides - Common overrides for all products
 * @returns {Array} Array of product data objects
 */
export const createMockProducts = (count = 5, overrides = {}) => {
  return Array.from({ length: count }, (_, i) =>
    createMockProduct({
      name: `Bulk Product ${i + 1}`,
      ...overrides,
    })
  );
};

/**
 * Reset the counter (call in afterEach if needed)
 */
export const resetProductCounter = () => {
  counter = 0;
};
