import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Location from "../models/Location.js";
import Order from "../models/Order.js";
import Receiving from "../models/Receiving.js";
import Supplier from "../models/Supplier.js";
import Task from "../models/Task.js";
import logger from "../logs/logger.js";
import { getSocket } from "../sockets/index.js";

/**
 * Report Service
 * Business logic for generating analytics and reports
 * Uses MongoDB aggregation pipelines for efficient data processing
 */

/**
 * Build date filter for aggregation pipelines
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} - MongoDB date filter
 */
const buildDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      // Set end date to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  return filter;
};

/**
 * Generate inventory summary report
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Inventory summary report
 */
export const generateInventorySummary = async (queryParams) => {
  const startTime = Date.now();
  const { startDate, endDate, category, supplier, location } = queryParams;

  try {
    // Build base filter
    const baseFilter = {
      isDeleted: false,
      ...buildDateFilter(startDate, endDate),
    };

    if (category) {
      baseFilter.category = new mongoose.Types.ObjectId(category);
    }
    if (supplier) {
      baseFilter.supplier = new mongoose.Types.ObjectId(supplier);
    }
    if (location) {
      baseFilter.storageLocation = new mongoose.Types.ObjectId(location);
    }

    // Aggregation pipeline for inventory summary
    const summaryPipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalValue: {
            $sum: { $multiply: ["$quantity", "$unitPrice"] },
          },
          averageQuantity: { $avg: "$quantity" },
          averagePrice: { $avg: "$unitPrice" },
        },
      },
    ];

    // Category-wise breakdown
    const categoryPipeline = [
      { $match: baseFilter },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category",
          categoryName: { $first: "$categoryInfo.name" },
          productCount: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalValue: {
            $sum: { $multiply: ["$quantity", "$unitPrice"] },
          },
        },
      },
      { $sort: { totalValue: -1 } },
    ];

    // Location-wise breakdown
    const locationPipeline = [
      { $match: baseFilter },
      {
        $lookup: {
          from: "locations",
          localField: "storageLocation",
          foreignField: "_id",
          as: "locationInfo",
        },
      },
      { $unwind: { path: "$locationInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$storageLocation",
          locationPath: {
            $first: {
              $concat: [
                { $ifNull: ["$locationInfo.zone", ""] },
                "-",
                { $ifNull: ["$locationInfo.rack", ""] },
                "-",
                { $ifNull: ["$locationInfo.shelf", ""] },
                "-",
                { $ifNull: ["$locationInfo.bin", ""] },
              ],
            },
          },
          productCount: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalValue: {
            $sum: { $multiply: ["$quantity", "$unitPrice"] },
          },
        },
      },
      { $sort: { totalValue: -1 } },
    ];

    // Execute aggregations
    const [summary, categoryBreakdown, locationBreakdown] = await Promise.all([
      Product.aggregate(summaryPipeline),
      Product.aggregate(categoryPipeline),
      Product.aggregate(locationPipeline),
    ]);

    const executionTime = Date.now() - startTime;

    logger.info("Inventory summary report generated", {
      executionTime: `${executionTime}ms`,
      filters: { category, supplier, location, startDate, endDate },
    });

    return {
      summary: summary[0] || {
        totalProducts: 0,
        totalQuantity: 0,
        totalValue: 0,
        averageQuantity: 0,
        averagePrice: 0,
      },
      categoryBreakdown: categoryBreakdown.map((item) => ({
        categoryId: item._id?.toString() || null,
        categoryName: item.categoryName || "Uncategorized",
        productCount: item.productCount,
        totalQuantity: item.totalQuantity,
        totalValue: parseFloat(item.totalValue.toFixed(2)),
      })),
      locationBreakdown: locationBreakdown.map((item) => ({
        locationId: item._id?.toString() || null,
        locationPath: item.locationPath || "Unassigned",
        productCount: item.productCount,
        totalQuantity: item.totalQuantity,
        totalValue: parseFloat(item.totalValue.toFixed(2)),
      })),
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        category: category || null,
        supplier: supplier || null,
        location: location || null,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to generate inventory summary report", {
      error: error.message,
      stack: error.stack,
      queryParams: queryParams,
    });
    throw error;
  }
};

/**
 * Generate low stock report
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Low stock report
 */
