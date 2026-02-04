import express from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

/**
 * Authentication Routes
 * All authentication endpoints
 */

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", authenticate, logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post("/refresh-token", refreshToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get authenticated user info
 * @access  Private
 */
router.get("/me", authenticate, getMe);

export default router;
