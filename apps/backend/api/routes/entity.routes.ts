import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { EntityController } from '../controller/entity.controller';

const router = Router();
const controller = new EntityController();

router.get('/:type/:id', verifyToken, controller.getEntityProfile);

router.delete('/:type/:id', verifyToken, controller.deleteEntity);

export const entityRoutes = router;
