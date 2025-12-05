import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { TaskLinkService } from '../services/taskLink.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { BadRequestError } from '@wnp/types';
import { CreatorType, Roles } from '@prisma/client';

export class TaskLinkController {
  constructor(private readonly taskLinkService: TaskLinkService = new TaskLinkService()) {}

  /**
   * Get all links for a task
   */
  private handleGetTaskLinks = async (
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
        throw new BadRequestError('User not authenticated');
      }
      const result = await this.taskLinkService.getTaskLinks({
        taskId,
        userId: req.user.id,
        role: req.user.role,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new task link
   */
  private handleCreateTaskLink = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { taskId } = req.params;
      const { url } = req.body;

      if (!taskId) {
        throw new BadRequestError('Task ID is required');
      }

      if (!url || typeof url !== 'string') {
        throw new BadRequestError('URL is required and must be a string');
      }

      if (!req.user) {
        throw new BadRequestError('User not authenticated');
      }

      const addedByType = req.user.role === Roles.CLIENT ? CreatorType.CLIENT : CreatorType.USER;

      const result = await this.taskLinkService.createTaskLink({
        taskId,
        url: url.trim(),
        addedById: req.user.id,
        addedByType,
        role: req.user.role,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a task link
   */

  private handleDeleteTaskLink = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { linkId } = req.params;

      if (!linkId) {
        throw new BadRequestError('Link ID is required');
      }

      if (!req.user) {
        throw new BadRequestError('User not authenticated');
      }

      const result = await this.taskLinkService.deleteTaskLink({
        linkId,
        userId: req.user.id,
        role: req.user.role,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // Publicly exposed route handlers
  getTaskLinks = asyncHandler(this.handleGetTaskLinks);
  createTaskLink = asyncHandler(this.handleCreateTaskLink);
  deleteTaskLink = asyncHandler(this.handleDeleteTaskLink);
}
