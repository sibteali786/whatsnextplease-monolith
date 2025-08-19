import { Router } from 'express';
import { CommentController } from '../controller/comment.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
const controller = new CommentController();

// Middleware for all routes
const authMiddleware = [verifyToken];

// Middleware for admin operations (delete any comment, etc.)
// const adminMiddleware = [
//   verifyToken,
//   requireRole([
//     Roles.SUPER_USER,
//     Roles.TASK_SUPERVISOR,
//     Roles.DISTRICT_MANAGER,
//     Roles.TERRITORY_MANAGER,
//   ]),
// ];

/**
 * @route POST /tasks/{taskId}/comments
 * @desc Create a new comment for a task (with optional file attachments)
 * @access Private (all authenticated users with task access)
 * @body { content: string, fileIds?: string[] }
 */
router.post('/tasks/:taskId/comments', authMiddleware, controller.createComment);

/**
 * @route GET /tasks/{taskId}/comments
 * @desc Get comments for a task with pagination
 * @access Private (all authenticated users with task access)
 * @query cursor, pageSize
 */
router.get('/tasks/:taskId/comments', authMiddleware, controller.getComments);

/**
 * @route PUT /comments/{commentId}
 * @desc Update comment content (author only)
 * @access Private (comment author or admin)
 * @body { content: string }
 */
router.put('/comments/:commentId', authMiddleware, controller.updateComment);

/**
 * @route DELETE /comments/{commentId}
 * @desc Delete comment (author or admin only)
 * @access Private (comment author or admin)
 */
router.delete('/comments/:commentId', authMiddleware, controller.deleteComment);

/**
 * @route POST /comments/{commentId}/files
 * @desc Add files to existing comment (author only)
 * @access Private (comment author only)
 * @body { fileIds: string[] }
 */
router.post('/comments/:commentId/files', authMiddleware, controller.addFilesToComment);

/**
 * @route DELETE /comments/{commentId}/files/{fileId}
 * @desc Remove file from comment (author only)
 * @access Private (comment author only)
 */
router.delete(
  '/comments/:commentId/files/:fileId',
  authMiddleware,
  controller.removeFileFromComment
);

export const commentRoutes = router;
