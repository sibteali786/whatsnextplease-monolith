import { Router } from 'express';
import { WorkLogController } from '../controller/worklog.controller';
import { verifyTokenHybrid } from '../middleware/auth';

const router = Router();
const controller = new WorkLogController();

/**
 * All routes require authentication via hybrid token verification
 * Supports both legacy JWT and IDP tokens
 */

// POST /api/tasks/:taskId/worklogs - Create work log
router.post('/tasks/:taskId/worklogs', verifyTokenHybrid, controller.createWorkLog);

// GET /api/tasks/:taskId/worklogs - Get work logs for task
router.get('/tasks/:taskId/worklogs', verifyTokenHybrid, controller.getWorkLogsByTaskId);

// GET /api/worklogs/:worklogId - Get single work log
router.get('/worklogs/:worklogId', verifyTokenHybrid, controller.getWorkLogById);

// PUT /api/worklogs/:worklogId - Update work log
router.put('/worklogs/:worklogId', verifyTokenHybrid, controller.updateWorkLog);

// DELETE /api/worklogs/:worklogId - Delete work log (soft delete)
router.delete('/worklogs/:worklogId', verifyTokenHybrid, controller.deleteWorkLog);

export const worklogRoutes = router;
