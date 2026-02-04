import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getAuthenticatedUser,
} from "../services/authService.js";
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
} from "../validators/authValidator.js";
import logger from "../logs/logger.js";

/**
 * Authentication Controller
 * Handles HTTP requests and responses for authentication endpoints
 */

/**
 * Set refresh token cookie
 * @param {Object} res - Express response object
 * @param {string} refreshToken - Refresh token
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: maxAge,
  });
};

/**
 * Clear refresh token cookie
 * @param {Object} res - Express response object
 */
const clearRefreshTokenCookie = (res) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  // Validate request body
  const validatedData = validateRegister(req.body);

  // Register user
  const { user, accessToken, refreshToken } = await registerUser(validatedData);

  // Set refresh token cookie
  setRefreshTokenCookie(res, refreshToken);

  logger.info("User registration request processed", {
    userId: user._id,
    email: user.email,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user,
      accessToken,
    },
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  // Validate request body
  const validatedData = validateLogin(req.body);

  // Get client IP
  const ipAddress =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.ip ||
    "unknown";

  // Login user
  const { user, accessToken, refreshToken } = await loginUser(
    validatedData,
    ipAddress
  );

  // Set refresh token cookie
  setRefreshTokenCookie(res, refreshToken);

  logger.info("User login request processed", {
    userId: user._id,
    email: user.email,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user,
      accessToken,
    },
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, "Not authenticated");
  }

  // Logout user
  await logoutUser(userId);

  // Clear refresh token cookie
  clearRefreshTokenCookie(res);

  logger.info("User logout request processed", {
    userId: userId,
  });

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  // Get refresh token from body or cookie
  const refreshToken =
    req.body.refreshToken || req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  // Validate refresh token format
  validateRefreshToken({ refreshToken });

  // Refresh access token
  const { accessToken, refreshToken: newRefreshToken } =
    await refreshAccessToken(refreshToken);

  // Set new refresh token cookie
  setRefreshTokenCookie(res, newRefreshToken);

  logger.info("Token refresh request processed", {
    userId: req.user?.userId || "unknown",
  });

  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: {
      accessToken,
    },
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get authenticated user info
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, "Not authenticated");
  }

  // Get authenticated user
  const user = await getAuthenticatedUser(userId);

  res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: {
      user,
    },
  });
});
