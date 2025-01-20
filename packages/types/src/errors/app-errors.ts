import { BaseError } from './base-error';
import { ErrorCodes, HttpStatus } from './constants';
import { ErrorDetails } from './types';
export class InternalServerError extends BaseError {
  constructor(message = 'An unexpected error occurred', details?: ErrorDetails) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL, details);
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCodes.BAD_REQUEST, details);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized access', details?: ErrorDetails) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Access forbidden', details?: ErrorDetails) {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN, details);
  }
}
export class ValidationError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, ErrorCodes.VALIDATION, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string, details?: ErrorDetails) {
    super(
      `The requested ${resource} could not be found`,
      HttpStatus.NOT_FOUND,
      ErrorCodes.NOT_FOUND,
      details
    );
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.DATABASE, details);
  }
}
