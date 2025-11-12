import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth';
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
  verifyToken,
  upload.single('file'),
  controller.updateProfilePicture
);
router.get('/profile', verifyToken, controller.getClientProfile);
router.patch('/profile', verifyToken, controller.updateProfile);
router.delete(
  '/:id',
  verifyToken,
  requireRole([Roles.SUPER_USER, Roles.TASK_SUPERVISOR]),
  controller.deleteClient
);
router.patch('/:id', verifyToken, controller.updateClientById);
export const clientRoutes = router;
