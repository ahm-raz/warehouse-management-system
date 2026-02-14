/**
 * Socket.io Configuration Helper
 * Re-exports getSocket from the sockets module
 *
 * Provides a mock-friendly import path for services
 * In test environment, returns a no-op emitter to prevent errors
 */

import { getSocket as _getSocket } from "../sockets/index.js";

/**
 * Get Socket.io instance
 * Returns a no-op mock in test environment to prevent socket errors
 * @returns {Object} Socket.io server instance or mock
 */
export const getSocket = () => {
  if (process.env.NODE_ENV === "test") {
    // Return a no-op emitter so services don't crash during tests
    return {
      emit: () => {},
      to: () => ({ emit: () => {} }),
      in: () => ({ emit: () => {} }),
    };
  }

  return _getSocket();
};
