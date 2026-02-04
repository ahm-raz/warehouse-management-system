import fs from "fs";
import path from "path";
import logger from "../logs/logger.js";
import { getProductImagesPath } from "../config/multer.js";

/**
 * File Upload Service
 * Business logic for file upload operations
 * Handles file validation, metadata extraction, and file management
 */

/**
 * Validate uploaded file exists
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} - True if file exists
 */
export const validateFileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    logger.warn("File validation failed: File does not exist", {
      filePath: filePath,
      error: error.message,
    });
    return false;
  }
};

/**
 * Get file metadata
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - File metadata
 */
export const getFileMetadata = async (filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    return {
      fileName: fileName,
      filePath: filePath,
      size: stats.size,
      extension: ext,
      mimeType: getMimeTypeFromExtension(ext),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  } catch (error) {
    logger.error("Failed to get file metadata", {
      filePath: filePath,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension (e.g., '.jpg')
 * @returns {string} - MIME type
 */
const getMimeTypeFromExtension = (extension) => {
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };

  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
};

/**
 * Generate file URL for client access
 * @param {string} fileName - Filename
 * @returns {string} - Public URL path
 */
export const generateFileUrl = (fileName) => {
  // Public URL path for static file serving
  // Example: /uploads/products/images/filename.jpg
  return `/uploads/products/images/${fileName}`;
};

/**
 * Delete file safely
 * Used when replacing product images or cleaning up failed uploads
 * 
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<boolean>} - True if file was deleted successfully
 */
export const deleteFile = async (filePath) => {
  try {
    // Validate file exists before attempting deletion
    const exists = await validateFileExists(filePath);
    if (!exists) {
      logger.warn("File deletion skipped: File does not exist", {
        filePath: filePath,
      });
      return false;
    }

    // Delete file
    await fs.promises.unlink(filePath);
    logger.info("File deleted successfully", {
      filePath: filePath,
    });
    return true;
  } catch (error) {
    logger.error("Failed to delete file", {
      filePath: filePath,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Delete old product image if it exists
 * Used when replacing product images
 * 
 * @param {string} oldImageUrl - Old image URL from product record
 * @returns {Promise<boolean>} - True if old image was deleted
 */
export const deleteOldProductImage = async (oldImageUrl) => {
  try {
    if (!oldImageUrl) {
      return false;
    }

    // Extract filename from URL
    // URL format: /uploads/products/images/filename.jpg
    const fileName = path.basename(oldImageUrl);
    const oldFilePath = path.join(getProductImagesPath(), fileName);

    // Delete old file
    return await deleteFile(oldFilePath);
  } catch (error) {
    logger.error("Failed to delete old product image", {
      oldImageUrl: oldImageUrl,
      error: error.message,
    });
    // Don't throw - old file deletion failure shouldn't break new upload
    return false;
  }
};

/**
 * Process uploaded file and return metadata
 * Main function for handling successful file uploads
 * 
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - File metadata and URL
 */
export const processUploadedFile = async (file) => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file exists
    const exists = await validateFileExists(file.path);
    if (!exists) {
      throw new Error("Uploaded file does not exist");
    }

    // Get file metadata
    const metadata = await getFileMetadata(file.path);

    // Generate public URL
    const fileUrl = generateFileUrl(metadata.fileName);

    logger.info("File processed successfully", {
      fileName: metadata.fileName,
      size: metadata.size,
      mimeType: metadata.mimeType,
    });

    return {
      fileName: metadata.fileName,
      filePath: metadata.filePath,
      fileUrl: fileUrl,
      size: metadata.size,
      mimeType: metadata.mimeType,
      extension: metadata.extension,
    };
  } catch (error) {
    logger.error("Failed to process uploaded file", {
      error: error.message,
      stack: error.stack,
      file: file?.filename,
    });
    throw error;
  }
};

/**
 * Clean up failed upload file
 * Deletes file if upload process fails
 * 
 * @param {string} filePath - Path to the file to clean up
 */
export const cleanupFailedUpload = async (filePath) => {
  try {
    if (filePath) {
      await deleteFile(filePath);
      logger.info("Cleaned up failed upload file", {
        filePath: filePath,
      });
    }
  } catch (error) {
    logger.error("Failed to cleanup failed upload", {
      filePath: filePath,
      error: error.message,
    });
    // Don't throw - cleanup failure is not critical
  }
};
