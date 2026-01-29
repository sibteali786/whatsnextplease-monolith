import { Response, NextFunction } from 'express';
import { WorkLogService } from '../services/worklog.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { CreatorType, Roles } from '@prisma/client';
import { BadRequestError, UnauthorizedError } from '@wnp/types';
import { logger } from '../utils/logger';

export class WorkLogController {
  constructor(private readonly workLogService: WorkLogService = new WorkLogService()) {}

  /**
   * POST /api/tasks/:taskId/worklogs
   * Create a new work log entry
   */
  private handleCreateWorkLog = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { taskId } = req.params;
      const { timeSpent, timeRemaining, startedAt, description } = req.body;

      // Validate required fields
      if (!timeSpent || !startedAt || !description) {
        throw new BadRequestError('timeSpent, startedAt, and description are required');
      }

      // Get authenticated user info
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check permissions
      const permissions = await this.workLogService.checkPermissions(null, userId, userRole);
      if (!permissions.canCreate) {
        throw new UnauthorizedError('Insufficient permissions to create work logs');
      }

      // Determine author type
      const isClient = userRole === Roles.CLIENT;
      const authorType = isClient ? CreatorType.CLIENT : CreatorType.USER;

      // Create work log
      const result = await this.workLogService.createWorkLog({
        taskId,
        timeSpent,
        timeRemaining,
        startedAt: new Date(startedAt),
        description,
        authorUserId: isClient ? undefined : userId,
        authorClientId: isClient ? userId : undefined,
        authorType,
      });

      if (!result.success) {
        throw new BadRequestError(result.error || 'Failed to create work log');
      }

      res.status(201).json({
        success: true,
        workLog: result.workLog,
        message: 'Work log created successfully',
      });
    } catch (error) {
      logger.error('Error in handleCreateWorkLog:', error);
      next(error);
    }
  };

  /**
   * GET /api/tasks/:taskId/worklogs
   * Get all work logs for a task (with pagination)
   */
  private handleGetWorkLogsByTaskId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { taskId } = req.params;
      const { cursor, pageSize = '20' } = req.query;

      // Validate authentication
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new UnauthorizedError('Authentication required');
      }

      // Fetch work logs
      const result = await this.workLogService.getWorkLogsByTaskId(
        taskId,
        cursor as string | undefined,
        parseInt(pageSize as string, 10)
      );

      if (!result.success) {
        throw new BadRequestError(result.error || 'Failed to fetch work logs');
      }

      res.status(200).json({
        success: true,
        workLogs: result.workLogs,
        totalCount: result.totalCount,
        hasNextCursor: result.hasNextCursor,
        nextCursor: result.nextCursor,
        message: 'Work logs retrieved successfully',
      });
    } catch (error) {
      logger.error('Error in handleGetWorkLogsByTaskId:', error);
      next(error);
    }
  };

  /**
   * GET /api/worklogs/:worklogId
   * Get a single work log by ID
   */
  private handleGetWorkLogById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { worklogId } = req.params;

      // Validate authentication
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new UnauthorizedError('Authentication required');
      }

      // Fetch work log
      const result = await this.workLogService.getWorkLogById(worklogId);

      if (!result.success) {
        throw new BadRequestError(result.error || 'Failed to fetch work log');
      }

      res.status(200).json({
        success: true,
        workLog: result.workLog,
        message: 'Work log retrieved successfully',
      });
    } catch (error) {
      logger.error('Error in handleGetWorkLogById:', error);
      next(error);
    }
  };
  /**
   * PUT /api/worklogs/:worklogId
   * Update an existing work log
   */
  private handleUpdateWorkLog = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { worklogId } = req.params;
      const { timeSpent, timeRemaining, startedAt, description } = req.body;

      // Validate authentication
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check permissions
      const permissions = await this.workLogService.checkPermissions(worklogId, userId, userRole);
      if (!permissions.canUpdate) {
        throw new UnauthorizedError('Insufficient permissions to update this work log');
      }

      // Update work log
      const result = await this.workLogService.updateWorkLog(
        worklogId,
        {
          timeSpent,
          timeRemaining,
          startedAt: startedAt ? new Date(startedAt) : undefined,
          description,
        },
        userId
      );

      if (!result.success) {
        throw new BadRequestError(result.error || 'Failed to update work log');
      }

      res.status(200).json({
        success: true,
        workLog: result.workLog,
        message: 'Work log updated successfully',
      });
    } catch (error) {
      logger.error('Error in handleUpdateWorkLog:', error);
      next(error);
    }
  };

  /**
   * DELETE /api/worklogs/:worklogId
   * Delete a work log (soft delete)
   */
  private handleDeleteWorkLog = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { worklogId } = req.params;

      // Validate authentication
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check permissions
      const permissions = await this.workLogService.checkPermissions(worklogId, userId, userRole);
      if (!permissions.canDelete) {
        throw new UnauthorizedError('Insufficient permissions to delete this work log');
      }

      // Delete work log
      const result = await this.workLogService.deleteWorkLog(worklogId, userId);

      if (!result.success) {
        throw new BadRequestError(result.error || 'Failed to delete work log');
      }

      res.status(200).json({
        success: true,
        message: 'Work log deleted successfully',
      });
    } catch (error) {
      logger.error('Error in handleDeleteWorkLog:', error);
      next(error);
    }
  };

  // Public handlers wrapped with asyncHandler
  createWorkLog = asyncHandler(this.handleCreateWorkLog);
  getWorkLogsByTaskId = asyncHandler(this.handleGetWorkLogsByTaskId);
  getWorkLogById = asyncHandler(this.handleGetWorkLogById);
  updateWorkLog = asyncHandler(this.handleUpdateWorkLog);
  deleteWorkLog = asyncHandler(this.handleDeleteWorkLog);
}
