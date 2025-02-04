import { Router } from 'express';
import { SkillCategoryController } from '../controller/skillCategory.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
const controller = new SkillCategoryController();

router.get('/all', verifyToken, controller.getAllSkillCategories);
export const skillCategoryRoutes = router;
