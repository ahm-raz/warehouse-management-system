import jwt from "jsonwebtoken";

/**
 * JWT Token Utilities
 * Handles generation and verification of access and refresh tokens
 */

/**
 * Generate access token
 * Short-lived token for API authentication (15 minutes)
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {string} - JWT access token
 */
export const generateAccessToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRY || "15m";

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const payload = {
    userId: userId.toString(),
    role: role,
    type: "access",
  };

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn,
    issuer: "wms-backend",
    audience: "wms-client",
  });
};

/**
 * Generate refresh token
 * Long-lived token for refreshing access tokens (7 days)
 * @param {string} userId - User ID
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRY || "7d";

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
  }

  const payload = {
    userId: userId.toString(),
    type: "refresh",
  };

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn,
    issuer: "wms-backend",
    audience: "wms-client",
  });
};

/**
 * Verify access token
 * @param {string} token - Access token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyAccessToken = (token) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  try {
    return jwt.verify(token, secret, {
      issuer: "wms-backend",
      audience: "wms-client",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Access token expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid access token");
    }
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
  }

  try {
    return jwt.verify(token, secret, {
      issuer: "wms-backend",
      audience: "wms-client",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Refresh token expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid refresh token");
    }
    throw error;
  }
};

/**
 * Decode token without verification
 * Useful for extracting user info from expired tokens
 * @param {string} token - Token to decode
 * @returns {Object} - Decoded token payload
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};