export const generateLowStockReport = async (queryParams) => {
  const startTime = Date.now();
  const { startDate, endDate, category, supplier } = queryParams;

  try {
    // Build filter for low stock products
    const filter = {
      isDeleted: false,
      $expr: {
        $lte: ["$quantity", "$minimumStockLevel"],
      },
    };

    if (category) {
      filter.category = new mongoose.Types.ObjectId(category);
    }
    if (supplier) {
      filter.supplier = new mongoose.Types.ObjectId(supplier);
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "suppliers",
          localField: "supplier",
          foreignField: "_id",
          as: "supplierInfo",
        },
      },
      {
        $lookup: {
          from: "locations",
          localField: "storageLocation",
          foreignField: "_id",
          as: "locationInfo",
        },
      },
      { $unwind: { path: "$supplierInfo", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$locationInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          riskLevel: {
            $cond: {
              if: { $eq: ["$quantity", 0] },
              then: "Critical",
              else: {
                $cond: {
                  if: {
                    $lte: [
                      { $divide: ["$quantity", "$minimumStockLevel"] },
                      0.5,
                    ],
                  },
                  then: "Critical",
                  else: {
                    $cond: {
                      if: {
                        $lte: [
                          { $divide: ["$quantity", "$minimumStockLevel"] },
                          0.8,
                        ],
                      },
                      then: "Warning",
                      else: "Safe",
                    },
                  },
                },
              },
            },
          },
          stockRatio: {
            $divide: ["$quantity", { $max: ["$minimumStockLevel", 1] }],
          },
        },
      },
      {
        $project: {
          productId: "$_id",
          productName: 1,
          SKU: 1,
          quantity: 1,
          minimumStockLevel: 1,
          stockRatio: 1,
          riskLevel: 1,
          unitPrice: 1,
          supplier: {
            _id: "$supplierInfo._id",
            name: "$supplierInfo.name",
            email: "$supplierInfo.email",
          },
          location: {
            _id: "$locationInfo._id",
            path: {
              $concat: [
                { $ifNull: ["$locationInfo.zone", ""] },
                "-",
                { $ifNull: ["$locationInfo.rack", ""] },
                "-",
                { $ifNull: ["$locationInfo.shelf", ""] },
                "-",
                { $ifNull: ["$locationInfo.bin", ""] },
              ],
            },
          },
        },
      },
      { $sort: { stockRatio: 1, quantity: 1 } },
    ];

    const lowStockProducts = await Product.aggregate(pipeline);

    // Risk level summary
    const riskSummary = lowStockProducts.reduce(
      (acc, product) => {
        acc[product.riskLevel] = (acc[product.riskLevel] || 0) + 1;
        return acc;
      },
      {}
    );

    const executionTime = Date.now() - startTime;

    logger.info("Low stock report generated", {
      executionTime: `${executionTime}ms`,
      totalProducts: lowStockProducts.length,
      riskSummary: riskSummary,
    });

    return {
      summary: {
        totalLowStockProducts: lowStockProducts.length,
        criticalCount: riskSummary.Critical || 0,
        warningCount: riskSummary.Warning || 0,
        safeCount: riskSummary.Safe || 0,
      },
      products: lowStockProducts.map((product) => ({
        ...product,
        productId: product.productId.toString(),
        stockRatio: parseFloat(product.stockRatio.toFixed(2)),
        supplier: product.supplier._id
          ? {
              _id: product.supplier._id.toString(),
              name: product.supplier.name,
              email: product.supplier.email,
            }
          : null,
        location: product.location._id
          ? {
              _id: product.location._id.toString(),
              path: product.location.path,
            }
          : null,
      })),
      filters: {
        category: category || null,
        supplier: supplier || null,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to generate low stock report", {
      error: error.message,
      stack: error.stack,
      queryParams: queryParams,
    });
    throw error;
  }
};

/**
 * Generate order statistics report
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Order statistics report
 */
