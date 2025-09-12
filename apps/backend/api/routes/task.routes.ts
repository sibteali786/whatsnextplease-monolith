// apps/backend/api/routes/task.routes.ts
import { Router } from 'express';
import { TaskController } from '../controller/task.controller';
import { verifyToken, requireRole } from '../middleware/auth';
import { Roles } from '@prisma/client';

const router = Router();
const controller = new TaskController();

// Middleware for all routes
const authMiddleware = [verifyToken];

// Middleware for admin operations
const adminMiddleware = [
  verifyToken,
  requireRole([
    Roles.SUPER_USER,
    Roles.TASK_SUPERVISOR,
    Roles.DISTRICT_MANAGER,
    Roles.TERRITORY_MANAGER,
  ]),
];

/**
 * @route GET /tasks
 * @desc Get tasks with filtering and pagination
 * @access Private (all authenticated users)
 * @query userId, cursor, pageSize, search, duration, status, priority, assignedToId, categoryId
 */
router.get('/', authMiddleware, controller.getTasks);

/**
 * @route GET /tasks/ids
 * @desc Get task IDs for pagination
 * @access Private (all authenticated users)
 * @query userId, search, duration
 */
router.get('/ids', authMiddleware, controller.getTaskIds);

/**
 * @route GET /tasks/statistics
 * @desc Get task statistics and counts
 * @access Private (all authenticated users)
 * @query userId
 */
router.get('/statistics', authMiddleware, controller.getTaskStatistics);

/**
 * @route GET /tasks/unassigned
 * @desc Get unassigned tasks
 * @access Private (admin roles only)
 * @query cursor, pageSize
 */
router.get('/unassigned', adminMiddleware, controller.getUnassignedTasks);

/**
 * @route GET /tasks/counts
 * @desc Get task counts by status (legacy endpoint)
 * @access Private (all authenticated users)
 * @query userId
 */
router.get('/counts', authMiddleware, controller.getTasksCount);
/**
 * @route GET /tasks/metadata
 * @desc Get all available statuses and priorities
 * @access Private (all authenticated users)
 */
router.get('/metadata', authMiddleware, controller.getTaskMetadata);

/**
 * @route GET /tasks/priority/:level
 * @desc Get tasks by priority level (critical, high, medium, low, hold)
 * @access Private (all authenticated users)
 * @params level: critical | high | medium | low | hold
 * @query cursor, pageSize, search, duration, status, assignedToId, categoryId, userId
 */
router.get('/priority/:level', authMiddleware, controller.getTasksByPriorityLevel);

/**
 * @route PATCH /tasks/:taskId/status-transition
 * @desc Update task status with workflow validation
 * @access Private (all authenticated users)
 * @body { status: TaskStatusEnum }
 */
router.patch(
  '/:taskId/status-transition',
  authMiddleware,
  controller.updateTaskStatusWithValidation
);
/**
 * @route GET /tasks/:taskId
 * @desc Get task by ID
 * @access Private (all authenticated users)
 */
router.get('/:taskId', authMiddleware, controller.getTaskById);

/**
 * @route PATCH /tasks/:taskId/field
 * @desc Update a single field of a task
 * @access Private (all authenticated users with proper permissions)
 * @body { field: 'status' | 'priority' | 'taskCategory', value: string }
 */
router.patch('/:taskId/field', authMiddleware, controller.updateTaskField);

/**
 * @route PATCH /tasks/batch/update
 * @desc Batch update multiple tasks
 * @access Private (admin roles only)
 * @body { taskIds: string[], updates: { status?, priority?, assignedToId?, categoryId?, dueDate?, skillIds? } }
 */
router.patch('/batch/update', adminMiddleware, controller.batchUpdateTasks);

/**
 * @route DELETE /tasks/batch/delete
 * @desc Batch delete multiple tasks
 * @access Private (admin roles only)
 * @body { taskIds: string[] }
 */
router.delete('/batch/delete', adminMiddleware, controller.batchDeleteTasks);

export const taskRoutes = router;
