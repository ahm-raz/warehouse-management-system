/**
 * User Mock Data Factory
 * Generates realistic user test data for various scenarios
 */

import mongoose from "mongoose";

let counter = 0;

/**
 * Generate a unique mock user data object
 * @param {Object} overrides - Fields to override
 * @returns {Object} User data suitable for registration or direct model creation
 */
export const createMockUser = (overrides = {}) => {
  counter++;
  const id = `${Date.now()}_${counter}`;

  return {
    name: `Test User ${counter}`,
    email: `user_${id}@test.com`,
    password: "SecurePass123!",
    role: "Staff",
    ...overrides,
  };
};

/**
 * Generate mock admin user data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Admin user data
 */
export const createMockAdmin = (overrides = {}) => {
  return createMockUser({
    name: "Admin User",
    role: "Admin",
    ...overrides,
  });
};

/**
 * Generate mock manager user data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Manager user data
 */
export const createMockManager = (overrides = {}) => {
  return createMockUser({
    name: "Manager User",
    role: "Manager",
    ...overrides,
  });
};

/**
 * Generate mock staff user data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Staff user data
 */
export const createMockStaff = (overrides = {}) => {
  return createMockUser({
    name: "Staff User",
    role: "Staff",
    ...overrides,
  });
};

/**
 * Generate invalid user data for validation failure tests
 * @returns {Object} Invalid user data
 */
export const createInvalidUser = () => ({
  name: "", // Empty name - should fail validation
  email: "not-an-email", // Invalid email format
  password: "123", // Too short, no uppercase/special chars
  role: "InvalidRole", // Invalid role
});

/**
 * Reset the counter (call in afterEach if needed)
 */
export const resetUserCounter = () => {
  counter = 0;
};
