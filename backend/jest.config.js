/**
 * Jest Configuration
 * Warehouse Management System - Backend Testing
 *
 * Supports ES Modules with Node test environment
 * Uses mongodb-memory-server for database isolation
 */

export default {
  // Use Node test environment (not jsdom)
  testEnvironment: "node",

  // ES Module support - use .js extensions
  transform: {},

  // Test file patterns
  testMatch: ["**/tests/**/*.test.js"],

  // Global setup/teardown for in-memory MongoDB
  globalSetup: "./tests/setup/globalSetup.js",
  globalTeardown: "./tests/setup/globalTeardown.js",

  // Per-test-suite setup
  setupFiles: [],

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Clear mocks automatically between tests
  clearMocks: true,
  restoreMocks: true,

  // Coverage configuration
  collectCoverageFrom: [
    "src/controllers/**/*.js",
    "src/services/**/*.js",
    "src/middleware/**/*.js",
    "src/utils/**/*.js",
    "src/validators/**/*.js",
    "!src/**/index.js",
    "!src/config/**",
    "!src/logs/**",
    "!src/sockets/**",
    "!src/jobs/**",
    "!src/docs/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "clover"],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Verbose output for clear test results
  verbose: true,

  // Force exit after tests complete (prevents hanging from open handles)
  forceExit: true,

  // Detect open handles for debugging
  detectOpenHandles: false,

  // Module name mapper for mocking modules that don't exist on disk
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
