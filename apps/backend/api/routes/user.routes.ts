import { Router } from 'express';
import { UserController } from '../controller/user.controller';
import { verifyToken } from '../middleware/auth';
import multer from 'multer';
const router = Router();
const controller = new UserController();
const upload = multer({ storage: multer.memoryStorage() });

router.patch(
  '/profilePicture',
  verifyToken,
  upload.single('file'),
  controller.updateProfilePicture
);

export const userRoutes = router;
