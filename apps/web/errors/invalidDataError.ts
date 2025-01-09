/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomError } from "./customError";

export class InvalidDataError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, "INVALID_DATA", details);
  }
}
