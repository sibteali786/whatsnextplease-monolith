import { Router } from 'express';
import { TaskLinkController } from '../controller/taskLink.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
const controller = new TaskLinkController();

// middleware for all routes
const authMiddleware = [verifyToken];

/**
 * @route GET /tasks/:taskId/links
 * @desc Get all links for a task
 * @access Private (authenticated users with task access)
 */
router.get('/:taskId/links', authMiddleware, controller.getTaskLinks);

/**
 * @route POST /tasks/:taskId/links
 * @desc Add a new link to a task
 * @access Private (authenticated users with task access)
 * @body { url: string }
 */
router.post('/:taskId/links', authMiddleware, controller.createTaskLink);

/**
 * @route DELETE /tasks/:taskId/links/:linkId
 * @desc Delete a link from a task
 * @access Private (link creator, super user, or task supervisor)
 */
router.delete('/:taskId/links/:linkId', authMiddleware, controller.deleteTaskLink);

export const taskLinkRoutes = router;
