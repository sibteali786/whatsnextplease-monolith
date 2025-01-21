import { NextFunction, Response } from 'express';
import { AuthenticatedRequest, UserJwtPayload } from './types';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { Roles } from '@prisma/client';

const SECRET = process.env.SECRET!;

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

// api/middleware/auth/auth.middleware.ts
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

    const decoded = jwt.verify(token, SECRET) as UserJwtPayload;
    req.user = decoded;

    // Verify if the requested userId matches the token's userId
    if (req.params.userId !== decoded.id) {
      res.status(403).json({ message: 'Unauthorized access' });
      return;
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    next(error);
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
