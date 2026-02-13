import express from "express";
import {
  createNotificationHandler,
  getNotificationsHandler,
  markNotificationAsReadHandler,
  markAllNotificationsAsReadHandler,
  deleteNotificationHandler,
} from "../controllers/notificationController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Notification Management Routes
 * All notification management endpoints
 *
 * Notification types: LOW_STOCK, ORDER_STATUS, TASK_ASSIGNMENT, SYSTEM_ALERT
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a new notification
 *     description: >
 *       Creates a notification for a specific user. Typically used by the system
 *       for alerts, but Admin/Manager can create manually.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user
 *               - title
 *               - message
 *               - type
 *             properties:
 *               user:
 *                 type: string
 *                 description: Recipient user ObjectId
 *                 example: 507f1f77bcf86cd799439015
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 description: Notification title
 *                 example: Low Stock Alert
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Notification message body
 *                 example: Product LAPTOP-001 is below minimum stock level
 *               type:
 *                 type: string
 *                 enum: [LOW_STOCK, ORDER_STATUS, TASK_ASSIGNMENT, SYSTEM_ALERT]
 *                 description: Notification category type
 *                 example: LOW_STOCK
 *               metadata:
 *                 type: object
 *                 description: Additional context data
 *                 example: { "productId": "507f1f77bcf86cd799439012", "currentQuantity": 5 }
 *     responses:
 *       201:
 *         description: Notification created successfully
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
 *                   example: Notification created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notification:
 *                       $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.post(
  "/",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  createNotificationHandler
);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications with pagination and filtering
 *     description: Returns notifications for the currently authenticated user.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: readStatus
 *         schema:
 *           type: boolean
 *         description: Filter by read status (true = read, false = unread)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [LOW_STOCK, ORDER_STATUS, TASK_ASSIGNMENT, SYSTEM_ALERT]
 *         description: Filter by notification type
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                   example: Notifications retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get("/", getNotificationsHandler);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Sets readStatus to true and records the readAt timestamp.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
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
 *                   example: Notification marked as read
 *                 data:
 *                   type: object
 *                   properties:
 *                     notification:
 *                       $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.patch("/:id/read", markNotificationAsReadHandler);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read for logged-in user
 *     description: Bulk operation to mark all unread notifications as read for the authenticated user.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
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
 *                   example: All notifications marked as read
 *                 data:
 *                   type: object
 *                   properties:
 *                     modifiedCount:
 *                       type: integer
 *                       description: Number of notifications marked as read
 *                       example: 5
 *       401:
 *         description: Unauthorized
 */
router.patch("/read-all", markAllNotificationsAsReadHandler);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Soft delete notification
 *     description: Marks a notification as deleted (soft delete). The notification is not permanently removed.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
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
 *                   example: Notification deleted successfully
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", deleteNotificationHandler);

export default router;
