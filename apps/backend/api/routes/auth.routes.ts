import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { verifyTokenHybrid } from '../middleware/auth';

const router = Router();
router.post('/verify-email', authController.verifyEmail);

// POST /auth/send-verification-email (public) - SENDS verification email
router.post('/send-verification-email', authController.sendVerificationEmail);

// POST /auth/resend-verification (authenticated - requires JWT)
router.post('/resend-verification', verifyTokenHybrid, authController.resendVerificationEmail);

// POST /auth/resend-verification-by-email (public)
router.post('/resend-verification-by-email', authController.resendVerificationByEmail);

export { router as authRoutes };
