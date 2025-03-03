/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BaseError,
  ErrorResponse,
  InternalServerError,
  ValidationError,
  NotFoundError,
} from '@wnp/types';
import { ErrorHandler } from '../../utils/errors/errorHandler';
import { logger } from '../../utils/logger';
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { PrismaErrorMapper } from '../../utils/errors/prisma-error-mapper';

const errorHandler = new ErrorHandler(logger);

// Type guard for AWS SDK errors
function isAWSError(error: any): boolean {
  return error && typeof error === 'object' && '$metadata' in error && '$fault' in error;
}

export const errorMiddleware = (
  error: Error | BaseError | any, // Using any to accommodate AWS SDK errors
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
    errorContext: error.name,
  };

  try {
    logger.debug({ error, message: 'Error caught in middleware' });

    // Handle AWS SDK errors
    if (isAWSError(error)) {
      const customError = handleAwsErrors(error, requestContext);
      errorHandler.handleError(customError, res);
      return;
    }

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

    // Log the unhandled error type for debugging
    logger.warn({
      message: 'Unhandled error type',
      errorType: error.constructor?.name,
      error: error,
    });

    // Handle unknown errors
    const serverError = new InternalServerError('An unexpected error occurred', {
      error: error.message,
      stack: error.stack,
      requestContext,
    });
    errorHandler.handleError(serverError, res);
  } catch (handlerError) {
    // Failsafe: If error handling itself fails, return a basic 500 response
    logger.error('Error in error handling middleware:', handlerError);
    if (!res.headersSent) {
      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        message: 'An unexpected error occurred while processing the error',
      });
    }
  }
};

function handleAwsErrors(error: any, context: any): BaseError {
  const awsError = error;
  const statusCode = awsError.$metadata?.httpStatusCode || 500;
  const errorCode = awsError.name || 'AWS_ERROR';
  let customError;

  // Handle specific AWS error types
  if (statusCode === 404 || errorCode.includes('NotFound')) {
    customError = new NotFoundError(error.message || 'Resource not found in AWS', {
      awsRequestId: awsError.$metadata?.requestId,
      awsErrorDetails: awsError,
      context,
    });
  } else {
    customError = new InternalServerError(error.message || 'AWS service error', {
      code: errorCode,
      status: statusCode,
      awsRequestId: awsError.$metadata?.requestId,
      awsErrorDetails: awsError,
      context,
    });
  }
  return customError;
}
