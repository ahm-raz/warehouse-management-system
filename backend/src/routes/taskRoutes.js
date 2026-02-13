import express from "express";
import {
  createTaskHandler,
  getTasksHandler,
  getStaffTasksHandler,
  getTaskByIdHandler,
  updateTaskStatusHandler,
  assignTaskHandler,
  deleteTaskHandler,
  getTaskActivityLogsHandler,
} from "../controllers/taskController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { userRoles } from "../models/User.js";

/**
 * Task Management Routes
 * All task management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     description: >
 *       Creates a new warehouse task and assigns it to a staff member.
 *       Task type determines required relationships:
 *       - **Picking/Packing**: requires `relatedOrder`
 *       - **Receiving**: requires `relatedReceiving`
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - taskType
 *               - assignedTo
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 example: Pick items for ORD-20240101-00001
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Pick items from Zone A for order fulfillment
 *               taskType:
 *                 type: string
 *                 enum: [Picking, Packing, Receiving]
 *                 example: Picking
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High]
 *                 default: Medium
 *                 example: Medium
 *               assignedTo:
 *                 type: string
 *                 description: Staff member ObjectId (must have Staff role)
 *                 example: 507f1f77bcf86cd799439015
 *               relatedOrder:
 *                 type: string
 *                 description: Order ObjectId (required for Picking/Packing tasks)
 *                 example: 507f1f77bcf86cd799439017
 *               relatedReceiving:
 *                 type: string
 *                 description: Receiving ObjectId (required for Receiving tasks)
 *                 example: 507f1f77bcf86cd799439018
 *     responses:
 *       201:
 *         description: Task created successfully
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
 *                   example: Task created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error (missing fields, invalid task type, or missing related entity)
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
  createTaskHandler
);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks with pagination and filtering
 *     tags: [Tasks]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, InProgress, Completed, Cancelled]
 *         description: Filter by task status
 *       - in: query
 *         name: taskType
 *         schema:
 *           type: string
 *           enum: [Picking, Packing, Receiving]
 *         description: Filter by task type
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High]
 *         description: Filter by task priority
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
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
 *                   example: Tasks retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get("/", getTasksHandler);

/**
 * @swagger
 * /api/tasks/staff/{staffId}:
 *   get:
 *     summary: Get tasks assigned to specific staff member
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff member ID
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, InProgress, Completed, Cancelled]
 *         description: Filter by task status
 *     responses:
 *       200:
 *         description: Staff tasks retrieved successfully
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
 *                   example: Staff tasks retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Staff member not found
 *       401:
 *         description: Unauthorized
 */
router.get("/staff/:staffId", getStaffTasksHandler);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
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
 *                   example: Task retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", getTaskByIdHandler);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     description: >
 *       Updates task status following valid transitions:
 *       - Pending → InProgress, Cancelled
 *       - InProgress → Completed, Cancelled
 *       - Completed and Cancelled are final states
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, InProgress, Completed, Cancelled]
 *                 example: InProgress
 *     responses:
 *       200:
 *         description: Task status updated successfully
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
 *                   example: Task status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Task not found
 */
router.patch("/:id/status", updateTaskStatusHandler);

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   patch:
 *     summary: Assign or reassign task to staff member
 *     description: Assigns a task to a staff member. The target user must have the Staff role.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *             properties:
 *               staffId:
 *                 type: string
 *                 description: Staff member ObjectId (must have Staff role)
 *                 example: 507f1f77bcf86cd799439015
 *     responses:
 *       200:
 *         description: Task assigned successfully
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
 *                   example: Task assigned successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Task or staff not found
 */
router.patch(
  "/:id/assign",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  assignTaskHandler
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Soft delete task
 *     description: Marks a task as deleted (soft delete). The task is not permanently removed.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
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
 *                   example: Task deleted successfully
 *       403:
 *         description: Forbidden - Admin or Manager role required
 *       404:
 *         description: Task not found
 */
router.delete(
  "/:id",
  authorizeRoles(userRoles.ADMIN, userRoles.MANAGER),
  deleteTaskHandler
);

/**
 * @swagger
 * /api/tasks/{id}/activity:
 *   get:
 *     summary: Get task activity logs
 *     description: Retrieves the audit trail of all changes made to a specific task.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
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
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
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
 *                   example: Activity logs retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id/activity", getTaskActivityLogsHandler);

export default router;
