import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import Product from "../models/Product.js";
import {
  processUploadedFile,
  deleteOldProductImage,
  cleanupFailedUpload,
} from "../services/fileUploadService.js";
import { validateProductId } from "../validators/uploadValidator.js";
import logger from "../logs/logger.js";
import { getSocket } from "../sockets/index.js";

/**
 * File Upload Controller
 * Handles HTTP requests and responses for file upload endpoints
 */

/**
 * @route   POST /api/uploads/products/:productId/image
 * @desc    Upload product image
 * @access  Private (Admin, Manager)
 */
export const uploadProductImageHandler = asyncHandler(async (req, res) => {
  const performedBy = req.user?.userId;
  const { productId } = req.params;

  if (!performedBy) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate product ID
  const validatedProductId = validateProductId(productId);

  // Check if file was uploaded
  if (!req.file) {
    throw new ApiError(400, "No image file provided. Please upload an image file.");
  }

  // Validate product exists and is not deleted
  const product = await Product.findById(validatedProductId).notDeleted();

  if (!product) {
    // Clean up uploaded file if product doesn't exist
    await cleanupFailedUpload(req.file.path);
    throw new ApiError(404, "Product not found");
  }

  let oldImageUrl = null;
  let uploadedFileData = null;

  try {
    // Store old image URL for cleanup
    oldImageUrl = product.imageUrl;

    // Process uploaded file
    uploadedFileData = await processUploadedFile(req.file);

    // Update product with new image URL
    product.imageUrl = uploadedFileData.fileUrl;
    await product.save();

    // Delete old image if it exists (non-blocking)
    if (oldImageUrl) {
      try {
        await deleteOldProductImage(oldImageUrl);
        logger.info("Old product image deleted", {
          productId: validatedProductId,
          oldImageUrl: oldImageUrl,
        });
      } catch (deleteError) {
        // Log but don't fail the upload if old image deletion fails
        logger.warn("Failed to delete old product image", {
          productId: validatedProductId,
          oldImageUrl: oldImageUrl,
          error: deleteError.message,
        });
      }
    }

    // Emit socket event (optional, non-blocking)
    try {
      const io = getSocket();
      io.emit("productImageUploaded", {
        productId: validatedProductId,
        imageUrl: uploadedFileData.fileUrl,
        uploadedBy: performedBy,
        timestamp: new Date().toISOString(),
      });
      logger.debug("Product image upload event emitted", {
        productId: validatedProductId,
      });
    } catch (socketError) {
      // Log but don't fail the upload if socket emission fails
      logger.error("Failed to emit product image upload event", {
        error: socketError.message,
        productId: validatedProductId,
      });
    }

    logger.info("Product image uploaded successfully", {
      productId: validatedProductId,
      fileName: uploadedFileData.fileName,
      fileSize: uploadedFileData.size,
      uploadedBy: performedBy,
      oldImageReplaced: !!oldImageUrl,
    });

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        imageUrl: uploadedFileData.fileUrl,
        fileName: uploadedFileData.fileName,
        size: uploadedFileData.size,
        mimeType: uploadedFileData.mimeType,
      },
    });
  } catch (error) {
    // Clean up uploaded file if update fails
    if (uploadedFileData?.filePath) {
      await cleanupFailedUpload(uploadedFileData.filePath);
    }

    logger.error("Failed to upload product image", {
      error: error.message,
      stack: error.stack,
      productId: validatedProductId,
      uploadedBy: performedBy,
    });

    throw error;
  }
});
