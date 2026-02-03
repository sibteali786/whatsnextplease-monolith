import { Router } from 'express';
import { verifyTokenHybrid } from '../middleware/auth';
import { PreferenceController } from '../controller/preference.controller';
const router = Router();
const controller = new PreferenceController();

/**
 * Task View Filters
 */
router.post('/task-view-filter', verifyTokenHybrid, controller.createTaskViewFilter);

router.get('/task-view-filter', verifyTokenHybrid, controller.getTaskViewFilters);

export const preferenceRoutes = router;
