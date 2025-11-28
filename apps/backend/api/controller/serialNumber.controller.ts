import { Request, Response } from 'express';
import { TaskSerialNumberService } from '../services/taskSerialNumber.service';
import { TaskRepository } from '../repositories/task.repository';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { BadRequestError, NotFoundError } from '@wnp/types';
import { logger } from '../utils/logger';
import { SuccessResponse } from '../utils/handlers/successResponse';
import { AuthenticatedRequest } from '../middleware/auth';
import { canViewTasks } from '../utils/tasks/taskPermissions';

const serialNumberService = new TaskSerialNumberService();
const taskRepository = new TaskRepository();

/**
 * GET /api/task-sequences/suggest-prefix
 * Suggest a prefix for a given category
 * Query params: categoryId
 */
export const suggestPrefix = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.query;
  console.log('Received categoryId:', req.query);

  if (!categoryId || typeof categoryId !== 'string') {
    throw new BadRequestError('categoryId query parameter is required');
  }

  logger.info({ categoryId }, 'Suggesting prefix for category');

  const suggestion = await serialNumberService.suggestPrefixForCategory(categoryId);

  return SuccessResponse.ok(res, {
    message: 'Prefix suggestion generated successfully',
    data: suggestion,
  });
});

/**
 * GET /api/task-sequences/check-prefix
 * Check if a prefix is unique/available
 * Query params: prefix
 */
export const checkPrefixUniqueness = asyncHandler(async (req: Request, res: Response) => {
  const { prefix } = req.query;

  if (!prefix || typeof prefix !== 'string') {
    throw new BadRequestError('prefix query parameter is required');
  }

  // Validate prefix format
  const normalizedPrefix = prefix.toUpperCase().trim();
  if (!/^[A-Z0-9]{1,5}$/.test(normalizedPrefix)) {
    throw new BadRequestError(
      'Invalid prefix format. Must be 1-5 alphanumeric characters (A-Z, 0-9).'
    );
  }

  logger.info({ prefix: normalizedPrefix }, 'Checking prefix uniqueness');

  const isUnique = await serialNumberService.checkPrefixUniqueness(normalizedPrefix);

  return SuccessResponse.ok(res, {
    message: 'Prefix uniqueness check completed',
    data: {
      prefix: normalizedPrefix,
      isUnique,
      available: isUnique,
    },
  });
});

/**
 * GET /api/tasks/by-serial/:serialNumber
 * Get task by serial number
 * Path params: serialNumber
 *
 * CRITICAL: This endpoint must have same authorization as GET /api/tasks/:id
 */
export const getTaskBySerialNumber = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { serialNumber } = req.params;

    if (!serialNumber) {
      throw new BadRequestError('Serial number is required');
    }

    // Validate serial number format
    if (!serialNumberService.validateSerialNumberFormat(serialNumber)) {
      throw new BadRequestError(
        'Invalid serial number format. Expected format: PREFIX-NNNNN (e.g., WD-00042)'
      );
    }

    logger.info({ serialNumber }, 'Looking up task by serial number');

    const task = await taskRepository.findTaskBySerialNumber(serialNumber);

    if (!task) {
      throw new NotFoundError(`Task with serial number ${serialNumber} not found`);
    }

    // SECURITY: Verify user has permission to view this task
    // This uses the same authorization logic as viewing a task by ID
    const userId = req.user?.id; // Assuming auth middleware sets req.user
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      throw new BadRequestError('User authentication required');
    }

    const hasPermission = await canViewTasks(userRole);
    if (!hasPermission) {
      throw new NotFoundError('Task not found'); // Don't reveal task exists
    }

    logger.info({ serialNumber, taskId: task.id, userId }, 'Task retrieved by serial number');

    return SuccessResponse.ok(res, {
      message: 'Task retrieved successfully',
      data: task,
    });
  }
);

/**
 * POST /api/task-sequences/validate
 * Validate a serial number format and check availability
 * Body: { serialNumber: string }
 */
export const validateSerialNumber = asyncHandler(async (req: Request, res: Response) => {
  const { serialNumber } = req.body;

  if (!serialNumber || typeof serialNumber !== 'string') {
    throw new BadRequestError('serialNumber is required');
  }

  logger.info({ serialNumber }, 'Validating serial number');

  // Check format
  const isValidFormat = serialNumberService.validateSerialNumberFormat(serialNumber);

  if (!isValidFormat) {
    return SuccessResponse.ok(res, {
      message: 'Serial number validation completed',
      data: {
        serialNumber,
        isValid: false,
        isAvailable: false,
        reason: 'Invalid format. Expected: PREFIX-NNNNN (e.g., WD-00042)',
      },
    });
  }

  // Check if already exists
  const exists = await taskRepository.serialNumberExists(serialNumber);

  // Parse components
  const parsed = serialNumberService.parseSerialNumber(serialNumber);

  return SuccessResponse.ok(res, {
    message: 'Serial number validation completed',
    data: {
      serialNumber,
      isValid: true,
      isAvailable: !exists,
      exists,
      components: parsed,
    },
  });
});
