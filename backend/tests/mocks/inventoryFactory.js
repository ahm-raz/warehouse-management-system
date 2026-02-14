/**
 * Inventory Mock Data Factory
 * Generates realistic inventory adjustment test data
 */

let counter = 0;

/**
 * Generate a mock stock adjustment request (ADD)
 * @param {string} productId - Valid product ObjectId
 * @param {Object} overrides - Fields to override
 * @returns {Object} Stock adjustment data for ADD operation
 */
export const createAddStockAdjustment = (productId, overrides = {}) => {
  counter++;

  return {
    productId: productId.toString(),
    adjustmentType: "ADD",
    quantity: 50,
    note: `Stock replenishment #${counter}`,
    ...overrides,
  };
};

/**
 * Generate a mock stock adjustment request (REMOVE)
 * @param {string} productId - Valid product ObjectId
 * @param {Object} overrides - Fields to override
 * @returns {Object} Stock adjustment data for REMOVE operation
 */
export const createRemoveStockAdjustment = (productId, overrides = {}) => {
  counter++;

  return {
    productId: productId.toString(),
    adjustmentType: "REMOVE",
    quantity: 10,
    note: `Stock removal #${counter}`,
    ...overrides,
  };
};

/**
 * Generate invalid stock adjustment data
 * @returns {Object} Invalid adjustment data for testing validation
 */
export const createInvalidStockAdjustment = () => ({
  productId: "invalid-id", // Not a valid ObjectId
  adjustmentType: "INVALID", // Invalid type
  quantity: -5, // Negative quantity
});

/**
 * Reset the counter
 */
export const resetInventoryCounter = () => {
  counter = 0;
};
