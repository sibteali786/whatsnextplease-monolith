/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomError } from "./customError";

export class NotFoundError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 404, "NOT_FOUND", details);
  }
}
