import Category from "../models/Category.js";
import Product from "../models/Product.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import mongoose from "mongoose";
import { getSocket } from "../config/socket.js";

/**
 * Category Management Service
 * Business logic for category operations
 * Handles CRUD operations, hierarchical structure, and dependency checks
 */

/**
 * Check for circular parent reference
 * Prevents assigning a category as parent that would create a cycle
 * @param {string} categoryId - Category ID
 * @param {string} newParentId - New parent category ID
 * @returns {Promise<boolean>} - True if circular reference would occur
 */
const checkCircularReference = async (categoryId, newParentId) => {
  if (!newParentId) {
    return false; // No parent means no circular reference
  }

  if (categoryId.toString() === newParentId.toString()) {
    return true; // Self-reference
  }

  // Traverse up the parent chain from newParentId
  let currentParentId = newParentId;
  const visitedIds = new Set([categoryId.toString()]);

  while (currentParentId) {
    const parentIdStr = currentParentId.toString();

    // If we encounter the category in the parent chain, it's circular
    if (visitedIds.has(parentIdStr)) {
      return true;
    }

    visitedIds.add(parentIdStr);

    const parent = await Category.findById(currentParentId);
    if (!parent || parent.isDeleted || !parent.parentCategory) {
      break;
    }

    currentParentId = parent.parentCategory;
  }

  return false;
};

/**
 * Create a new category
 * @param {Object} categoryData - Category creation data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Created category
 */
export const createCategory = async (categoryData, performedBy) => {
  const { name, parentCategory } = categoryData;

  // Check for duplicate name under same parent
  const existingCategory = await Category.findOne({
    name: name.trim(),
    parentCategory: parentCategory || null,
    isDeleted: false,
  });

  if (existingCategory) {
    logger.warn("Category creation attempt with duplicate name", {
      name: name.trim(),
      parentCategory: parentCategory,
      performedBy: performedBy,
    });
    throw new ApiError(409, "Category name already exists under this parent category");
  }

  // Validate parent category if provided
  if (parentCategory) {
    const parent = await Category.findOne({
      _id: parentCategory,
      isDeleted: false,
    });

    if (!parent) {
      throw new ApiError(404, "Parent category not found or has been deleted");
    }
  }

  // Create new category
  const category = new Category({
    ...categoryData,
    name: name.trim(),
  });

  await category.save();

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("categoryCreated", {
      categoryId: category._id.toString(),
      categoryName: category.name,
      parentCategory: category.parentCategory?.toString() || null,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit category created event", {
      error: socketError.message,
      categoryId: category._id,
    });
  }

  logger.info("Category created", {
    categoryId: category._id,
    name: category.name,
    parentCategory: category.parentCategory,
    performedBy: performedBy,
  });

  return category.toJSON();
};

/**
 * Get all categories with pagination and filtering
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated categories
 */
export const getCategories = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    parentCategory,
    sortBy = "name",
    order = "asc",
  } = queryParams;

  // Build query
  const query = { isDeleted: false };

  // Search filter (name)
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  // Parent category filter
  if (parentCategory !== undefined && parentCategory !== null && parentCategory !== "") {
    query.parentCategory = new mongoose.Types.ObjectId(parentCategory);
  } else if (parentCategory === null || parentCategory === "") {
    // Explicitly filter for root categories (no parent)
    query.parentCategory = null;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  // Execute query
  const [categories, totalCategories] = await Promise.all([
    Category.find(query)
      .populate("parentCategory", "name _id")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Category.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCategories / limit);

  return {
    categories,
    pagination: {
      totalCategories,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get category tree structure
 * Returns hierarchical nested category structure
 * @returns {Promise<Array>} - Category tree
 */
export const getCategoryTree = async () => {
  const tree = await Category.buildCategoryTree({ rootOnly: true });
  return tree;
};

/**
 * Get category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} - Category object
 */
export const getCategoryById = async (categoryId) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: false,
  })
    .populate("parentCategory", "name _id")
    .lean();

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return category;
};

/**
 * Update category
 * @param {string} categoryId - Category ID
 * @param {Object} updateData - Update data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Updated category
 */
export const updateCategory = async (categoryId, updateData, performedBy) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: false,
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Check for circular reference if parentCategory is being updated
  if (updateData.parentCategory !== undefined) {
    const newParentId = updateData.parentCategory || null;

    // Prevent self-reference
    if (newParentId && newParentId.toString() === categoryId.toString()) {
      logger.warn("Category update attempt with self-reference", {
        categoryId: categoryId,
        performedBy: performedBy,
      });
      throw new ApiError(400, "Category cannot be its own parent");
    }

    // Check for circular reference
    if (newParentId) {
      const isCircular = await checkCircularReference(categoryId, newParentId);
      if (isCircular) {
        logger.warn("Category update attempt with circular reference", {
          categoryId: categoryId,
          newParentId: newParentId,
          performedBy: performedBy,
        });
        throw new ApiError(400, "Circular reference detected. Cannot assign this parent category");
      }

      // Validate parent exists
      const parent = await Category.findOne({
        _id: newParentId,
        isDeleted: false,
      });

      if (!parent) {
        throw new ApiError(404, "Parent category not found or has been deleted");
      }
    }
  }

  // Check for duplicate name if name is being updated
  if (updateData.name) {
    const parentId = updateData.parentCategory !== undefined
      ? (updateData.parentCategory || null)
      : (category.parentCategory || null);

    const existingCategory = await Category.findOne({
      name: updateData.name.trim(),
      parentCategory: parentId,
      isDeleted: false,
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      throw new ApiError(409, "Category name already exists under this parent category");
    }

    updateData.name = updateData.name.trim();
  }

  // Update fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      category[key] = updateData[key];
    }
  });

  await category.save();

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("categoryUpdated", {
      categoryId: category._id.toString(),
      categoryName: category.name,
      parentCategory: category.parentCategory?.toString() || null,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit category updated event", {
      error: socketError.message,
      categoryId: category._id,
    });
  }

  logger.info("Category updated", {
    categoryId: category._id,
    name: category.name,
    performedBy: performedBy,
  });

  return category.toJSON();
};

/**
 * Soft delete category
 * @param {string} categoryId - Category ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Deleted category
 */
export const deleteCategory = async (categoryId, performedBy) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: false,
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Check if category has child categories
  const hasChildren = await category.hasChildren();
  if (hasChildren) {
    logger.warn("Category deletion attempt with child categories", {
      categoryId: categoryId,
      name: category.name,
      performedBy: performedBy,
    });
    throw new ApiError(
      400,
      "Cannot delete category. It has child categories. Please delete or move child categories first."
    );
  }

  // Check if any products use this category
  const productCount = await Product.countDocuments({
    category: categoryId,
    isDeleted: false,
  });

  if (productCount > 0) {
    logger.warn("Category deletion attempt with linked products", {
      categoryId: categoryId,
      name: category.name,
      productCount: productCount,
      performedBy: performedBy,
    });
    throw new ApiError(
      400,
      `Cannot delete category. ${productCount} product(s) are using this category. Please reassign products to another category first.`
    );
  }

  // Soft delete
  await category.softDelete();

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("categoryDeleted", {
      categoryId: category._id.toString(),
      categoryName: category.name,
      parentCategory: category.parentCategory?.toString() || null,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit category deleted event", {
      error: socketError.message,
      categoryId: category._id,
    });
  }

  logger.info("Category deleted (soft delete)", {
    categoryId: category._id,
    name: category.name,
    performedBy: performedBy,
  });

  return category.toJSON();
};
