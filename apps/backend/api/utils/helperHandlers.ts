import { PrismaErrorMapper } from '../utils/errors/prisma-error-mapper';
import prisma from '../config/db';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NotFoundError, InternalServerError } from '@wnp/types';
import { logger } from './logger';

export async function checkIfUserExists(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found');
      throw new NotFoundError('User', { userId });
    }
  } catch (error) {
    // Handle Prisma specific errors
    if (error instanceof PrismaClientKnownRequestError) {
      throw PrismaErrorMapper.mapError(error);
    }

    // Rethrow NotFoundError or any known BaseError
    if (error instanceof NotFoundError) {
      throw error;
    }

    // For any other error, log and throw internal server error
    logger.error('Unexpected error in checkIfUserExists:', error);
    throw new InternalServerError('Failed to check user existence', { userId });
  }
}

export async function checkIfClientExists(clientId: string): Promise<void> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      logger.warn({ clientId }, 'Client not found');
      throw new NotFoundError('Client', { clientId });
    }
  } catch (error) {
    // Handle Prisma specific errors
    if (error instanceof PrismaClientKnownRequestError) {
      throw PrismaErrorMapper.mapError(error);
    }

    // Rethrow NotFoundError or any known BaseError
    if (error instanceof NotFoundError) {
      throw error;
    }

    // For any other error, log and throw internal server error
    logger.error('Unexpected error in checkIfClientExists:', error);
    throw new InternalServerError('Failed to check client existence', { clientId });
  }
}
