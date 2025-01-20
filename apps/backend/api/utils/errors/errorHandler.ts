import { BaseError, InternalServerError } from '@wnp/types/src/errors';
import type { Logger } from '@wnp/types';
import { Response } from 'express';

export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  public handleError(error: Error | BaseError, res: Response): void {
    if (error instanceof BaseError) {
      const response = error.toResponse();

      this.logger.error({
        statusCode: response.status,
        code: response.code,
        message: response.message,
        details: response.details,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });

      res.status(response.status).json(response);
    } else {
      this.logger.error({
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      });

      const serverError = new InternalServerError();
      res.status(serverError.status).json(serverError.toResponse());
    }
  }
}
