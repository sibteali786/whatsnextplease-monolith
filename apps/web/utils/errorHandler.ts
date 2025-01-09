import { ZodError } from "zod";
import logger from "@/utils/logger";
import { ValidationError } from "@/errors/validationError";
import { CustomError } from "@/errors/customError";
import { UnauthorizedError } from "@/errors/authorizationErrors";
import { NotFoundError } from "@/errors/notFoundError";
import { InvalidDataError } from "@/errors/invalidDataError";
import { EntityAlreadyExistsError } from "@/errors/entityAlreadyExists";
import { InternalServerError } from "@/errors/internalServerError";
// TODO: implement important erorcode with detailed messages from https://www.prisma.io/docs/orm/reference/error-reference and https://www.prisma.io/docs/orm/prisma-client/debugging-and-troubleshooting/handling-exceptions-and-errors
const createErrorResponse = (error: CustomError) => ({
  success: false,
  errorCode: error.errorCodeVal(),
  message: error.message,
  details: error.detailsVal(),
  statusCode: error.statusCodeVal(),
});

const logError = (
  error: CustomError,
  context: string,
  level: "warn" | "error",
) => {
  if (level === "warn") {
    logger.warn({ error }, `Validation error in ${context}.`);
  } else {
    logger.error({ error, context }, `Error in ${context}.`);
  }
};

export const handleError = (error: Error | unknown, context: string) => {
  if (error instanceof ZodError) {
    const validationError = ValidationError.fromZodError(error);
    logError(validationError, context, "warn");
    return createErrorResponse(validationError);
  } else if (
    error instanceof UnauthorizedError ||
    error instanceof NotFoundError ||
    error instanceof InvalidDataError ||
    error instanceof EntityAlreadyExistsError
  ) {
    logError(error, context, "error");
    return createErrorResponse(error);
  } else if (error instanceof CustomError) {
    logError(error, context, "error");
    return createErrorResponse(error);
  } else {
    // Handle unexpected errors gracefully
    const genericError = new InternalServerError({
      originalError: error instanceof Error ? error.message : error,
    });
    logError(genericError, context, "error");
    return createErrorResponse(genericError);
  }
};
