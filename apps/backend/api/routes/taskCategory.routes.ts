import { Router } from 'express';
import { verifyTokenHybrid } from '../middleware/auth';
import { TaskCategoryController } from '../controller/taskCategory.controller';

const router = Router();
const controller = new TaskCategoryController();

router.get('/all', verifyTokenHybrid, controller.getAllTaskCategories);
router.post('/create', verifyTokenHybrid, controller.createTaskCategory);
export const taskCategoryRoutes = router;
