import ApiError from "../utils/ApiError.js";

/**
 * Not Found Middleware
 * Handles 404 errors for routes that don't exist
 */
const notFound = (req, res, next) => {
  const error = new ApiError(
    404,
    `Route ${req.originalUrl} not found`
  );
  next(error);
};

export default notFound;