export const generateOrderStatistics = async (queryParams) => {
  const startTime = Date.now();
  const { startDate, endDate, groupBy } = queryParams;

  try {
    // Build base filter
    const baseFilter = {
      isDeleted: false,
      ...buildDateFilter(startDate, endDate),
    };

    // Overall statistics
    const statsPipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
          minOrderValue: { $min: "$totalAmount" },
          maxOrderValue: { $max: "$totalAmount" },
        },
      },
    ];

    // Status distribution
    const statusPipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { count: -1 } },
    ];

    // Time-based trends
    let trendPipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ];

    // Adjust trend pipeline based on groupBy
    if (groupBy === "week") {
      trendPipeline = [
        { $match: baseFilter },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              week: { $week: "$createdAt" },
            },
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
            averageOrderValue: { $avg: "$totalAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } },
      ];
    } else if (groupBy === "month") {
      trendPipeline = [
        { $match: baseFilter },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
            averageOrderValue: { $avg: "$totalAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ];
    } else if (groupBy === "year") {
      trendPipeline = [
        { $match: baseFilter },
        {
          $group: {
            _id: { year: { $year: "$createdAt" } },
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
            averageOrderValue: { $avg: "$totalAmount" },
          },
        },
        { $sort: { "_id.year": 1 } },
      ];
    }

    // Execute aggregations
    const [statistics, statusDistribution, trends] = await Promise.all([
      Order.aggregate(statsPipeline),
      Order.aggregate(statusPipeline),
      Order.aggregate(trendPipeline),
    ]);

    const executionTime = Date.now() - startTime;

    logger.info("Order statistics report generated", {
      executionTime: `${executionTime}ms`,
      groupBy: groupBy || "day",
      filters: { startDate, endDate },
    });

    return {
      summary: statistics[0]
        ? {
            totalOrders: statistics[0].totalOrders,
            totalRevenue: parseFloat(statistics[0].totalRevenue.toFixed(2)),
            averageOrderValue: parseFloat(
              statistics[0].averageOrderValue.toFixed(2)
            ),
            minOrderValue: parseFloat(statistics[0].minOrderValue.toFixed(2)),
            maxOrderValue: parseFloat(statistics[0].maxOrderValue.toFixed(2)),
          }
        : {
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            minOrderValue: 0,
            maxOrderValue: 0,
          },
      statusDistribution: statusDistribution.map((item) => ({
        status: item._id,
        count: item.count,
        totalRevenue: parseFloat(item.totalRevenue.toFixed(2)),
        percentage: 0, // Will be calculated on frontend
      })),
      trends: trends.map((item) => ({
        period: groupBy === "week"
          ? `${item._id.year}-W${item._id.week}`
          : groupBy === "month"
          ? `${item._id.year}-${String(item._id.month).padStart(2, "0")}`
          : groupBy === "year"
          ? `${item._id.year}`
          : `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
        orderCount: item.orderCount,
        totalRevenue: parseFloat(item.totalRevenue.toFixed(2)),
        averageOrderValue: parseFloat(item.averageOrderValue.toFixed(2)),
      })),
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        groupBy: groupBy || "day",
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to generate order statistics report", {
      error: error.message,
      stack: error.stack,
      queryParams: queryParams,
    });
    throw error;
  }
};

/**
 * Generate supplier performance report
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Supplier performance report
 */
export const generateSupplierPerformance = async (queryParams) => {
  const startTime = Date.now();
  const { startDate, endDate } = queryParams;

  try {
    // Build date filter for receiving
    const receivingFilter = {
      isDeleted: false,
      status: "Completed",
      ...buildDateFilter(startDate, endDate),
    };

    // Supplier performance aggregation
    const supplierPipeline = [
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "supplier",
          as: "products",
        },
      },
      {
        $lookup: {
          from: "receivings",
          localField: "_id",
          foreignField: "supplier",
          as: "receivings",
        },
      },
      {
        $addFields: {
          activeProducts: {
            $size: {
              $filter: {
                input: "$products",
                as: "product",
                cond: { $eq: ["$$product.isDeleted", false] },
              },
            },
          },
          completedReceivings: {
            $size: {
              $filter: {
                input: "$receivings",
                as: "receiving",
                cond: {
                  $and: [
                    { $eq: ["$$receiving.isDeleted", false] },
                    { $eq: ["$$receiving.status", "Completed"] },
                    startDate || endDate
                      ? {
                          $and: [
                            startDate
                              ? {
                                  $gte: [
                                    "$$receiving.createdAt",
                                    new Date(startDate),
                                  ],
                                }
                              : true,
                            endDate
                              ? {
                                  $lte: [
                                    "$$receiving.createdAt",
                                    new Date(endDate),
                                  ],
                                }
                              : true,
                          ],
                        }
                      : true,
                  ],
                },
              },
            },
          },
          totalQuantityReceived: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$receivings",
                    as: "receiving",
                    cond: {
                      $and: [
                        { $eq: ["$$receiving.isDeleted", false] },
                        { $eq: ["$$receiving.status", "Completed"] },
                        startDate || endDate
                          ? {
                              $and: [
                                startDate
                                  ? {
                                      $gte: [
                                        "$$receiving.createdAt",
                                        new Date(startDate),
                                      ],
                                    }
                                  : true,
                                endDate
                                  ? {
                                      $lte: [
                                        "$$receiving.createdAt",
                                        new Date(endDate),
                                      ],
                                    }
                                  : true,
                              ],
                            }
                          : true,
                      ],
                    },
                  },
                },
                as: "receiving",
                in: "$$receiving.totalQuantity",
              },
            },
          },
        },
      },
      {
        $project: {
          supplierId: "$_id",
          supplierName: 1,
          email: 1,
          company: 1,
          status: 1,
          activeProducts: 1,
          completedReceivings: 1,
          totalQuantityReceived: 1,
        },
      },
      { $sort: { completedReceivings: -1, totalQuantityReceived: -1 } },
    ];

    const supplierPerformance = await Supplier.aggregate(supplierPipeline);

    const executionTime = Date.now() - startTime;

    logger.info("Supplier performance report generated", {
      executionTime: `${executionTime}ms`,
      totalSuppliers: supplierPerformance.length,
      filters: { startDate, endDate },
    });

    return {
      summary: {
        totalSuppliers: supplierPerformance.length,
        activeSuppliers: supplierPerformance.filter(
          (s) => s.status === "ACTIVE"
        ).length,
        totalProducts: supplierPerformance.reduce(
          (sum, s) => sum + s.activeProducts,
          0
        ),
        totalReceivings: supplierPerformance.reduce(
          (sum, s) => sum + s.completedReceivings,
          0
        ),
        totalQuantityReceived: supplierPerformance.reduce(
          (sum, s) => sum + s.totalQuantityReceived,
          0
        ),
      },
      suppliers: supplierPerformance.map((supplier) => ({
        supplierId: supplier.supplierId.toString(),
        supplierName: supplier.supplierName,
        email: supplier.email,
        company: supplier.company,
        status: supplier.status,
        activeProducts: supplier.activeProducts,
        completedReceivings: supplier.completedReceivings,
        totalQuantityReceived: supplier.totalQuantityReceived,
        performanceScore: supplier.completedReceivings * 10 + supplier.activeProducts,
      })),
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to generate supplier performance report", {
      error: error.message,
      stack: error.stack,
      queryParams: queryParams,
    });
    throw error;
  }
};

/**
 * Generate task productivity report
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Task productivity report
 */
export const generateTaskProductivity = async (queryParams) => {
  const startTime = Date.now();
  const { startDate, endDate } = queryParams;

  try {
    // Build base filter
    const baseFilter = {
      isDeleted: false,
      status: "Completed",
      ...buildDateFilter(startDate, endDate),
    };

    // Staff productivity aggregation
    const staffPipeline = [
      { $match: baseFilter },
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      { $unwind: "$staffInfo" },
      {
        $group: {
          _id: "$assignedTo",
          staffName: { $first: "$staffInfo.name" },
          staffEmail: { $first: "$staffInfo.email" },
          totalTasksCompleted: { $sum: 1 },
          averageCompletionTime: { $avg: "$completionDuration" },
          totalCompletionTime: { $sum: "$completionDuration" },
          tasksByType: {
            $push: {
              taskType: "$taskType",
              completionDuration: "$completionDuration",
            },
          },
        },
      },
      {
        $addFields: {
          tasksByTypeBreakdown: {
            $reduce: {
              input: "$tasksByType",
              initialValue: {},
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    $cond: {
                      if: { $not: ["$$value.$$this.taskType"] },
                      then: {
                        $arrayToObject: [
                          [
                            {
                              k: "$$this.taskType",
                              v: {
                                count: 1,
                                totalDuration: "$$this.completionDuration",
                                averageDuration: "$$this.completionDuration",
                              },
                            },
                          ],
                        ],
                      },
                      else: {
                        $arrayToObject: [
                          [
                            {
                              k: "$$this.taskType",
                              v: {
                                count: {
                                  $add: [
                                    "$$value.$$this.taskType.count",
                                    1,
                                  ],
                                },
                                totalDuration: {
                                  $add: [
                                    "$$value.$$this.taskType.totalDuration",
                                    "$$this.completionDuration",
                                  ],
                                },
                                averageDuration: {
                                  $divide: [
                                    {
                                      $add: [
                                        "$$value.$$this.taskType.totalDuration",
                                        "$$this.completionDuration",
                                      ],
                                    },
                                    {
                                      $add: [
                                        "$$value.$$this.taskType.count",
                                        1,
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { totalTasksCompleted: -1 } },
    ];

    // Task type performance
    const taskTypePipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: "$taskType",
          totalCompleted: { $sum: 1 },
          averageCompletionTime: { $avg: "$completionDuration" },
          minCompletionTime: { $min: "$completionDuration" },
          maxCompletionTime: { $max: "$completionDuration" },
        },
      },
      { $sort: { totalCompleted: -1 } },
    ];

    // Overall task statistics
    const overallStatsPipeline = [
      { $match: { isDeleted: false, ...buildDateFilter(startDate, endDate) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ];

    // Execute aggregations
    const [staffProductivity, taskTypePerformance, overallStats] =
      await Promise.all([
        Task.aggregate(staffPipeline),
        Task.aggregate(taskTypePipeline),
        Task.aggregate(overallStatsPipeline),
      ]);

    // Calculate completion rate
    const totalTasks = overallStats.reduce((sum, stat) => sum + stat.count, 0);
    const completedTasks =
      overallStats.find((stat) => stat._id === "Completed")?.count || 0;
    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const executionTime = Date.now() - startTime;

    logger.info("Task productivity report generated", {
      executionTime: `${executionTime}ms`,
      totalStaff: staffProductivity.length,
      filters: { startDate, endDate },
    });

    return {
      summary: {
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        completionRate: parseFloat(completionRate.toFixed(2)),
        totalStaff: staffProductivity.length,
      },
      staffProductivity: staffProductivity.map((staff) => ({
        staffId: staff._id.toString(),
        staffName: staff.staffName,
        staffEmail: staff.staffEmail,
        totalTasksCompleted: staff.totalTasksCompleted,
        averageCompletionTime: staff.averageCompletionTime
          ? parseFloat(staff.averageCompletionTime.toFixed(2))
          : null,
        totalCompletionTime: staff.totalCompletionTime || 0,
        productivityScore: staff.totalTasksCompleted * 10,
      })),
      taskTypePerformance: taskTypePerformance.map((type) => ({
        taskType: type._id,
        totalCompleted: type.totalCompleted,
        averageCompletionTime: type.averageCompletionTime
          ? parseFloat(type.averageCompletionTime.toFixed(2))
          : null,
        minCompletionTime: type.minCompletionTime || null,
        maxCompletionTime: type.maxCompletionTime || null,
      })),
      statusDistribution: overallStats.map((stat) => ({
        status: stat._id,
        count: stat.count,
        percentage: totalTasks > 0 ? parseFloat(((stat.count / totalTasks) * 100).toFixed(2)) : 0,
      })),
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to generate task productivity report", {
      error: error.message,
      stack: error.stack,
      queryParams: queryParams,
    });
    throw error;
  }
};

/**
 * Emit report generated event via Socket.io
 * @param {string} reportType - Type of report generated
 * @param {string} generatedBy - User ID who generated the report
 */
export const emitReportGenerated = (reportType, generatedBy) => {
  try {
    const io = getSocket();
    io.emit("reportGenerated", {
      reportType: reportType,
      generatedBy: generatedBy,
      timestamp: new Date().toISOString(),
    });
  } catch (socketError) {
    logger.error("Failed to emit report generated event", {
      error: socketError.message,
      reportType: reportType,
    });
    // Don't throw - socket failure shouldn't break report generation
  }
};
