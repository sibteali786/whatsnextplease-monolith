import { Router } from 'express';
import { verifyTokenHybrid } from '../middleware/auth';
import { EntityController } from '../controller/entity.controller';

const router = Router();
const controller = new EntityController();

router.get('/:type/:id', verifyTokenHybrid, controller.getEntityProfile);

router.delete('/:type/:id', verifyTokenHybrid, controller.deleteEntity);

export const entityRoutes = router;
