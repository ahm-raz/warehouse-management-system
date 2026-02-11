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
 * @swagger
 * /api/uploads/products/{productId}/image:
 *   post:
 *     summary: Upload product image
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Product image file (jpeg, jpg, png, webp - max 5MB)
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Validation error or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Product not found
 *       413:
 *         description: File too large (max 5MB)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/products/:productId/image",
  uploadProductImage, // Multer middleware for single file upload
  handleMulterError, // Multer error handler
  uploadProductImageHandler // Controller handler
);

export default router;
