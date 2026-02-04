import express from "express";
import {
  getInventorySummaryHandler,
  getLowStockReportHandler,
  getOrderStatisticsHandler,
  getSupplierPerformanceHandler,
  getTaskProductivityHandler,
} from "../controllers/reportController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Report Management Routes
 * All reporting endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require Admin or Manager role
router.use(authorizeRoles(userRoles.ADMIN, userRoles.MANAGER));

/**
 * @swagger
 * /api/reports/inventory-summary:
 *   get:
 *     summary: Generate inventory summary report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *         description: Filter by supplier ID
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location ID
 *     responses:
 *       200:
 *         description: Inventory summary report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Inventory summary report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalProducts:
 *                               type: integer
 *                             totalQuantity:
 *                               type: integer
 *                             totalValue:
 *                               type: number
 *                         categoryBreakdown:
 *                           type: array
 *                         locationBreakdown:
 *                           type: array
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.get("/inventory-summary", getInventorySummaryHandler);

/**
 * @swagger
 * /api/reports/low-stock:
 *   get:
 *     summary: Generate low stock report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *         description: Filter by supplier ID
 *     responses:
 *       200:
 *         description: Low stock report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Low stock report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalLowStockProducts:
 *                               type: integer
 *                             criticalCount:
 *                               type: integer
 *                             warningCount:
 *                               type: integer
 *                         products:
 *                           type: array
 *                           items:
 *                             type: object
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.get("/low-stock", getLowStockReportHandler);

/**
 * @swagger
 * /api/reports/order-statistics:
 *   get:
 *     summary: Generate order statistics report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         description: Group results by time period
 *     responses:
 *       200:
 *         description: Order statistics report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Order statistics report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalOrders:
 *                               type: integer
 *                             totalRevenue:
 *                               type: number
 *                             averageOrderValue:
 *                               type: number
 *                         statusDistribution:
 *                           type: array
 *                         trends:
 *                           type: array
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.get("/order-statistics", getOrderStatisticsHandler);

/**
 * @swagger
 * /api/reports/supplier-performance:
 *   get:
 *     summary: Generate supplier performance report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Supplier performance report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Supplier performance report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: object
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.get("/supplier-performance", getSupplierPerformanceHandler);

/**
 * @swagger
 * /api/reports/task-productivity:
 *   get:
 *     summary: Generate task productivity report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Task productivity report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Task productivity report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: object
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.get("/task-productivity", getTaskProductivityHandler);

export default router;
