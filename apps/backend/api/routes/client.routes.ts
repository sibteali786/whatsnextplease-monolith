import { Router } from 'express';
import { requireRole, verifyTokenHybrid } from '../middleware/auth';
import multer from 'multer';
import { ClientController } from '../controller/client.controller';
import { Roles } from '@prisma/client';

const router = Router();
const controller = new ClientController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.patch(
  '/profilePicture',
  verifyTokenHybrid,
  upload.single('file'),
  controller.updateProfilePicture
);
router.get('/profile', verifyTokenHybrid, controller.getClientProfile);
router.patch('/profile', verifyTokenHybrid, controller.updateProfile);
router.delete(
  '/:id',
  verifyTokenHybrid,
  requireRole([Roles.SUPER_USER, Roles.TASK_SUPERVISOR]),
  controller.deleteClient
);
router.patch('/:id', verifyTokenHybrid, controller.updateClientById);
router.post('/create', controller.createClient);
export const clientRoutes = router;
