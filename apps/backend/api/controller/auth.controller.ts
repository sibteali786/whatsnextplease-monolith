import { Request, Response, NextFunction } from 'express';
import { emailVerificationService } from '../services/emailVerification.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';

export class AuthController {
  /**
   * POST /auth/verify-email
   * Verify email using token
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      const result = await emailVerificationService.verifyEmail({ token });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /auth/resend-verification
   * Resend verification email
   */
  resendVerificationEmail = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Email address is required',
          });
        }

        await emailVerificationService.resendVerificationEmail(email);

        return res.status(200).json({
          success: true,
          message: 'Verification email sent successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );
}
export const authController = new AuthController();
