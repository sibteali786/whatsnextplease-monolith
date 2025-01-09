/* eslint-disable @typescript-eslint/no-explicit-any */

import { CustomError } from "./customError";

export class EntityAlreadyExistsError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 409, "ENTITY_ALREADY_EXISTS", details);
  }
}
