import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { TaskCategoryController } from '../controller/taskCategory.controller';

const router = Router();
const controller = new TaskCategoryController();

router.get('/all', verifyToken, controller.getAllTaskCategories);
router.post('/create', verifyToken, controller.createTaskCategory);
export const taskCategoryRoutes = router;
