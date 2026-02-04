import User from "../models/User.js";
import logger from "../logs/logger.js";

/**
 * Login Protection Utility
 * Enhanced brute force protection for authentication
 * Tracks failed login attempts and locks accounts
 */

/**
 * Get login protection configuration from environment
 */
const getLoginProtectionConfig = () => {
  const maxAttempts = parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5;
  const lockTimeMinutes = parseInt(process.env.LOGIN_LOCK_TIME) || 30;
  const lockTimeMs = lockTimeMinutes * 60 * 1000;

  return { maxAttempts, lockTimeMs, lockTimeMinutes };
};

/**
 * Check if user account is locked
 * @param {Object} user - User document
 * @returns {Object} - { isLocked: boolean, lockTimeRemaining?: number }
 */
export const checkAccountLock = (user) => {
  if (!user.lockUntil) {
    return { isLocked: false };
  }

  const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);

  if (user.lockUntil > Date.now()) {
    return {
      isLocked: true,
      lockTimeRemaining: lockTimeRemaining,
    };
  }

  // Lock has expired
  return { isLocked: false };
};

/**
 * Record failed login attempt
 * Increments attempt counter and locks account if threshold reached
 * @param {string} email - User email
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>} - Updated user and lock status
 */
export const recordFailedLoginAttempt = async (email, ipAddress) => {
  const config = getLoginProtectionConfig();

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists (security best practice)
      return null;
    }

    // Check if previous lock has expired
    if (user.lockUntil && user.lockUntil < Date.now()) {
      // Reset attempts if lock expired
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }

    // Increment login attempts
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    // Lock account if threshold reached
    if (user.loginAttempts >= config.maxAttempts) {
      user.lockUntil = Date.now() + config.lockTimeMs;

      logger.warn("Account locked due to brute force attempts", {
        userId: user._id,
        email: user.email,
        attempts: user.loginAttempts,
        lockTimeMinutes: config.lockTimeMinutes,
        ip: ipAddress,
      });
    } else {
      logger.warn("Failed login attempt recorded", {
        userId: user._id,
        email: user.email,
        attempts: user.loginAttempts,
        remainingAttempts: config.maxAttempts - user.loginAttempts,
        ip: ipAddress,
      });
    }

    await user.save();

    return {
      user,
      isLocked: user.lockUntil && user.lockUntil > Date.now(),
      lockTimeRemaining: user.lockUntil
        ? Math.ceil((user.lockUntil - Date.now()) / 1000 / 60)
        : null,
    };
  } catch (error) {
    logger.error("Failed to record login attempt", {
      error: error.message,
      stack: error.stack,
      email: email,
      ip: ipAddress,
    });
    throw error;
  }
};

/**
 * Reset login attempts
 * Called after successful login
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const resetLoginAttempts = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 },
    });

    logger.debug("Login attempts reset", {
      userId: userId,
    });
  } catch (error) {
    logger.error("Failed to reset login attempts", {
      error: error.message,
      userId: userId,
    });
    // Don't throw - reset failure shouldn't break login
  }
};

/**
 * Get login protection statistics
 * @param {string} email - User email
 * @returns {Promise<Object>} - Protection statistics
 */
export const getLoginProtectionStats = async (email) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return null;
    }

    const lockStatus = checkAccountLock(user);
    const config = getLoginProtectionConfig();

    return {
      attempts: user.loginAttempts || 0,
      maxAttempts: config.maxAttempts,
      isLocked: lockStatus.isLocked,
      lockTimeRemaining: lockStatus.lockTimeRemaining || null,
      remainingAttempts: Math.max(0, config.maxAttempts - (user.loginAttempts || 0)),
    };
  } catch (error) {
    logger.error("Failed to get login protection stats", {
      error: error.message,
      email: email,
    });
    return null;
  }
};

export default {
  checkAccountLock,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  getLoginProtectionStats,
};
