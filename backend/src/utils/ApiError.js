/**
 * Custom API Error Class
 * Extends Error to include status code for HTTP error handling
 * 
 * @class ApiError
 * @extends {Error}
 */
class ApiError extends Error {
  /**
   * Create API Error
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {boolean} isOperational - Whether error is operational (expected) or programming error
   * @param {string} stack - Optional custom stack trace
   */
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    // Set custom stack trace if provided, otherwise capture automatically
    if (stack) {
      this.stack = stack;
    } else {
      // Maintains proper stack trace for where error was thrown
      Error.captureStackTrace(this, this.constructor);
    }

    // Set status property for compatibility
    this.status = statusCode;
  }
}

export default ApiError;
