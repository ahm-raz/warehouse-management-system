import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import logger from "../logs/logger.js";

/**
 * Multer Configuration
 * Secure file upload configuration for Warehouse Management System
 * Handles product image uploads with strict validation and safe storage
 */

// Get current directory (ES modules compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory
const UPLOAD_BASE_DIR = path.join(__dirname, "../../uploads");

// Product images directory
const PRODUCT_IMAGES_DIR = path.join(UPLOAD_BASE_DIR, "products", "images");

/**
 * Ensure upload directories exist
 * Creates directory structure if it doesn't exist
 */
const ensureUploadDirectories = () => {
  try {
    // Create base upload directory
    if (!fs.existsSync(UPLOAD_BASE_DIR)) {
      fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
      logger.info(`Created upload directory: ${UPLOAD_BASE_DIR}`);
    }

    // Create product images directory
    if (!fs.existsSync(PRODUCT_IMAGES_DIR)) {
      fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
      logger.info(`Created product images directory: ${PRODUCT_IMAGES_DIR}`);
    }
  } catch (error) {
    logger.error("Failed to create upload directories", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Initialize directories on module load
ensureUploadDirectories();

/**
 * Allowed MIME types for product images
 * Only image types are allowed for security
 */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * Allowed file extensions
 * Must match MIME types for additional security
 */
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Maximum file size: 5MB
 * Prevents large file uploads that could cause server issues
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Generate safe filename
 * Removes unsafe characters, adds timestamp/UUID, preserves extension
 * Prevents directory traversal attacks and file overwriting
 * 
 * @param {string} originalName - Original filename from client
 * @returns {string} - Safe generated filename
 */
const generateSafeFilename = (originalName) => {
  // Extract file extension
  const ext = path.extname(originalName).toLowerCase();

  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file extension: ${ext}`);
  }

  // Generate unique identifier (timestamp + random string)
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const uniqueId = `${timestamp}-${randomString}`;

  // Sanitize original name (remove unsafe characters)
  const sanitizedName = originalName
    .replace(ext, "") // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, "-") // Replace unsafe chars with hyphen
    .substring(0, 50) // Limit length
    .toLowerCase();

  // Combine sanitized name, unique ID, and extension
  const safeFilename = `${sanitizedName}-${uniqueId}${ext}`;

  return safeFilename;
};

/**
 * File filter function
 * Validates file type and prevents unauthorized uploads
 * 
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  try {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      logger.warn("File upload rejected: Invalid MIME type", {
        mimetype: file.mimetype,
        originalname: file.originalname,
        userId: req.user?.userId,
      });
      return cb(
        new Error(
          `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(", ")} are allowed.`
        ),
        false
      );
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      logger.warn("File upload rejected: Invalid file extension", {
        extension: ext,
        originalname: file.originalname,
        userId: req.user?.userId,
      });
      return cb(
        new Error(
          `Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(", ")} are allowed.`
        ),
        false
      );
    }

    // Prevent executable files (additional security check)
    const executableExtensions = [".exe", ".sh", ".bat", ".cmd", ".com"];
    if (executableExtensions.includes(ext)) {
      logger.warn("File upload rejected: Executable file detected", {
        extension: ext,
        originalname: file.originalname,
        userId: req.user?.userId,
      });
      return cb(new Error("Executable files are not allowed."), false);
    }

    // File is valid
    cb(null, true);
  } catch (error) {
    logger.error("File filter error", {
      error: error.message,
      originalname: file.originalname,
    });
    cb(error, false);
  }
};

/**
 * Disk storage configuration
 * Stores files locally with safe filename generation
 * 
 * Future: This can be replaced with cloud storage (AWS S3, Azure Blob, etc.)
 * Example: Use multer-s3 or multer-azure-storage for cloud storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists
    ensureUploadDirectories();
    cb(null, PRODUCT_IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    try {
      const safeFilename = generateSafeFilename(file.originalname);
      logger.debug("Generated safe filename", {
        original: file.originalname,
        safe: safeFilename,
      });
      cb(null, safeFilename);
    } catch (error) {
      logger.error("Filename generation error", {
        error: error.message,
        originalname: file.originalname,
      });
      cb(error);
    }
  },
});

/**
 * Multer configuration for product image uploads
 * Single file upload with strict validation
 */
const productImageUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow single file
  },
});

/**
 * Multer error handler middleware
 * Handles multer-specific errors and converts to API errors
 * 
 * @param {Error} error - Multer error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      logger.warn("File upload rejected: File too large", {
        userId: req.user?.userId,
        productId: req.params.productId,
      });
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      logger.warn("File upload rejected: Too many files", {
        userId: req.user?.userId,
        productId: req.params.productId,
      });
      return res.status(400).json({
        success: false,
        message: "Only one file is allowed per upload",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      logger.warn("File upload rejected: Unexpected file field", {
        userId: req.user?.userId,
        productId: req.params.productId,
      });
      return res.status(400).json({
        success: false,
        message: "Unexpected file field name",
      });
    }

    logger.error("Multer error", {
      error: error.message,
      code: error.code,
      userId: req.user?.userId,
    });
    return res.status(400).json({
      success: false,
      message: `File upload error: ${error.message}`,
    });
  }

  // Handle file filter errors
  if (error.message && error.message.includes("Invalid file")) {
    logger.warn("File upload rejected: Validation failed", {
      error: error.message,
      userId: req.user?.userId,
    });
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // Pass other errors to global error handler
  next(error);
};

/**
 * Middleware for single product image upload
 * Use this middleware in routes that need to upload product images
 * 
 * Example usage:
 * router.post('/products/:productId/image', 
 *   authenticate, 
 *   authorizeRoles(ADMIN, MANAGER),
 *   productImageUpload.single('image'),
 *   handleMulterError,
 *   uploadProductImage
 * );
 */
export const uploadProductImage = productImageUpload.single("image");

/**
 * Get upload directories (for service layer)
 */
export const getUploadDirectories = () => ({
  baseDir: UPLOAD_BASE_DIR,
  productImagesDir: PRODUCT_IMAGES_DIR,
});

/**
 * Get product images directory path
 * For use in static file serving
 */
export const getProductImagesPath = () => PRODUCT_IMAGES_DIR;

export default {
  uploadProductImage,
  handleMulterError,
  getUploadDirectories,
  getProductImagesPath,
};
