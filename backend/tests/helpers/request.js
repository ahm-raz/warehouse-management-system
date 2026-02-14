/**
 * Supertest Request Helper
 * Provides reusable request utilities for API endpoint testing
 *
 * Features:
 * - Pre-configured Supertest instance bound to Express app
 * - Authenticated request helpers (auto-attaches JWT Bearer tokens)
 * - User creation + authentication in a single call
 */

import supertest from "supertest";
import app from "../../app.js";
import User from "../../src/models/User.js";
import { generateAccessToken } from "../../src/utils/token.js";

/**
 * Base Supertest request instance
 * Use for unauthenticated requests
 */
export const request = supertest(app);

/**
 * Create an authenticated request agent
 * Returns a helper object with get/post/put/patch/delete methods
 * that automatically attach the JWT Bearer token
 *
 * @param {string} token - JWT access token
 * @returns {Object} Authenticated request helpers
 */
export const authenticatedRequest = (token) => {
  return {
    get: (url) => request.get(url).set("Authorization", `Bearer ${token}`),
    post: (url) => request.post(url).set("Authorization", `Bearer ${token}`),
    put: (url) => request.put(url).set("Authorization", `Bearer ${token}`),
    patch: (url) => request.patch(url).set("Authorization", `Bearer ${token}`),
    delete: (url) =>
      request.delete(url).set("Authorization", `Bearer ${token}`),
  };
};

/**
 * Create a test user and return user document + access token
 * Useful for quick test setup
 *
 * @param {Object} overrides - Override default user fields
 * @returns {Promise<{user: Object, token: string}>}
 */
export const createAuthenticatedUser = async (overrides = {}) => {
  const userData = {
    name: "Test User",
    email: `testuser_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.com`,
    password: "TestPass123!",
    role: "Admin",
    ...overrides,
  };

  const user = new User(userData);
  await user.save();

  const token = generateAccessToken(user._id, user.role);

  return {
    user,
    token,
    authenticatedAgent: authenticatedRequest(token),
  };
};

/**
 * Create multiple authenticated users with different roles
 * Returns admin, manager, and staff users with their tokens
 *
 * @returns {Promise<Object>} Object with admin, manager, staff user data
 */
export const createTestUsers = async () => {
  const timestamp = Date.now();

  const admin = await createAuthenticatedUser({
    name: "Admin User",
    email: `admin_${timestamp}@test.com`,
    role: "Admin",
  });

  const manager = await createAuthenticatedUser({
    name: "Manager User",
    email: `manager_${timestamp}@test.com`,
    role: "Manager",
  });

  const staff = await createAuthenticatedUser({
    name: "Staff User",
    email: `staff_${timestamp}@test.com`,
    role: "Staff",
  });

  return { admin, manager, staff };
};
