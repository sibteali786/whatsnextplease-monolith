import { PrismaErrorMapper } from '../utils/errors/prisma-error-mapper';
import prisma from '../config/db';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NotFoundError } from '@wnp/types';
import { logger } from './logger';

export async function checkIfUserExists(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found');
      throw new NotFoundError('User', { userId });
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      // Handle Prisma specific errors
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code &&
        error.code.startsWith('P')
      ) {
        throw PrismaErrorMapper.mapError(error);
      }

      // Log and rethrow any other unexpected errors
      throw error;
    }
    return false;
  }
}

export async function checkIfClientExists(clientId: string): Promise<boolean> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      logger.warn({ clientId }, 'Client not found');
      throw new NotFoundError('Client', { clientId });
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      // Handle Prisma specific errors
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code &&
        error.code.startsWith('P')
      ) {
        throw PrismaErrorMapper.mapError(error);
      }

      // Log and rethrow any other unexpected errors
      throw error;
    }
    return false;
  }
}
