// apps/backend/api/controller/task.controller.ts
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { TaskService, BatchUpdateRequest, BatchDeleteRequest } from '../services/task.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { BadRequestError } from '@wnp/types';
import { DurationEnum } from '@wnp/types';
import { TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';

export class TaskController {
  constructor(private readonly taskService: TaskService = new TaskService()) {}

  /**
   * Get tasks with filtering and pagination
   */
  private handleGetTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string;
      const cursor = req.query.cursor as string;
      const pageSizeStr = req.query.pageSize as string;
      const searchTerm = (req.query.search as string) || '';
      const duration = (req.query.duration as DurationEnum) || DurationEnum.ALL;
      const status = req.query.status as TaskStatusEnum;
      const priority = req.query.priority as TaskPriorityEnum;
      const assignedToId = req.query.assignedToId as string;
      const categoryId = req.query.categoryId as string;

      const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 10;

      if (isNaN(pageSize) || pageSize <= 0) {
        throw new BadRequestError('Invalid page size');
      }
      // Make sure we always have a valid role value
      if (!req?.user?.role) {
        throw new BadRequestError('User role is required');
      }

      const result = await this.taskService.getTasks({
        userId,
        role: req.user.role,
        cursor,
        pageSize,
        searchTerm,
        duration,
        status,
        priority,
        assignedToId: assignedToId === 'null' ? null : assignedToId,
        categoryId,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get task by ID
   */
  private handleGetTaskById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        throw new BadRequestError('Task ID is required');
      }

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const result = await this.taskService.getTaskById(taskId, req.user.id, req.user.role);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get task IDs for pagination
   */
  private handleGetTaskIds = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.query.userId as string;
      const searchTerm = (req.query.search as string) || '';
      const duration = (req.query.duration as DurationEnum) || DurationEnum.ALL;
      const status = req.query.status as TaskStatusEnum;
      const priority = req.query.priority as TaskPriorityEnum;
      const assignedToId = req.query.assignedToId as string;
      const categoryId = req.query.categoryId as string;

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const result = await this.taskService.getTaskIds({
        userId,
        role: req.user.role,
        searchTerm,
        duration,
        status,
        priority,
        assignedToId: assignedToId === 'null' ? null : assignedToId,
        categoryId,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get task statistics
   */
  private handleGetTaskStatistics = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.query.userId as string;
      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }
      const result = await this.taskService.getTaskStatistics(userId, req.user.role);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Batch update tasks
   */
  private handleBatchUpdateTasks = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const batchRequest: BatchUpdateRequest = req.body;

      // Validate request
      if (!batchRequest.taskIds || batchRequest.taskIds.length === 0) {
        throw new BadRequestError('Task IDs are required');
      }

      if (!batchRequest.updates || Object.keys(batchRequest.updates).length === 0) {
        throw new BadRequestError('Updates are required');
      }

      // Validate batch size (prevent too large operations)
      if (batchRequest.taskIds.length > 100) {
        throw new BadRequestError('Cannot update more than 100 tasks at once');
      }
      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const result = await this.taskService.batchUpdateTasks(
        batchRequest,
        req.user.id,
        req.user.role
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Batch delete tasks
   */
  private handleBatchDeleteTasks = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const batchRequest: BatchDeleteRequest = req.body;

      if (!batchRequest.taskIds || batchRequest.taskIds.length === 0) {
        throw new BadRequestError('Task IDs are required');
      }

      // Validate batch size (prevent too large operations)
      if (batchRequest.taskIds.length > 100) {
        throw new BadRequestError('Cannot delete more than 100 tasks at once');
      }
      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }
      const result = await this.taskService.batchDeleteTasks(
        batchRequest,
        req.user.id,
        req.user.role
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get unassigned tasks
   */
  private handleGetUnassignedTasks = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const cursor = req.query.cursor as string;
      const pageSizeStr = req.query.pageSize as string;
      const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 10;

      if (isNaN(pageSize) || pageSize <= 0) {
        throw new BadRequestError('Invalid page size');
      }
      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const result = await this.taskService.getUnassignedTasks(req.user.role, cursor, pageSize);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tasks count by status (legacy endpoint for backward compatibility)
   */
  private handleGetTasksCount = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.query.userId as string;
      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }
      const result = await this.taskService.getTaskStatistics(userId, req.user.role);

      // Transform to match existing API format
      const countsResponse = {
        success: true,
        counts:
          result?.statistics?.tasksByStatus?.map(stat => ({
            statusId: stat.statusId,
            statusName: stat.status?.statusName,
            count: stat._count.id,
          })) || [],
      };

      res.status(200).json(countsResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a single field of a task
   */
  private handleUpdateTaskField = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { taskId } = req.params;
      const { field, value } = req.body;

      if (!taskId) {
        throw new BadRequestError('Task ID is required');
      }

      if (!field || !value) {
        throw new BadRequestError('Field and value are required');
      }

      // Validate field type
      const allowedFields = ['status', 'priority', 'taskCategory'];
      if (!allowedFields.includes(field)) {
        throw new BadRequestError(`Invalid field. Allowed fields: ${allowedFields.join(', ')}`);
      }

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const result = await this.taskService.updateTaskField(
        taskId,
        field,
        value,
        req.user.id,
        req.user.role
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // Publicly exposed route handlers
  getTasks = asyncHandler(this.handleGetTasks);
  getTaskById = asyncHandler(this.handleGetTaskById);
  getTaskIds = asyncHandler(this.handleGetTaskIds);
  getTaskStatistics = asyncHandler(this.handleGetTaskStatistics);
  batchUpdateTasks = asyncHandler(this.handleBatchUpdateTasks);
  batchDeleteTasks = asyncHandler(this.handleBatchDeleteTasks);
  getUnassignedTasks = asyncHandler(this.handleGetUnassignedTasks);
  getTasksCount = asyncHandler(this.handleGetTasksCount);
  updateTaskField = asyncHandler(this.handleUpdateTaskField);
}
