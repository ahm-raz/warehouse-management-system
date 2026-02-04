import mongoose from "mongoose";
import Location from "../models/Location.js";
import Product from "../models/Product.js";
import ApiError from "../utils/ApiError.js";
import logger from "../logs/logger.js";
import { getSocket } from "../config/socket.js";

/**
 * Location Management Service
 * Business logic for location operations
 * Handles CRUD operations, hierarchy management, occupancy tracking, and product assignment
 */

/**
 * Update location occupancy
 * Recalculates occupancy based on products assigned to location
 * @param {string} locationId - Location ID
 * @returns {Promise<void>}
 */
const updateLocationOccupancy = async (locationId) => {
  const location = await Location.findById(locationId);

  if (!location) {
    return;
  }

  // Calculate total quantity of products in this location
  const products = await Product.find({
    storageLocation: locationId,
    isDeleted: false,
  }).select("quantity");

  const totalQuantity = products.reduce((sum, product) => sum + (product.quantity || 0), 0);

  // Update occupancy
  location.currentOccupancy = totalQuantity;

  // Validate capacity constraint
  if (location.capacity !== null && location.capacity !== undefined) {
    if (location.currentOccupancy > location.capacity) {
      logger.warn("Location occupancy exceeds capacity", {
        locationId: locationId,
        currentOccupancy: location.currentOccupancy,
        capacity: location.capacity,
      });
      // Don't throw error - just log warning (capacity validation happens on save)
    }
  }

  await location.save();

  logger.debug("Location occupancy updated", {
    locationId: locationId,
    fullPath: location.getFullPath(),
    occupancy: location.currentOccupancy,
    capacity: location.capacity,
  });
};

/**
 * Create a new location
 * @param {Object} locationData - Location creation data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Created location
 */
export const createLocation = async (locationData, performedBy) => {
  const { zone, rack, shelf, bin } = locationData;

  // Check for duplicate location (zone + rack + shelf + bin combination)
  const existingLocation = await Location.findByPath(zone, rack, shelf, bin);

  if (existingLocation) {
    logger.warn("Location creation attempt with duplicate path", {
      zone: zone,
      rack: rack,
      shelf: shelf,
      bin: bin,
      performedBy: performedBy,
    });
    throw new ApiError(409, "Location with this zone-rack-shelf-bin combination already exists");
  }

  // Create new location
  const location = new Location({
    ...locationData,
    zone: zone.toUpperCase(),
    currentOccupancy: 0,
  });

  await location.save();

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("locationCreated", {
      locationId: location._id.toString(),
      zone: location.zone,
      rack: location.rack,
      shelf: location.shelf,
      bin: location.bin,
      fullPath: location.getFullPath(),
      capacity: location.capacity,
      currentOccupancy: location.currentOccupancy,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit location created event", {
      error: socketError.message,
      locationId: location._id,
    });
  }

  logger.info("Location created", {
    locationId: location._id,
    fullPath: location.getFullPath(),
    performedBy: performedBy,
  });

  return location.toJSON();
};

/**
 * Get all locations with pagination and filtering
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated locations
 */
