import { Router } from 'express';
import { SkillCategoryController } from '../controller/skillCategory.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
const controller = new SkillCategoryController();

router.get('/all', verifyToken, controller.getAllSkillCategories);
router.post('/create', verifyToken, controller.createSkillCategory);
export const skillCategoryRoutes = router;
