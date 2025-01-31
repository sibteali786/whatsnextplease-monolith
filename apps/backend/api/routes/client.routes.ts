import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import multer from 'multer';
import { ClientController } from '../controller/client.controller';

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
export const clientRoutes = router;
