import { Router } from 'express';
import { UserController } from '../controller/user.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
const controller = new UserController();

router.patch('/profilePicture', verifyToken, controller.updateProfilePicture);

export const userRoutes = router;
