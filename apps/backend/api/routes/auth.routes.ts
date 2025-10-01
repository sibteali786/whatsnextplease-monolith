import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

// POST /auth/verify-email
router.post('/verify-email', verifyToken, authController.verifyEmail);

// POST /auth/resend-verification
router.post('/resend-verification', verifyToken, authController.resendVerificationEmail);

export { router as authRoutes };
