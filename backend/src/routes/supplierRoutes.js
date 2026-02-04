import express from "express";
import {
  createSupplierHandler,
  getSuppliersHandler,
  getSupplierByIdHandler,
  updateSupplierHandler,
  changeSupplierStatusHandler,
  deleteSupplierHandler,
  getSupplierProductsHandler,
  getSupplierActivityLogsHandler,
} from "../controllers/supplierController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Supplier Management Routes
 * All supplier management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/suppliers
 * @desc    Create a new supplier
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createSupplierHandler
);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get("/", getSuppliersHandler);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private (All authenticated users)
 */
router.get("/:id", getSupplierByIdHandler);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  updateSupplierHandler
);

/**
 * @route   PATCH /api/suppliers/:id/status
 * @desc    Change supplier status
 * @access  Private (Admin, Manager)
 */
router.patch(
  "/:id/status",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  changeSupplierStatusHandler
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Soft delete supplier
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteSupplierHandler
);

/**
 * @route   GET /api/suppliers/:id/products
 * @desc    Get products linked to supplier
 * @access  Private (All authenticated users)
 */
router.get("/:id/products", getSupplierProductsHandler);

/**
 * @route   GET /api/suppliers/:id/activity
 * @desc    Get supplier activity logs
 * @access  Private (Admin, Manager)
 */
router.get(
  "/:id/activity",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  getSupplierActivityLogsHandler
);

export default router;
