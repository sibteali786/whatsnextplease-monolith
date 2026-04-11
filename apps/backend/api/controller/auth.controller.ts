import { Request, Response, NextFunction } from 'express';
import { emailVerificationService } from '../services/emailVerification.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { Roles } from '@prisma/client';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { sseTokenService } from '../services/sseToken.service';

export class AuthController {
  /**
   * POST /auth/signin
   * Login with auto-migration
   */
  signin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
      }

      // Call auth service
      const result = await authService.signin({ username, password });

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.error || 'Invalid credentials',
        });
      }

      // Log migration status
      if (result.migrated) {
        logger.info(`✅ User ${username} migrated during signin`);
      } else if (result.usedLegacy) {
        logger.warn(`⚠️ User ${username} using legacy JWT (IDP unavailable)`);
      }

      return res.status(200).json({
        success: true,
        message: result.message || 'Logged in successfully',
        token: result.token,
        user: result.user,
        client: result.client,
        refreshToken: result.refreshToken,
        idToken: result.idToken,
        expiresIn: result.expiresIn,
        refreshExpiresIn: result.refreshExpiresIn,
        migrated: result.migrated || false,
        usedLegacy: result.usedLegacy || false,
      });
    } catch (error) {
      logger.error('Signin controller error:', error);
      next(error);
    }
  });
  /**
   * POST /auth/signup
   * Register new user (creates in IDP first, then database)
   */
  signup = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, username, firstName, lastName, companyName, contactName, role } =
        req.body;
      // Validate required fields
      if (!email || !password || !username || !role) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, username, and role are required',
        });
      }

      // Validate role
      if (!Object.values(Roles).includes(role as Roles)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role provided',
        });
      }

      // Validate role-specific fields
      if (role === Roles.CLIENT && !companyName) {
        return res.status(400).json({
          success: false,
          message: 'Company name is required for clients',
        });
      }

      if (role !== Roles.CLIENT && (!firstName || !lastName)) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required',
        });
      }

      // Call auth service

      const result = await authService.signup({
        email,
        password,
        username,
        firstName,
        lastName,
        companyName,
        contactName,
        role: role as Roles,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Signup failed',
        });
      }

      return res.status(201).json({
        success: true,
        message: result.message || 'Account created successfully',
        token: result.token,
        refreshToken: result.refreshToken,
        idToken: result.idToken,
        expiresIn: result.expiresIn,
        refreshExpiresIn: result.refreshExpiresIn,
        user: result.user,
        client: result.client,
      });
    } catch (error) {
      logger.error('Signup controller error:', error);
      next(error);
    }
  });
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
   * POST /auth/resend-verification (Authenticated)
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

  /**
   * GET /auth/me
   * Get current user or client info
   */
  me = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Missing authorization header' });
      }

      const token = authHeader.split(' ')[1];
      const result = await authService.getCurrentEntityFromToken(token);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.error || 'Invalid or expired token',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: result.user,
          client: result.client,
        },
      });
    } catch (error) {
      logger.error('Current user error:', error);
      next(error);
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  refresh = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const result = await authService.refreshToken(refreshToken);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.error || 'Failed to refresh token',
        });
      }

      return res.status(200).json({
        success: true,
        token: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      logger.error('Refresh controller error:', error);
      next(error);
    }
  });

  // Add to AuthController class
  issueSseToken = asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const sseToken = sseTokenService.issue(userId);

        return res.status(200).json({
          success: true,
          sseToken,
          expiresIn: 60,
        });
      } catch (error) {
        next(error);
      }
    }
  );
}

export const authController = new AuthController();
