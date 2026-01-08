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
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Unauthorized Request - No token provided');
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    // STRATEGY 1: Try Cognito/Keycloak authentication first
    try {
      const cognitoResult = await authService.validateToken(token);

      console.log('Cognito validation result:', cognitoResult);

      if (cognitoResult.isValid && cognitoResult.user) {
        const { user: cognitoUser } = cognitoResult;

        // Determine user type from groups
        const isInternalUser = cognitoUser.groups.some(g => g.includes('WnpInternalUsers'));
        const isExternalClient = cognitoUser.groups.some(g => g.includes('WnpExternalClients'));

        let dbEntity: any = null;
        let userRole: Roles | null = null;
        if (isInternalUser) {
          console.log('Identified as internal user');
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
        console.log('Database entity found:', dbEntity);

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
      }
      if (cognitoResult.error) {
        throw new Error(cognitoResult.error);
      }
    } catch (cognitoError) {
      console.log('Cognito validation error:', cognitoError);
      // Cognito validation failed, continue to legacy JWT
      logger.debug('Cognito validation failed, trying legacy JWT');
    }

    // STRATEGY 2: Fallback to legacy JWT authentication
    try {
      console.log('Trying legacy JWT authentication', token, SECRET);
      const decodedUser = jwt.verify(token, SECRET) as UserJwtPayload;
      console.log('Legacy JWT decoded user:', decodedUser);
      // Verify user still exists in database
      if (decodedUser?.role !== Roles.CLIENT) {
        const user = await prisma.user.findUnique({
          where: { id: decodedUser.id },
          include: { role: true },
        });

        if (user) {
          req.user = {
            id: user.id,
            username: user.username,
            role: user.role?.name || Roles.TASK_AGENT,
          } as UserJwtPayload;

          logger.info(`✅ Authenticated via Legacy JWT: ${user.username}`);
          return next();
        }
      } else {
        // Try client table
        const client = await prisma.client.findUnique({
          where: { id: decodedUser.id },
          include: { role: true },
        });

        if (client) {
          req.user = {
            id: client.id,
            username: client.username,
            role: Roles.CLIENT,
          } as UserJwtPayload;

          logger.info(`✅ Authenticated via Legacy JWT: ${client.username} (client)`);
          return next();
        }
      }
      console.log('User not found in database for legacy JWT:', decodedUser);

      // User not found in either table
      logger.warn(`User ${decodedUser.id} not found in database`);
      res.status(404).json({ message: 'User not found' });
      return;
    } catch (jwtError) {
      console.log('Legacy JWT validation error:', jwtError);
      logger.warn('Legacy JWT validation failed');
    }

    // Both authentication methods failed
    logger.warn('All authentication methods failed');
    res.status(401).json({ message: 'Invalid or expired token' });
  } catch (error) {
    logger.error('Hybrid authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};
