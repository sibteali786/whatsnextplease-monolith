import { Request, Response, NextFunction } from 'express';
import { emailVerificationService } from '../services/emailVerification.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { Roles } from '@prisma/client';

export class AuthController {
  /**
   * POST /auth/send-verification-email
   * Internal endpoint to send verification email after signup
   */
  sendVerificationEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityRole, email, name } = req.body;

      // Validate required fields
      if (!entityId || !entityRole || !email || !name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: entityId, entityRole, email, name',
        });
      }

      // Validate entityRole is a valid Roles enum
      if (!Object.values(Roles).includes(entityRole)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entityRole provided',
        });
      }

      const { success, blocked, message } =
        await emailVerificationService.createAndSendVerificationToken({
          entityId,
          entityRole,
          email,
          name,
        });
      if (success && !blocked) {
        return res.status(200).json({
          success: success,
          blocked,
          message: 'Verification email sent successfully',
        });
      } else if (success && blocked) {
        return res.status(200).json({
          success: success,
          blocked,
          message,
        });
      }

      return res.status(500).json({
        success: false,
        blocked,
        message,
      });
    } catch (error) {
      next(error);
    }
  });
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
   * ✅ NEW: POST /auth/resend-verification (Authenticated)
   * Resend verification email for logged-in user
   */
  resendVerificationEmail = asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Get user info from JWT (set by auth middleware)
        const userId = req.user?.id;
        const userRole = req.user?.role; // CLIENT or TASK_SUPERVISOR etc

        if (!userId || !userRole) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
          });
        }

        const result = await emailVerificationService.resendVerificationEmailForUser(
          userId,
          userRole
        );
        if (result.success && !result.blocked) {
          return res.status(200).json({
            success: true,
            blocked: result.blocked,
            message: 'Verification email sent successfully',
          });
        } else if (result.success && result.blocked) {
          return res.status(200).json({
            success: true,
            blocked: result.blocked,
            message: result.message,
          });
        }
        return res.status(500).json({
          success: false,
          blocked: result.blocked,
          message: result.message,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * LEGACY: POST /auth/resend-verification-by-email
   * Resend verification by email (for unauthenticated users - kept for backward compatibility)
   */
  resendVerificationByEmail = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Email address is required',
          });
        }

        await emailVerificationService.resendVerificationEmailByEmail(email);

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
