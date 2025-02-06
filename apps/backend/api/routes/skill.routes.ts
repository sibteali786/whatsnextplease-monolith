import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { SkillController } from '../controller/skill.controller';

const router = Router();
const controller = new SkillController();

router.get('/all', verifyToken, controller.getSkills);
router.post('/create', verifyToken, controller.createSkills);

export const skillRoutes = router;
