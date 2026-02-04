import Product from "../models/Product.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import mongoose from "mongoose";

/**
 * Product Management Service
 * Business logic for product operations
 * Handles CRUD operations and product lifecycle management
 */

/**
 * Create a new product
 * @param {Object} productData - Product creation data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Created product
 */
export const createProduct = async (productData, performedBy) => {
  const { SKU } = productData;

  // Check if SKU already exists (excluding deleted products)
  const existingProduct = await Product.findOne({
    SKU: SKU.toUpperCase(),
    isDeleted: false,
  });

  if (existingProduct) {
    logger.warn("Product creation attempt with existing SKU", {
      SKU: SKU.toUpperCase(),
      performedBy: performedBy,
    });
    throw new ApiError(409, "SKU already exists");
  }

  // Create new product
  const product = new Product({
    ...productData,
    SKU: SKU.toUpperCase(),
  });

  await product.save();

  logger.info("Product created", {
    productId: product._id,
    SKU: product.SKU,
    name: product.name,
    performedBy: performedBy,
  });

  return product.toJSON();
};

/**
 * Get all products with pagination and filtering
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated products
 */
export const getProducts = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    category,
    supplier,
    lowStockOnly = false,
    sortBy = "createdAt",
    order = "desc",
  } = queryParams;

  // Build query
  const query = { isDeleted: false };

  // Search filter (name or SKU)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { SKU: { $regex: search, $options: "i" } },
    ];
  }

  // Category filter
  if (category) {
    query.category = new mongoose.Types.ObjectId(category);
  }

  // Supplier filter
  if (supplier) {
    query.supplier = new mongoose.Types.ObjectId(supplier);
  }

  // Low stock filter
  if (lowStockOnly) {
    query.$expr = {
      $lte: ["$quantity", "$minimumStockLevel"],
    };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  // Execute query
  const [products, totalProducts] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
      .populate("supplier", "name")
      .populate("storageLocation", "name")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalProducts / limit);

  return {
    products,
    pagination: {
      totalProducts,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - Product object
 */
export const getProductById = async (productId) => {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  })
    .populate("category", "name")
    .populate("supplier", "name")
    .populate("storageLocation", "name")
    .lean();

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

/**
 * Update product
 * @param {string} productId - Product ID
 * @param {Object} updateData - Update data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Updated product
 */
export const updateProduct = async (productId, updateData, performedBy) => {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if SKU is being changed and if it's already taken
  if (updateData.SKU && updateData.SKU.toUpperCase() !== product.SKU) {
    const existingProduct = await Product.findOne({
      SKU: updateData.SKU.toUpperCase(),
      isDeleted: false,
      _id: { $ne: productId },
    });

    if (existingProduct) {
      throw new ApiError(409, "SKU already exists");
    }

    updateData.SKU = updateData.SKU.toUpperCase();
  }

  // Update fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      product[key] = updateData[key];
    }
  });

  await product.save();

  logger.info("Product updated", {
    productId: product._id,
    SKU: product.SKU,
    name: product.name,
    performedBy: performedBy,
  });

  return product.toJSON();
};

/**
 * Soft delete product
 * @param {string} productId - Product ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Deleted product
 */
export const deleteProduct = async (productId, performedBy) => {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // TODO: Check for active orders before deletion
  // For now, we'll allow deletion but log it

  // Soft delete
  await product.softDelete();

  logger.info("Product deleted (soft delete)", {
    productId: product._id,
    SKU: product.SKU,
    name: product.name,
    performedBy: performedBy,
  });

  return product.toJSON();
};

/**
 * Get low stock products
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Products with low stock
 */
export const getLowStockProducts = async (options = {}) => {
  const products = await Product.findLowStock(options)
    .populate("category", "name")
    .populate("supplier", "name")
    .lean();

  return products;
};
