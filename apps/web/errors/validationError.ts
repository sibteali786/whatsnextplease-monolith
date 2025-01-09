/* eslint-disable @typescript-eslint/no-explicit-any */
// errors/ValidationError.ts

import { ZodError } from "zod";
import { CustomError } from "./customError";

export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }

  static fromZodError(zodError: ZodError) {
    const details = zodError.flatten();
    return new ValidationError("Validation failed.", details);
  }
}
