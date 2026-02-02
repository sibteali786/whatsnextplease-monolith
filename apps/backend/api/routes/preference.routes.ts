import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { PreferenceController } from '../controller/preference.controller';
const router = Router();
const controller = new PreferenceController();

/**
 * Task View Filters
 */
router.post('/task-view-filter', verifyToken, controller.createTaskViewFilter);

router.get('/task-view-filter', verifyToken, controller.getTaskViewFilters);

export const preferenceRoutes = router;
