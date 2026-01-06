import { NextFunction, Response } from 'express';
import { AuthenticatedRequest, UserJwtPayload } from './types';
import { logger } from '../../utils/logger';
import { getAuthService, UserGroup } from '@HillCountryCoder/auth-client';
import { Roles } from '@prisma/client';
import prisma from '../../config/db';

const authService = getAuthService();
/**
 * Middleware to verify Cognito/Keycloak tokens
 * Validates token and loads user from database by cognitoSub
 */
export const verifyCognitoToken = async (
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

    // Validate token using auth-client
    const result = await authService.validateToken(token);

    if (!result.isValid || !result.user) {
      logger.warn('Unauthorized Request - Invalid Cognito token');
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    const { user: cognitoUser } = result;

    // Determine if this is a User or Client based on Cognito groups
    const isInternalUser = cognitoUser.groups.includes(UserGroup.WnpInternalUsers);
    const isExternalClient = cognitoUser.groups.includes(UserGroup.WnpExternalClients);

    if (!isInternalUser && !isExternalClient) {
      logger.warn(`User ${cognitoUser.sub} not in any valid WNP group`);
      res.status(403).json({ message: 'Access denied - no valid role assigned' });
      return;
    }

    // Query the appropriate table based on group
    let dbEntity: any = null;
    let userRole: Roles | null = null;

    if (isInternalUser) {
      // Look up in User table
      dbEntity = await prisma.user.findUnique({
        where: { cognitoSub: cognitoUser.sub },
        include: { role: true },
      });

      if (!dbEntity) {
        logger.warn(`User with cognitoSub ${cognitoUser.sub} not found in database`);
        res.status(404).json({ message: 'User not found in system' });
        return;
      }

      userRole = dbEntity.role?.name || Roles.TASK_AGENT;
    } else if (isExternalClient) {
      // Look up in Client table
      dbEntity = await prisma.client.findUnique({
        where: { cognitoSub: cognitoUser.sub },
        include: { role: true },
      });

      if (!dbEntity) {
        logger.warn(`Client with cognitoSub ${cognitoUser.sub} not found in database`);
        res.status(404).json({ message: 'Client not found in system' });
        return;
      }

      userRole = Roles.CLIENT;
    }

    // Attach user info to request (matching old JWT format)
    req.user = {
      id: dbEntity.id,
      username: dbEntity.username,
      role: userRole!,
      cognitoSub: cognitoUser.sub,
      email: cognitoUser.email,
      groups: cognitoUser.groups,
    } as UserJwtPayload;

    logger.info(`User authenticated via Cognito: ${dbEntity.username} (${cognitoUser.sub})`);
    next();
  } catch (error) {
    logger.error('Cognito token verification error:', error);
    res.status(401).json({ message: 'Token validation failed' });
  }
};
