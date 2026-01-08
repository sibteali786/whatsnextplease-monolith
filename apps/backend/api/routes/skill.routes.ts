import { Router } from 'express';
import { verifyTokenHybrid } from '../middleware/auth';
import { SkillController } from '../controller/skill.controller';

const router = Router();
const controller = new SkillController();

router.get('/all', verifyTokenHybrid, controller.getSkills);
router.post('/create', verifyTokenHybrid, controller.createSkills);
router.put('/edit', verifyTokenHybrid, controller.editSkills);

router.put('/user/assign', verifyTokenHybrid, controller.assignSkillsToUser);
export const skillRoutes = router;
