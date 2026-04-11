import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './types';
import { sseTokenService } from '../../services/sseToken.service';
import { logger } from '../../utils/logger';
import prisma from '../../config/db';

export const verifySseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const sseToken = req.query.sseToken as string;
  const userId = req.params.userId;

  if (!sseToken) {
    res.status(401).json({ success: false, message: 'SSE token required' });
    return;
  }

  if (!userId) {
    res.status(400).json({ success: false, message: 'userId required' });
    return;
  }

  const valid = sseTokenService.consume(sseToken, userId);
  if (!valid) {
    res.status(401).json({ success: false, message: 'Invalid or expired SSE token' });
    return;
  }

  // Load user into req.user for downstream handlers
  try {
    const user =
      (await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })) ||
      (await prisma.client.findUnique({ where: { id: userId }, include: { role: true } }));

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role?.name,
    } as any;

    logger.info({ userId }, '✅ SSE token verified');
    next();
  } catch (error) {
    logger.error({ userId, error }, 'Failed to load user during SSE token verification');
    next(error);
  }
};
