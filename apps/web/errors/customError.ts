/* eslint-disable @typescript-eslint/no-explicit-any */
// errors/CustomError.ts

export class CustomError extends Error {
  private statusCode: number;
  private errorCode: string;
  private details?: any;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    details?: any,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
    this.name = this.constructor.name;

    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  errorCodeVal() {
    return this.errorCode;
  }

  detailsVal() {
    return this.details;
  }

  statusCodeVal() {
    return this.statusCode;
  }
}
