import { BaseError } from '@wnp/types/src/errors';
import { InternalServerError } from '@wnp/types/src/errors';
import { Response } from 'express';
import { Logger } from 'pino';

export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  public handleError(error: Error | BaseError, res: Response): void {
    if (error instanceof BaseError) {
      const response = error.toResponse();
      this.logger.error({
        statusCode: response.status,
        ...response,
        timestamp: new Date().toISOString(),
      });
      res.status(response.status).json(response);
    } else {
      this.logger.error({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        timestamp: new Date().toISOString(),
      });

      const serverError = new InternalServerError();
      res.status(serverError.status).json(serverError.toResponse());
    }
  }
}
