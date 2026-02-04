import User, { userRoles } from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";
import logger from "../logs/logger.js";

/**
 * Authentication Service
 * Business logic for authentication operations
 * Separates concerns from controllers
 */

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - User object and tokens
 */
export const registerUser = async (userData) => {
  const { name, email, password, role } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    logger.warn("Registration attempt with existing email", {
      email: email.toLowerCase(),
    });
    throw new ApiError(409, "Email already registered");
  }

  // Create new user
  const user = new User({
    name,
    email: email.toLowerCase(),
    password,
    role: role || userRoles.STAFF,
  });

  await user.save();

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Hash and store refresh token
  const hashedRefreshToken = await user.hashRefreshToken(refreshToken);
  user.refreshToken = hashedRefreshToken;
  await user.save();

  logger.info("User registered successfully", {
    userId: user._id,
    email: user.email,
    role: user.role,
  });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
  };
};

/**
 * Login user
 * Handles authentication, account lock checks, and login attempt tracking
 * @param {Object} credentials - Login credentials
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>} - User object and tokens
 */
export const loginUser = async (credentials, ipAddress) => {
  const { email, password } = credentials;

  // Find user with password included
  const user = await User.findByEmail(email.toLowerCase());

  if (!user) {
    logger.warn("Login attempt with non-existent email", {
      email: email.toLowerCase(),
      ip: ipAddress,
    });
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if account is active
  if (!user.isActive) {
    logger.warn("Login attempt on inactive account", {
      userId: user._id,
      email: user.email,
      ip: ipAddress,
    });
    throw new ApiError(403, "Account is deactivated");
  }

  // Check if account is locked
  if (user.isLocked()) {
    const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    logger.warn("Login attempt on locked account", {
      userId: user._id,
      email: user.email,
      ip: ipAddress,
      lockTimeRemaining: `${lockTime} minutes`,
    });
    throw new ApiError(
      423,
      `Account is locked. Please try again in ${lockTime} minutes`
    );
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    // Increment login attempts
    await user.incLoginAttempts();

    logger.warn("Failed login attempt", {
      userId: user._id,
      email: user.email,
      ip: ipAddress,
      attempts: user.loginAttempts + 1,
    });

    // Check if account should be locked
    const updatedUser = await User.findByEmail(email.toLowerCase());
    if (updatedUser.isLocked()) {
      logger.warn("Account locked due to multiple failed login attempts", {
        userId: updatedUser._id,
        email: updatedUser.email,
        ip: ipAddress,
      });
      throw new ApiError(423, "Account locked due to multiple failed attempts");
    }

    throw new ApiError(401, "Invalid email or password");
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Update last login
  user.lastLogin = new Date();

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Hash and store refresh token
  const hashedRefreshToken = await user.hashRefreshToken(refreshToken);
  user.refreshToken = hashedRefreshToken;
  await user.save();

  logger.info("User logged in successfully", {
    userId: user._id,
    email: user.email,
    role: user.role,
    ip: ipAddress,
  });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
  };
};

/**
 * Logout user
 * Invalidates refresh token
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const logoutUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Clear refresh token
  user.refreshToken = undefined;
  await user.save();

  logger.info("User logged out", {
    userId: user._id,
    email: user.email,
  });
};

/**
 * Refresh access token
 * Implements refresh token rotation for security
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} - New access and refresh tokens
 */
export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    logger.warn("Invalid refresh token used", {
      error: error.message,
    });
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // Find user with refresh token
  const user = await User.findById(decoded.userId).select(
    "+refreshToken +isActive"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if account is active
  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  // Verify stored refresh token matches
  const isTokenValid = await user.compareRefreshToken(refreshToken);

  if (!isTokenValid) {
    logger.warn("Refresh token mismatch - possible token theft", {
      userId: user._id,
      email: user.email,
    });

    // Security: Invalidate all tokens if mismatch detected
    user.refreshToken = undefined;
    await user.save();

    throw new ApiError(401, "Invalid refresh token");
  }

  // Generate new tokens (token rotation)
  const newAccessToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id);

  // Hash and store new refresh token (invalidate old one)
  const hashedRefreshToken = await user.hashRefreshToken(newRefreshToken);
  user.refreshToken = hashedRefreshToken;
  await user.save();

  logger.info("Access token refreshed", {
    userId: user._id,
    email: user.email,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Get authenticated user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User object
 */
export const getAuthenticatedUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  return user.toJSON();
};
