import { ErrorResponse } from './types';
export abstract class BaseError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, BaseError.prototype);
  }

  toResponse(): ErrorResponse {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
