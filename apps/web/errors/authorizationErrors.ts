/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomError } from "./customError";

export class UnauthorizedError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}
