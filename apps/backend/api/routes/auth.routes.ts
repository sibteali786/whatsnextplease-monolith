import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { verifyTokenHybrid } from '../middleware/auth';
import { validateSignin, validateSignup } from '../middleware/validation/auth.validation';

const router = Router();
// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// POST /auth/signin - Login with auto-migration
router.post('/signin', validateSignin, authController.signin);

// POST /auth/signup - Register new user
router.post('/signup', validateSignup, authController.signup);

// POST /auth/verify-email - Verify email with token
router.post('/verify-email', authController.verifyEmail);
// POST /auth/resend-verification-by-email (public)
router.post('/resend-verification-by-email', authController.resendVerificationByEmail);

// POST /auth/send-verification-email (public) - Internal endpoint for sending verification
router.post('/send-verification-email', authController.sendVerificationEmail);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================
// POST /auth/resend-verification (authenticated - requires JWT)
router.post('/resend-verification', verifyTokenHybrid, authController.resendVerificationEmail);

export { router as authRoutes };
