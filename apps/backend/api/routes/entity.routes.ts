import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { EntityController } from '../controller/entity.controller';
import { Roles } from '@prisma/client';

const router = Router();
const controller = new EntityController();

router.get('/:type/:id', verifyToken, controller.getEntityProfile);

router.delete(
  '/:type/:id',
  verifyToken,
  requireRole([Roles.SUPER_USER, Roles.TASK_SUPERVISOR]),
  controller.deleteEntity
);

export const entityRoutes = router;
