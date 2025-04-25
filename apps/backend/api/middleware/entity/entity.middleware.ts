import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '@wnp/types';

/**
 * Middleware to validate entity type parameter
 * This helps by validating entity type early in the request lifecycle
 */
export const validateEntityType = (req: Request, res: Response, next: NextFunction) => {
  const entityType = req.params.type;

  if (!entityType) {
    return next(new BadRequestError('Entity type is required'));
  }

  if (!['user', 'client'].includes(entityType)) {
    return next(new BadRequestError('Invalid entity type. Must be "user" or "client"'));
  }

  next();
};
