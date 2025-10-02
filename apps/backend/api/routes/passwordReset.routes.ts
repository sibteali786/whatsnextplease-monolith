import { Router } from 'express';
import { passwordResetController } from '../controller/passwordReset.controller';

const router = Router();

// All routes are public (no auth required)
router.post('/request', passwordResetController.requestReset);
router.post('/verify', passwordResetController.verifyToken);
router.post('/reset', passwordResetController.resetPassword);

export { router as passwordResetRoutes };
