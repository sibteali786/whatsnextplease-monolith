import crypto from 'crypto';
import prisma from '../config/db';
import { emailService } from './email.service';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '@wnp/types';

interface CreateVerificationTokenParams {
  entityId: string;
  entityType: 'user' | 'client';
  email: string;
  name: string;
}

interface VerifyEmailParams {
  token: string;
}

export class EmailVerificationService {
  private readonly TOKEN_EXPIRY_HOURS = 24;
  private readonly MAX_RESEND_ATTEMPTS = 3;
  private readonly RESEND_COOLDOWN_MINUTES = 5;

  /**
   * Create and send verification token
   */
  async createAndSendVerificationToken(params: CreateVerificationTokenParams): Promise<void> {
    const { entityId, entityType, email, name } = params;

    try {
      // Check rate limiting
      await this.checkRateLimit(entityId, entityType);

      // Generate token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = this.hashToken(rawToken);

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

      // Invalidate any existing tokens for this user
      await this.invalidateExistingTokens(entityId, entityType);

      // Create new token
      await prisma.emailVerificationToken.create({
        data: {
          token: hashedToken,
          expiresAt,
          [entityType === 'user' ? 'userId' : 'clientId']: entityId,
        },
      });

      // Send email
      await emailService.sendVerificationEmail(email, rawToken, name, entityType);

      logger.info({ entityId, entityType, email }, 'Verification email sent successfully');
    } catch (error) {
      logger.error({ error, entityId, entityType }, 'Failed to create verification token');
      throw error;
    }
  }

  /**
   * Verify email using token
   */
  async verifyEmail(params: VerifyEmailParams): Promise<{ success: boolean; message: string }> {
    const { token } = params;

    try {
      const hashedToken = this.hashToken(token);

      // Find token
      const tokenRecord = await prisma.emailVerificationToken.findUnique({
        where: { token: hashedToken },
        include: {
          user: true,
          client: true,
        },
      });

      if (!tokenRecord) {
        throw new NotFoundError('Invalid verification token');
      }

      // Check expiry
      if (tokenRecord.expiresAt < new Date()) {
        // Delete expired token
        await prisma.emailVerificationToken.delete({
          where: { id: tokenRecord.id },
        });
        throw new BadRequestError('Verification token has expired. Please request a new one.');
      }

      // Determine entity type
      const entity = tokenRecord.user || tokenRecord.client;
      const entityType = tokenRecord.user ? 'user' : 'client';

      if (!entity) {
        throw new NotFoundError('Associated user or client not found');
      }

      // Check if already verified
      if (entity.emailVerified) {
        // Delete token even if already verified
        await prisma.emailVerificationToken.delete({
          where: { id: tokenRecord.id },
        });
        return {
          success: true,
          message: 'Email already verified',
        };
      }

      // Update entity as verified
      if (entityType === 'user') {
        await prisma.user.update({
          where: { id: entity.id },
          data: {
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
      } else {
        await prisma.client.update({
          where: { id: entity.id },
          data: {
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
      }

      // Delete token (single-use)
      await prisma.emailVerificationToken.delete({
        where: { id: tokenRecord.id },
      });

      logger.info(
        { entityId: entity.id, entityType, email: entity.email },
        'Email verified successfully'
      );

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      logger.error({ error }, 'Email verification failed');
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      // Find user or client by email
      const user = await prisma.user.findUnique({ where: { email } });
      const client = await prisma.client.findUnique({ where: { email } });

      const entity = user || client;
      const entityType = user ? 'user' : 'client';

      if (!entity) {
        throw new NotFoundError('No account found with this email address');
      }

      if (entity.emailVerified) {
        throw new BadRequestError('Email already verified');
      }

      const name = user
        ? `${user.firstName} ${user.lastName}`
        : client?.contactName || client?.companyName || 'there';

      await this.createAndSendVerificationToken({
        entityId: entity.id,
        entityType: entityType as 'user' | 'client',
        email: entity.email,
        name,
      });
    } catch (error) {
      logger.error({ error, email }, 'Failed to resend verification email');
      throw error;
    }
  }

  /**
   * Check rate limiting for verification emails
   */
  private async checkRateLimit(entityId: string, entityType: 'user' | 'client'): Promise<void> {
    const recentTokens = await prisma.emailVerificationToken.findMany({
      where: {
        [entityType === 'user' ? 'userId' : 'clientId']: entityId,
        createdAt: {
          gte: new Date(Date.now() - this.RESEND_COOLDOWN_MINUTES * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentTokens.length >= this.MAX_RESEND_ATTEMPTS) {
      throw new TooManyRequestsError(
        `Too many verification attempts. Please wait ${this.RESEND_COOLDOWN_MINUTES} minutes before requesting another email.`
      );
    }
  }

  /**
   * Invalidate existing tokens
   */
  private async invalidateExistingTokens(
    entityId: string,
    entityType: 'user' | 'client'
  ): Promise<void> {
    await prisma.emailVerificationToken.deleteMany({
      where: {
        [entityType === 'user' ? 'userId' : 'clientId']: entityId,
      },
    });
  }

  /**
   * Hash token using SHA256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Cleanup expired tokens (run as cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info({ count: result.count }, 'Cleaned up expired verification tokens');
    return result.count;
  }
}

// Export singleton instance
export const emailVerificationService = new EmailVerificationService();