export const getLocations = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    zone,
    rack,
    occupancy,
    sortBy = "createdAt",
    order = "asc",
  } = queryParams;

  // Build query
  const query = { isDeleted: false };

  // Zone filter
  if (zone) {
    query.zone = zone.toUpperCase();
  }

  // Rack filter
  if (rack) {
    query.rack = rack;
  }

  // Occupancy filter
  if (occupancy === "available") {
    query.$or = [
      { capacity: null },
      { $expr: { $lt: ["$currentOccupancy", "$capacity"] } },
    ];
  } else if (occupancy === "full") {
    query.$expr = {
      $and: [
        { $ne: ["$capacity", null] },
        { $eq: ["$currentOccupancy", "$capacity"] },
      ],
    };
  } else if (occupancy === "partial") {
    query.$expr = {
      $and: [
        { $ne: ["$capacity", null] },
        { $gt: ["$currentOccupancy", 0] },
        { $lt: ["$currentOccupancy", "$capacity"] },
      ],
    };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  // Execute query
  const [locations, totalLocations] = await Promise.all([
    Location.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Location.countDocuments(query),
  ]);

  // Add fullPath to each location
  const locationsWithPath = locations.map((loc) => ({
    ...loc,
    fullPath: `${loc.zone}-${loc.rack}-${loc.shelf}-${loc.bin}`,
  }));

  const totalPages = Math.ceil(totalLocations / limit);

  return {
    locations: locationsWithPath,
    pagination: {
      totalLocations,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get location hierarchy tree
 * Returns nested structure: Zone → Rack → Shelf → Bin
 * @returns {Promise<Array>} - Location tree
 */
export const getLocationTree = async () => {
  const tree = await Location.buildLocationTree();
  return tree;
};

/**
 * Get location by ID
 * @param {string} locationId - Location ID
 * @returns {Promise<Object>} - Location object
 */
export const getLocationById = async (locationId) => {
  const location = await Location.findOne({
    _id: locationId,
    isDeleted: false,
  }).lean();

  if (!location) {
    throw new ApiError(404, "Location not found");
  }

  return {
    ...location,
    fullPath: `${location.zone}-${location.rack}-${location.shelf}-${location.bin}`,
  };
};

/**
 * Update location
 * @param {string} locationId - Location ID
 * @param {Object} updateData - Update data
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Updated location
 */
export const updateLocation = async (locationId, updateData, performedBy) => {
  const location = await Location.findOne({
    _id: locationId,
    isDeleted: false,
  });

  if (!location) {
    throw new ApiError(404, "Location not found");
  }

  // Store old values for logging
  const oldValues = {
    description: location.description,
    capacity: location.capacity,
  };

  // Validate capacity update
  if (updateData.capacity !== undefined) {
    const newCapacity = updateData.capacity;

    // Cannot set capacity lower than current occupancy
    if (newCapacity !== null && newCapacity < location.currentOccupancy) {
      throw new ApiError(
        400,
        `Cannot set capacity (${newCapacity}) lower than current occupancy (${location.currentOccupancy})`
      );
    }
  }

  // Update fields
  if (updateData.description !== undefined) {
    location.description = updateData.description;
  }
  if (updateData.capacity !== undefined) {
    location.capacity = updateData.capacity;
  }

  await location.save();

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("locationUpdated", {
      locationId: location._id.toString(),
      zone: location.zone,
      rack: location.rack,
      shelf: location.shelf,
      bin: location.bin,
      fullPath: location.getFullPath(),
      capacity: location.capacity,
      currentOccupancy: location.currentOccupancy,
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit location updated event", {
      error: socketError.message,
      locationId: location._id,
    });
  }

  logger.info("Location updated", {
    locationId: location._id,
    fullPath: location.getFullPath(),
    performedBy: performedBy,
  });

  return {
    ...location.toJSON(),
    fullPath: location.getFullPath(),
  };
};

/**
 * Assign product to location
 * Updates product storageLocation and location occupancy
 * @param {string} locationId - Location ID
 * @param {string} productId - Product ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Updated location and product
 */
export const assignProductToLocation = async (locationId, productId, performedBy) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find location
    const location = await Location.findOne({
      _id: locationId,
      isDeleted: false,
    }).session(session);

    if (!location) {
      throw new ApiError(404, "Location not found");
    }

    // Find product
    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
    }).session(session);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    // Check if product is already assigned to this location
    if (product.storageLocation?.toString() === locationId.toString()) {
      throw new ApiError(400, "Product is already assigned to this location");
    }

    // Get old location if product was assigned elsewhere
    let oldLocation = null;
    if (product.storageLocation) {
      oldLocation = await Location.findById(product.storageLocation).session(session);
    }

    // Check capacity availability
    if (!location.hasAvailableCapacity(product.quantity)) {
      throw new ApiError(
        400,
        `Location does not have sufficient capacity. Available: ${location.getAvailableCapacity()}, Required: ${product.quantity}`
      );
    }

    // Update product storage location
    product.storageLocation = locationId;
    await product.save({ session });

    // Update new location occupancy
    location.currentOccupancy += product.quantity;
    await location.save({ session });

    // Update old location occupancy if product was moved
    if (oldLocation && !oldLocation.isDeleted) {
      oldLocation.currentOccupancy = Math.max(0, oldLocation.currentOccupancy - product.quantity);
      await oldLocation.save({ session });
    }

    // Commit transaction
    await session.commitTransaction();

    // Emit Socket.io event
    try {
      const io = getSocket();
      io.emit("productAssignedToLocation", {
        locationId: location._id.toString(),
        productId: productId.toString(),
        zone: location.zone,
        rack: location.rack,
        shelf: location.shelf,
        bin: location.bin,
        fullPath: location.getFullPath(),
        productQuantity: product.quantity,
        newOccupancy: location.currentOccupancy,
        updatedBy: performedBy,
        timestamp: new Date().toISOString(),
      });

      io.emit("locationOccupancyUpdated", {
        locationId: location._id.toString(),
        zone: location.zone,
        rack: location.rack,
        shelf: location.shelf,
        bin: location.bin,
        fullPath: location.getFullPath(),
        occupancy: location.currentOccupancy,
        capacity: location.capacity,
        updatedBy: performedBy,
        timestamp: new Date().toISOString(),
      });
    } catch (socketError) {
      logger.error("Failed to emit product assignment event", {
        error: socketError.message,
        locationId: location._id,
        productId: productId,
      });
    }

    logger.info("Product assigned to location", {
      locationId: location._id,
      productId: productId,
      fullPath: location.getFullPath(),
      productQuantity: product.quantity,
      newOccupancy: location.currentOccupancy,
      performedBy: performedBy,
    });

    const populatedLocation = await Location.findById(location._id)
      .populate("storageLocation")
      .lean();

    return {
      location: {
        ...populatedLocation,
        fullPath: location.getFullPath(),
      },
      product: product.toJSON(),
    };
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();

    if (error instanceof ApiError) {
      throw error;
    }

    logger.error("Product assignment failed", {
      error: error.message,
      locationId: locationId,
      productId: productId,
      performedBy: performedBy,
    });

    throw new ApiError(500, "Failed to assign product to location");
  } finally {
    session.endSession();
  }
};

