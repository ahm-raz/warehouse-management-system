import mongoose from "mongoose";

/**
 * Category Model
 * Warehouse Management System category schema
 * Supports hierarchical category structure with parent-child relationships
 */

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [100, "Category name cannot exceed 100 characters"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// Compound index for name uniqueness within parent category
categorySchema.index({ name: 1, parentCategory: 1, isDeleted: 1 }, {
  unique: true,
  partialFilterExpression: { isDeleted: false },
});

// Index for hierarchical queries
categorySchema.index({ parentCategory: 1, isDeleted: 1 });

// ==================== VALIDATION ====================

/**
 * Pre-save hook to validate parent category
 * Prevents circular references and validates parent exists
 */
categorySchema.pre("save", async function (next) {
  // Skip validation if parentCategory is not set or unchanged
  if (!this.parentCategory || !this.isModified("parentCategory")) {
    return next();
  }

  // Prevent self-reference
  if (this.parentCategory.toString() === this._id.toString()) {
    return next(new Error("Category cannot be its own parent"));
  }

  // Check if parent category exists and is not deleted
  const parent = await mongoose.model("Category").findOne({
    _id: this.parentCategory,
    isDeleted: false,
  });

  if (!parent) {
    return next(new Error("Parent category not found or has been deleted"));
  }

  // Check for circular reference by traversing up the tree
  let currentParentId = parent.parentCategory;
  const visitedIds = new Set([this._id.toString()]);

  while (currentParentId) {
    const parentIdStr = currentParentId.toString();

    // If we encounter this category in the parent chain, it's circular
    if (visitedIds.has(parentIdStr)) {
      return next(new Error("Circular reference detected in category hierarchy"));
    }

    visitedIds.add(parentIdStr);

    const currentParent = await mongoose.model("Category").findById(currentParentId);
    if (!currentParent || currentParent.isDeleted) {
      break;
    }

    currentParentId = currentParent.parentCategory;
  }

  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Soft delete category
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
categorySchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

/**
 * Check if category has child categories
 * @returns {Promise<boolean>} - True if category has children
 */
categorySchema.methods.hasChildren = async function () {
  const childCount = await mongoose.model("Category").countDocuments({
    parentCategory: this._id,
    isDeleted: false,
  });
  return childCount > 0;
};

/**
 * Get all child categories recursively
 * @returns {Promise<Array>} - Array of all descendant category IDs
 */
categorySchema.methods.getAllDescendants = async function () {
  const descendants = [];
  const children = await mongoose.model("Category").find({
    parentCategory: this._id,
    isDeleted: false,
  }).select("_id");

  for (const child of children) {
    descendants.push(child._id);
    const childDescendants = await child.getAllDescendants();
    descendants.push(...childDescendants);
  }

  return descendants;
};

// ==================== STATIC METHODS ====================

/**
 * Query helper to exclude deleted categories
 * Can be chained with other query methods
 */
categorySchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted categories
 * For admin operations that need to see all categories
 */
categorySchema.query.includeDeleted = function () {
  return this;
};

/**
 * Build category tree structure
 * Recursively builds nested category hierarchy
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Nested category tree
 */
categorySchema.statics.buildCategoryTree = async function (options = {}) {
  const query = { isDeleted: false };

  // If rootOnly is true, only return top-level categories
  if (options.rootOnly !== false) {
    query.parentCategory = null;
  }

  const categories = await this.find(query)
    .select("name description parentCategory _id")
    .sort({ name: 1 })
    .lean();

  // Build tree structure recursively
  const buildTree = (parentId = null) => {
    return categories
      .filter((cat) => {
        if (parentId === null) {
          return !cat.parentCategory;
        }
        return cat.parentCategory && cat.parentCategory.toString() === parentId.toString();
      })
      .map((cat) => ({
        _id: cat._id,
        name: cat.name,
        description: cat.description,
        parentCategory: cat.parentCategory,
        children: buildTree(cat._id),
      }));
  };

  return buildTree();
};

const Category = mongoose.model("Category", categorySchema);

export default Category;
