/**
 * Custom API Error Class
 * Extends Error to include status code for HTTP error handling
 */
class ApiError extends Error {
  /**
   * Create API Error
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {boolean} isOperational - Whether error is operational (expected) or programming error
   */
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
