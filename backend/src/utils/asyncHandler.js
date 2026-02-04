/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 * Eliminates need for try-catch blocks in every route handler
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that catches errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
