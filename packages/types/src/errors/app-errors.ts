import { BaseError } from './base-error';
import { ErrorCodes, HttpStatus } from './constants';
import { ErrorDetails } from './types';
export class InternalServerError extends BaseError {
  constructor(message = 'An unexpected error occurred', details?: ErrorDetails) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL, details);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCodes.BAD_REQUEST, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized access', details?: ErrorDetails) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Access forbidden', details?: ErrorDetails) {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}
export class ValidationError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, ErrorCodes.VALIDATION, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
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
    // fixes the instanceOf check
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.DATABASE, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class FileUploadError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, HttpStatus.BAD_GATEWAY, ErrorCodes.FILE_UPLOAD_FAILED, details);
    Object.setPrototypeOf(this, FileUploadError.prototype);
  }
}
