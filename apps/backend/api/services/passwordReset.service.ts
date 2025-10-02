import crypto from 'crypto';
import { emailService } from './email.service';
import { hashPW } from '../utils/auth/hashPW';
import { logger } from '../utils/logger';
import { env } from '../config/environment';
import prisma from '../config/db';
import { NotFoundError, UnauthorizedError } from '@wnp/types';
import { Roles } from '@prisma/client';

const TOKEN_EXPIRY_HOURS = env.PASSWORD_RESET_TOKEN_EXPIRY_HOURS || 1;

export class PasswordResetService {
  /**
   * Generate secure random token
   * WHY: crypto.randomBytes is cryptographically secure vs Math.random()
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token before storing
   * WHY: If database is compromised, tokens can't be used
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Request password reset by email
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      // Find user or client by email
      const [user, client] = await prisma.$transaction([
        prisma.user.findUnique({ where: { email } }),
        prisma.client.findUnique({ where: { email } }),
      ]);

      const entity = user || client;

      // SECURITY: Always return success even if email not found
      // WHY: Prevents email enumeration attacks
      if (!entity) {
        logger.warn({ email }, 'Password reset requested for non-existent email');
        // Still return success to prevent email enumeration
        return;
      }
      // only using Super User so we can suppress ts errors for entityType
      const entityType = user ? Roles.SUPER_USER : Roles.CLIENT;
      const name = user
        ? `${user.firstName} ${user.lastName}`
        : client?.contactName || client?.companyName || 'User';

      // Generate token (plaintext version sent via email)
      const plainToken = this.generateToken();
      const hashedToken = this.hashToken(plainToken);

      // Delete any existing reset tokens for this entity
      await prisma.passwordResetToken.deleteMany({
        where: entityType !== Roles.CLIENT ? { userId: entity.id } : { clientId: entity.id },
      });

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          expiresAt: new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
          ...(entityType !== Roles.CLIENT ? { userId: entity.id } : { clientId: entity.id }),
        },
      });

      // Send password reset email
      await emailService.sendPasswordResetEmail(
        entity.email,
        plainToken, // Send plaintext token via email
        name
      );

      logger.info(
        { entityId: entity.id, entityType, email: entity.email },
        'Password reset email sent'
      );
    } catch (error) {
      logger.error({ error, email }, 'Failed to process password reset request');
      throw error;
    }
  }

  /**
   * Verify reset token and return entity info
   */
  async verifyResetToken(token: string): Promise<{
    entityId: string;
    entityType: Roles;
  }> {
    try {
      const hashedToken = this.hashToken(token);

      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token: hashedToken },
        include: {
          user: true,
          client: true,
        },
      });

      if (!tokenRecord) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }

      if (new Date() > tokenRecord.expiresAt) {
        // Clean up expired token
        await prisma.passwordResetToken.delete({
          where: { id: tokenRecord.id },
        });
        throw new UnauthorizedError('Reset token has expired. Please request a new one.');
      }

      const entity = tokenRecord.user || tokenRecord.client;
      const entityType = tokenRecord.user ? Roles.SUPER_USER : Roles.CLIENT;

      if (!entity) {
        throw new NotFoundError('Associated user or client not found');
      }

      return {
        entityId: entity.id,
        entityType,
      };
    } catch (error) {
      logger.error({ error }, 'Token verification failed');
      throw error;
    }
  }

  /**
   * Reset password with valid token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Verify token first
      const { entityId, entityType } = await this.verifyResetToken(token);

      // Hash new password
      const hashedPassword = await hashPW(newPassword);

      // Update password
      if (entityType !== Roles.CLIENT) {
        await prisma.user.update({
          where: { id: entityId },
          data: { passwordHash: hashedPassword },
        });
      } else {
        await prisma.client.update({
          where: { id: entityId },
          data: { passwordHash: hashedPassword },
        });
      }

      // Delete all reset tokens for this entity
      await prisma.passwordResetToken.deleteMany({
        where: entityType !== Roles.CLIENT ? { userId: entityId } : { clientId: entityId },
      });

      logger.info({ entityId, entityType }, 'Password reset successfully');
    } catch (error) {
      logger.error({ error }, 'Password reset failed');
      throw error;
    }
  }
}
export const passwordResetService = new PasswordResetService();
