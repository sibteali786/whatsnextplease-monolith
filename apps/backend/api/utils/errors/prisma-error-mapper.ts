import { Prisma } from '@prisma/client';
import { BaseError, DatabaseError, NotFoundError, ValidationError } from '@wnp/types';

export class PrismaErrorMapper {
  static mapError(error: Prisma.PrismaClientKnownRequestError): BaseError {
    switch (error.code) {
      case 'P2002':
        return new ValidationError('Database constraint violation', {
          fields: error.meta?.target,
        });
      case 'P2025':
        return new NotFoundError('Record', { details: error.meta });
      case 'P2003':
        return new ValidationError('Foreign key constraint violation', {
          details: error.meta,
        });
      default:
        return new DatabaseError('Database error occurred');
    }
  }
}
