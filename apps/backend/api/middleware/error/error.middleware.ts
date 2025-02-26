import { BaseError, ErrorResponse, InternalServerError, ValidationError } from '@wnp/types';
import { ErrorHandler } from '../../utils/errors/errorHandler';
import { logger } from '../../utils/logger';
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { PrismaErrorMapper } from '../../utils/errors/prisma-error-mapper';

const errorHandler = new ErrorHandler(logger);

export const errorMiddleware = (
  error: Error | BaseError,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(error);
  }
  const requestContext = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
  try {
    // Handle Zod Validations
    if (error instanceof ZodError) {
      const validationError = new ValidationError(error.errors.map(e => e.message).join(', '), {
        errors: error.errors,
        requestContext,
      });
      errorHandler.handleError(validationError, res);
      return;
    }

    // Handle Prisma related Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const mappedError = PrismaErrorMapper.mapError(error);
      mappedError.details = { ...(mappedError.details as object), requestContext };
      errorHandler.handleError(mappedError, res);
      return;
    }
    // Handle custom BaseError instances
    if (error instanceof BaseError) {
      error.details = { ...(error.details as object), requestContext };
      errorHandler.handleError(error, res);
      return;
    }

    // Handle unknown errors
    const serverError = new InternalServerError('An unexpected error occurred', {
      error: error.message,
      requestContext,
    });
    errorHandler.handleError(serverError, res);
  } catch (error) {
    // Failsafe: If error handling itself fails, return a basic 500 response
    logger.error('Error in error handling middleware:', error);
    if (!res.headersSent) {
      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        message: 'An unexpected error occurred while processing the error',
      });
    }
  }
};