/**
 * Get products in location
 * @param {string} locationId - Location ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Paginated products
 */
export const getLocationProducts = async (locationId, queryParams) => {
  // Verify location exists
  const location = await Location.findById(locationId);
  if (!location) {
    throw new ApiError(404, "Location not found");
  }

  const { page = 1, limit = 20 } = queryParams;
  const skip = (page - 1) * limit;

  const [products, totalProducts] = await Promise.all([
    Product.find({
      storageLocation: locationId,
      isDeleted: false,
    })
      .populate("category", "name")
      .populate("supplier", "name")
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments({
      storageLocation: locationId,
      isDeleted: false,
    }),
  ]);

  const totalPages = Math.ceil(totalProducts / limit);

  return {
    products,
    location: {
      _id: location._id,
      fullPath: location.getFullPath(),
      capacity: location.capacity,
      currentOccupancy: location.currentOccupancy,
    },
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
 * Soft delete location
 * @param {string} locationId - Location ID
 * @param {string} performedBy - User ID performing the action
 * @returns {Promise<Object>} - Deleted location
 */
export const deleteLocation = async (locationId, performedBy) => {
  const location = await Location.findOne({
    _id: locationId,
    isDeleted: false,
  });

  if (!location) {
    throw new ApiError(404, "Location not found");
  }

  // Check if location contains inventory
  const productCount = await Product.countDocuments({
    storageLocation: locationId,
    isDeleted: false,
  });

  if (productCount > 0) {
    logger.warn("Location deletion attempt with inventory", {
      locationId: locationId,
      fullPath: location.getFullPath(),
      productCount: productCount,
      performedBy: performedBy,
    });
    throw new ApiError(
      400,
      `Cannot delete location. ${productCount} product(s) are stored in this location. Please reassign products to another location first.`
    );
  }

  // Soft delete
  await location.softDelete();

  // Emit Socket.io event
  try {
    const io = getSocket();
    io.emit("locationDeleted", {
      locationId: location._id.toString(),
      zone: location.zone,
      rack: location.rack,
      shelf: location.shelf,
      bin: location.bin,
      fullPath: location.getFullPath(),
      updatedBy: performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit location deleted event", {
      error: socketError.message,
      locationId: location._id,
    });
  }

  logger.info("Location deleted (soft delete)", {
    locationId: location._id,
    fullPath: location.getFullPath(),
    performedBy: performedBy,
  });

  return {
    ...location.toJSON(),
    fullPath: location.getFullPath(),
  };
};

/**
 * Recalculate location occupancy
 * Utility function to update occupancy for a location
 * Called when inventory changes for products in the location
 * @param {string} locationId - Location ID
 * @returns {Promise<void>}
 */
export const recalculateLocationOccupancy = async (locationId) => {
  await updateLocationOccupancy(locationId);

  const location = await Location.findById(locationId);
  if (location) {
    // Emit Socket.io event
    try {
      const io = getSocket();
      io.emit("locationOccupancyUpdated", {
        locationId: location._id.toString(),
        zone: location.zone,
        rack: location.rack,
        shelf: location.shelf,
        bin: location.bin,
        fullPath: location.getFullPath(),
        occupancy: location.currentOccupancy,
        capacity: location.capacity,
        timestamp: new Date().toISOString(),
      });
    } catch (socketError) {
      logger.error("Failed to emit location occupancy updated event", {
        error: socketError.message,
        locationId: location._id,
      });
    }
  }
};
