/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomError } from "./customError";
export const internalServerErrorMessage =
  "An unexpected internal server error occurred.";
export class InternalServerError extends CustomError {
  constructor(details?: any) {
    super(internalServerErrorMessage, 500, "INTERNAL_SERVER_ERROR", details);
  }
}
