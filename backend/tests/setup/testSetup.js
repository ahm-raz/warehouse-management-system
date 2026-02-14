/**
 * Per-Suite Test Setup
 * Handles mongoose connection lifecycle and database cleanup
 *
 * Usage: Import and call setup/teardown in each test file's
 * beforeAll/afterAll/afterEach hooks.
 */

import mongoose from "mongoose";

/**
 * Connect to the in-memory MongoDB test database
 * Must be called in beforeAll() of each test suite
 */
export const connectTestDB = async () => {
  // Use the URI from globalSetup
  const uri = process.env.MONGO_URI_TEST;

  if (!uri) {
    throw new Error(
      "MONGO_URI_TEST not set. Ensure globalSetup.js is configured in jest.config.js"
    );
  }

  // Disconnect any existing connections first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri, {
    // Each test suite uses its own database to prevent collisions
    dbName: `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  });
};

/**
 * Clear all collections in the test database
 * Call in afterEach() to reset state between tests
 */
export const clearTestDB = async () => {
  if (mongoose.connection.readyState !== 1) return;

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Disconnect from the test database and clean up
 * Must be called in afterAll() of each test suite
 */
export const disconnectTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    // Drop the test database before disconnecting
    try {
      await mongoose.connection.dropDatabase();
    } catch {
      // Ignore errors during cleanup
    }
    await mongoose.disconnect();
  }
};

/**
 * Setup environment variables required for testing
 * Call before connecting to DB
 */
export const setupTestEnv = () => {
  // Set test environment
  process.env.NODE_ENV = "test";

  // JWT secrets for token generation/verification
  process.env.JWT_SECRET = "test-jwt-secret-key-for-wms-testing-2024";
  process.env.JWT_REFRESH_SECRET =
    "test-jwt-refresh-secret-key-for-wms-testing-2024";

  // Token expiry settings
  process.env.ACCESS_TOKEN_EXPIRY = "15m";
  process.env.REFRESH_TOKEN_EXPIRY = "7d";

  // Login protection settings
  process.env.LOGIN_MAX_ATTEMPTS = "5";
  process.env.LOGIN_LOCK_TIME = "30";

  // Client URL for CORS
  process.env.CLIENT_URL = "http://localhost:5173";
};
