import { Request, Response, NextFunction } from 'express';
import { passwordResetService } from '../services/passwordReset.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { z } from 'zod';

// Validation schemas
const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().email('Invalid email address'),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(20, 'Password can be at max 20 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[\W_]/, 'Password must contain at least one special character'),
});

export class PasswordResetController {
  /**
   * POST /password-reset/request
   * Request password reset (public)
   */
  requestReset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = requestResetSchema.parse(req.body);

      await passwordResetService.requestPasswordReset(email);

      // Always return success (security: prevent email enumeration)
      return res.status(200).json({
        success: true,
        message:
          'If an account exists with that email, you will receive password reset instructions.',
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /password-reset/verify
   * Verify reset token (public)
   */
  verifyToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = z.object({ token: z.string() }).parse(req.body);

      await passwordResetService.verifyResetToken(token);

      return res.status(200).json({
        success: true,
        valid: true,
        message: 'Token is valid',
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /password-reset/reset
   * Reset password with token (public)
   */
  resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);

      await passwordResetService.resetPassword(token, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now sign in with your new password.',
      });
    } catch (error) {
      next(error);
    }
  });
}

export const passwordResetController = new PasswordResetController();
