import { NextFunction, Response } from 'express';
import { AuthenticatedRequest, UserJwtPayload } from './types';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { Roles } from '@prisma/client';
import prisma from '../../config/db';
import { getAuthService } from '@HillCountryCoder/auth-client';

const SECRET = process.env.SECRET!;
const idpAuthService = getAuthService();

export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Unauthorized Request');
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decodedUser = jwt.verify(token, SECRET) as UserJwtPayload;
    req.user = decodedUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    next(error);
  }
};

/**
 * Verify token from query string
 * Supports both legacy JWT and IDP tokens
 */
export const verifyTokenFromQuery = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    // Verify if the requested userId matches the token's userId
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ message: 'Missing userId parameter' });
      return;
    }

    let decoded: any = null;
    let dbEntity: any = null;

    // STRATEGY 1: Try legacy JWT verification
    try {
      decoded = jwt.verify(token, SECRET) as UserJwtPayload;

      // Verify user exists and userId matches
      if (decoded.role !== Roles.CLIENT) {
        dbEntity = await prisma.user.findUnique({
          where: { id: decoded.id },
          include: { role: true },
        });
      } else {
        dbEntity = await prisma.client.findUnique({
          where: { id: decoded.id },
          include: { role: true },
        });
      }

      if (!dbEntity) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      if (userId !== dbEntity.id) {
        res.status(403).json({ message: 'Unauthorized access' });
        return;
      }

      req.user = {
        id: dbEntity.id,
        username: dbEntity.username,
        role: dbEntity.role?.name || decoded.role,
      } as UserJwtPayload;

      logger.info(`✅ Token verified via Legacy JWT for user: ${dbEntity.username}`);
      return next();
    } catch (jwtError) {
      logger.debug(
        `Legacy JWT verification failed: ${jwtError instanceof Error ? jwtError.message : String(jwtError)}`
      );
      // Continue to IDP verification
    }

    // STRATEGY 2: Try IDP token verification
    try {
      const idpResult = await idpAuthService.validateToken(token);

      if (!idpResult.isValid) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }

      if (!idpResult.user) {
        res.status(401).json({ message: 'Invalid token payload' });
        return;
      }

      const cognitoUser = idpResult.user;

      // Determine user type from groups
      const isInternalUser = cognitoUser.groups?.some(g => g.includes('WnpInternalUsers'));
      const isExternalClient = cognitoUser.groups?.some(g => g.includes('WnpExternalClients'));

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

      if (!dbEntity) {
        res.status(404).json({ message: 'User not found in database' });
        return;
      }

      if (userId !== dbEntity.id) {
        res.status(403).json({ message: 'Unauthorized access' });
        return;
      }

      req.user = {
        id: dbEntity.id,
        username: dbEntity.username,
        role: userRole!,
        cognitoSub: cognitoUser.sub,
        email: cognitoUser.email,
        groups: cognitoUser.groups,
      } as UserJwtPayload;

      logger.info(`✅ Token verified via IDP for user: ${dbEntity.username}`);
      return next();
    } catch (idpError) {
      logger.debug(
        `IDP token verification failed: ${idpError instanceof Error ? idpError.message : String(idpError)}`
      );
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

export const requireRole = (allowedRoles: Roles[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
