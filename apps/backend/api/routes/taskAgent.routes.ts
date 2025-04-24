import { Router } from 'express';
import { TaskAgentController } from '../controller/taskAgent.controller';
import { verifyToken, requireRole } from '../middleware/auth';
import { Roles } from '@prisma/client';

const router = Router();
const controller = new TaskAgentController();

// Route middleware
// These routes should be accessible by admin roles (SUPER_USER, TASK_SUPERVISOR, etc.)
const authMiddleware = [
  verifyToken,
  requireRole([
    Roles.SUPER_USER,
    Roles.TASK_SUPERVISOR,
    Roles.DISTRICT_MANAGER,
    Roles.TERRITORY_MANAGER,
  ]),
];

// Get all task agent IDs (for pagination)
router.get('/ids', authMiddleware, controller.getTaskAgentIds);

// Get paginated task agents with task counts
router.get('/', authMiddleware, controller.getTaskAgents);

// Get task agent by ID with task counts
router.get('/:id', authMiddleware, controller.getTaskAgentById);

export const taskAgentRoutes = router;
