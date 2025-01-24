import { Router } from 'express';
import { UserController } from '../controller/user.controller';
import { verifyToken } from '../middleware/auth';
import multer from 'multer';
const router = Router();
const controller = new UserController();
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

export const userRoutes = router;
