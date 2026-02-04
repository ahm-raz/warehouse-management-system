import express from "express";
import {
  uploadProductImageHandler,
} from "../controllers/fileUploadController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";
import {
  uploadProductImage,
  handleMulterError,
} from "../config/multer.js";

/**
 * File Upload Routes
 * All file upload endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require Admin or Manager role
router.use(authorizeRoles(userRoles.ADMIN, userRoles.MANAGER));

/**
 * @route   POST /api/uploads/products/:productId/image
 * @desc    Upload product image
 * @access  Private (Admin, Manager)
 * 
 * Request:
 * - multipart/form-data
 * - Field name: 'image'
 * - File types: jpeg, jpg, png, webp
 * - Max size: 5MB
 */
router.post(
  "/products/:productId/image",
  uploadProductImage, // Multer middleware for single file upload
  handleMulterError, // Multer error handler
  uploadProductImageHandler // Controller handler
);

export default router;
