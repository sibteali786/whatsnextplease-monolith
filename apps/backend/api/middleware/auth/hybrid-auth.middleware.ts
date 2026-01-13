import { NextFunction, Response } from 'express';
import { AuthenticatedRequest, UserJwtPayload } from './types';
import { logger } from '../../utils/logger';
import { getAuthService } from '@HillCountryCoder/auth-client';
import jwt from 'jsonwebtoken';
import { Roles } from '@prisma/client';
import prisma from '../../config/db';

const SECRET = process.env.SECRET!;
const authService = getAuthService();

/**
 * Hybrid authentication middleware
 * Tries Cognito/Keycloak first, falls back to legacy JWT
 * This allows both old and new users to authenticate
 */
export const verifyTokenHybrid = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token safely
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      logger.warn('Unauthorized Request - No authorization header');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token || token === 'undefined') {
      logger.warn('Unauthorized Request - Invalid token format');
      return res.status(401).json({ message: 'No token provided' });
    }

    // STRATEGY 1: Try Cognito/Keycloak authentication first
    try {
      const cognitoResult = await authService.validateToken(token);

      if (cognitoResult.isValid && cognitoResult.user) {
        const { user: cognitoUser } = cognitoResult;

        // Determine user type from groups
        const isInternalUser = cognitoUser.groups?.some(g => g.includes('WnpInternalUsers'));
        const isExternalClient = cognitoUser.groups?.some(g => g.includes('WnpExternalClients'));

        let dbEntity: any = null;
        let userRole: Roles | null = null;

        if (isInternalUser) {
          dbEntity = await prisma.user.findUnique({
            where: { cognitoSub: cognitoUser.sub },
            include: { role: true },
          });
          userRole = dbEntity?.role?.name || Roles.TASK_AGENT;
        } else if (isExternalClient) {
          dbEntity = await prisma.client.findUnique({
            where: { cognitoSub: cognitoUser.sub },
            include: { role: true },
          });
          userRole = Roles.CLIENT;
        }

        if (dbEntity) {
          req.user = {
            id: dbEntity.id,
            username: dbEntity.username,
            role: userRole!,
            cognitoSub: cognitoUser.sub,
            email: cognitoUser.email,
            groups: cognitoUser.groups,
          } as UserJwtPayload;

          logger.info(`✅ Authenticated via Cognito: ${dbEntity.username}`);
          return next();
        }

        // User found in IDP but not in DB - this is an error state
        logger.warn(`User ${cognitoUser.sub} found in IDP but not in database`);
        return res.status(404).json({ message: 'User not found in database' });
      }

      // Cognito validation failed, continue to legacy JWT
      if (cognitoResult.error) {
        logger.debug(`Cognito validation failed: ${cognitoResult.error}`);
      }
    } catch (cognitoError) {
      logger.debug(
        `Cognito validation error: ${cognitoError instanceof Error ? cognitoError.message : String(cognitoError)}`
      );
      // Continue to legacy JWT fallback
    }

    // STRATEGY 2: Fallback to legacy JWT authentication
    try {
      if (!SECRET) {
        logger.error('SECRET environment variable not configured');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const decodedUser = jwt.verify(token, SECRET) as UserJwtPayload;

      // Verify user still exists in database
      let dbEntity = null;
      if (decodedUser.role !== Roles.CLIENT) {
        dbEntity = await prisma.user.findUnique({
          where: { id: decodedUser.id },
          include: { role: true },
        });
      } else {
        dbEntity = await prisma.client.findUnique({
          where: { id: decodedUser.id },
          include: { role: true },
        });
      }

      if (dbEntity) {
        req.user = {
          id: dbEntity.id,
          username: dbEntity.username,
          role: dbEntity.role?.name || decodedUser.role,
        } as UserJwtPayload;

        logger.info(`✅ Authenticated via Legacy JWT: ${dbEntity.username}`);
        return next();
      }

      logger.warn(`User ${decodedUser.id} not found in database`);
      return res.status(404).json({ message: 'User not found' });
    } catch (jwtError) {
      logger.debug(
        `Legacy JWT validation failed: ${jwtError instanceof Error ? jwtError.message : String(jwtError)}`
      );
    }

    // Both authentication methods failed
    logger.warn('All authentication methods failed for token');
    return res.status(401).json({ message: 'Invalid or expired token' });
  } catch (error) {
    logger.error('Hybrid authentication error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};
