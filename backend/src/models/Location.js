import mongoose from "mongoose";

/**
 * Location Model
 * Warehouse Management System storage location schema
 * Supports hierarchical warehouse structure: Zone → Rack → Shelf → Bin
 * Single warehouse architecture
 */

const locationSchema = new mongoose.Schema(
  {
    zone: {
      type: String,
      required: [true, "Zone is required"],
      trim: true,
      uppercase: true,
      maxlength: [50, "Zone cannot exceed 50 characters"],
      index: true,
    },
    rack: {
      type: String,
      required: [true, "Rack is required"],
      trim: true,
      maxlength: [50, "Rack cannot exceed 50 characters"],
      index: true,
    },
    shelf: {
      type: String,
      required: [true, "Shelf is required"],
      trim: true,
      maxlength: [50, "Shelf cannot exceed 50 characters"],
      index: true,
    },
    bin: {
      type: String,
      required: [true, "Bin is required"],
      trim: true,
      maxlength: [50, "Bin cannot exceed 50 characters"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    capacity: {
      type: Number,
      min: [0, "Capacity cannot be negative"],
      default: null,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: [0, "Current occupancy cannot be negative"],
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

// Compound unique index for zone + rack + shelf + bin combination
locationSchema.index(
  { zone: 1, rack: 1, shelf: 1, bin: 1, isDeleted: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// Compound indexes for efficient querying
locationSchema.index({ zone: 1, isDeleted: 1 }); // For zone filtering
locationSchema.index({ rack: 1, isDeleted: 1 }); // For rack filtering
locationSchema.index({ shelf: 1, isDeleted: 1 }); // For shelf filtering
locationSchema.index({ currentOccupancy: 1, isDeleted: 1 }); // For occupancy queries

// ==================== VALIDATION ====================

/**
 * Pre-save hook to validate capacity constraints
 * Ensures currentOccupancy never exceeds capacity
 */
locationSchema.pre("save", async function (next) {
  // If capacity is set, ensure occupancy doesn't exceed it
  if (this.capacity !== null && this.capacity !== undefined) {
    if (this.currentOccupancy > this.capacity) {
      return next(
        new Error(
          `Current occupancy (${this.currentOccupancy}) cannot exceed capacity (${this.capacity})`
        )
      );
    }
  }

  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Get full location path
 * Returns formatted location string (Zone-Rack-Shelf-Bin)
 * @returns {string} - Full location path
 */
locationSchema.methods.getFullPath = function () {
  return `${this.zone}-${this.rack}-${this.shelf}-${this.bin}`;
};

/**
 * Check if location has available capacity
 * @param {number} additionalQuantity - Additional quantity to check
 * @returns {boolean} - True if location can accommodate additional quantity
 */
locationSchema.methods.hasAvailableCapacity = function (additionalQuantity = 0) {
  if (this.capacity === null || this.capacity === undefined) {
    return true; // No capacity limit
  }
  return this.currentOccupancy + additionalQuantity <= this.capacity;
};

/**
 * Get available capacity
 * @returns {number|null} - Available capacity or null if unlimited
 */
locationSchema.methods.getAvailableCapacity = function () {
  if (this.capacity === null || this.capacity === undefined) {
    return null; // Unlimited
  }
  return Math.max(0, this.capacity - this.currentOccupancy);
};

/**
 * Soft delete location
 * Sets isDeleted flag and deletedAt timestamp
 * @returns {Promise<void>}
 */
locationSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Query helper to exclude deleted locations
 * Can be chained with other query methods
 */
locationSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

/**
 * Query helper to include deleted locations
 * For admin operations that need to see all locations
 */
locationSchema.query.includeDeleted = function () {
  return this;
};

/**
 * Build location hierarchy tree
 * Returns nested structure: Zone → Rack → Shelf → Bin
 * @returns {Promise<Array>} - Nested location tree
 */
locationSchema.statics.buildLocationTree = async function () {
  const locations = await this.find({ isDeleted: false })
    .select("zone rack shelf bin description capacity currentOccupancy _id")
    .sort({ zone: 1, rack: 1, shelf: 1, bin: 1 })
    .lean();

  // Build tree structure
  const tree = {};

  for (const location of locations) {
    // Initialize zone if not exists
    if (!tree[location.zone]) {
      tree[location.zone] = {};
    }

    // Initialize rack if not exists
    if (!tree[location.zone][location.rack]) {
      tree[location.zone][location.rack] = {};
    }

    // Initialize shelf if not exists
    if (!tree[location.zone][location.rack][location.shelf]) {
      tree[location.zone][location.rack][location.shelf] = [];
    }

    // Add bin to shelf
    tree[location.zone][location.rack][location.shelf].push({
      _id: location._id,
      bin: location.bin,
      description: location.description,
      capacity: location.capacity,
      currentOccupancy: location.currentOccupancy,
      fullPath: `${location.zone}-${location.rack}-${location.shelf}-${location.bin}`,
    });
  }

  // Convert to array format
  const result = Object.keys(tree).map((zone) => {
    const racks = Object.keys(tree[zone]).map((rack) => {
      const shelves = Object.keys(tree[zone][rack]).map((shelf) => ({
        shelf: shelf,
        bins: tree[zone][rack][shelf],
      }));

      return {
        rack: rack,
        shelves: shelves,
      };
    });

    return {
      zone: zone,
      racks: racks,
    };
  });

  return result;
};

/**
 * Find location by full path
 * @param {string} zone - Zone
 * @param {string} rack - Rack
 * @param {string} shelf - Shelf
 * @param {string} bin - Bin
 * @returns {Promise<Object>} - Location document
 */
locationSchema.statics.findByPath = function (zone, rack, shelf, bin) {
  return this.findOne({
    zone: zone.toUpperCase(),
    rack: rack,
    shelf: shelf,
    bin: bin,
    isDeleted: false,
  });
};

const Location = mongoose.model("Location", locationSchema);

export default Location;
