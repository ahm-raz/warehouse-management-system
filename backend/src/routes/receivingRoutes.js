import express from "express";
import {
  createReceivingHandler,
  getReceivingsHandler,
  getReceivingByIdHandler,
  updateReceivingStatusHandler,
  deleteReceivingHandler,
  getReceivingActivityLogsHandler,
} from "../controllers/receivingController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Receiving Management Routes
 * All receiving management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/receiving
 * @desc    Create a new receiving record
 * @access  Private (Admin, Manager, Staff)
 */
router.post("/", createReceivingHandler);

/**
 * @route   GET /api/receiving
 * @desc    Get all receiving records with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get("/", getReceivingsHandler);

/**
 * @route   GET /api/receiving/:id
 * @desc    Get receiving by ID
 * @access  Private (All authenticated users)
 */
router.get("/:id", getReceivingByIdHandler);

/**
 * @route   PATCH /api/receiving/:id/status
 * @desc    Update receiving status
 * @access  Private (Admin, Manager)
 */
router.patch(
  "/:id/status",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  updateReceivingStatusHandler
);

/**
 * @route   DELETE /api/receiving/:id
 * @desc    Soft delete receiving
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteReceivingHandler
);

/**
 * @route   GET /api/receiving/:id/activity
 * @desc    Get receiving activity logs
 * @access  Private (All authenticated users)
 */
router.get("/:id/activity", getReceivingActivityLogsHandler);

export default router;
