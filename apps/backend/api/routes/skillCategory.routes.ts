import { Router } from 'express';
import { SkillCategoryController } from '../controller/skillCategory.controller';
import { verifyTokenHybrid } from '../middleware/auth';

const router = Router();
const controller = new SkillCategoryController();

router.get('/all', verifyTokenHybrid, controller.getAllSkillCategories);
router.post('/create', verifyTokenHybrid, controller.createSkillCategory);
router.put('/edit', verifyTokenHybrid, controller.editSkillCategory);
router.get('/search', verifyTokenHybrid, controller.searchSkillCategories);
export const skillCategoryRoutes = router;
