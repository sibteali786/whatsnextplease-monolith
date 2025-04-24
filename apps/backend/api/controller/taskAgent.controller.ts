import { NextFunction, Request, Response } from 'express';
import { TaskAgentService } from '../services/taskAgent.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { BadRequestError } from '@wnp/types';

export class TaskAgentController {
  constructor(private readonly taskAgentService: TaskAgentService = new TaskAgentService()) {}
  /**
   * Handler to get task agent IDs for pagination
   */
  private handleGetTaskAgentIds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskAgentIds = await this.taskAgentService.getTaskAgentIds();
      res.status(200).json(taskAgentIds);
    } catch (error) {
      next(error);
    }
  };
  /**
   * Handler to get paginated task agents with task counts
   */
  private handleGetTaskAgents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cursor = req.query.cursor as string | undefined;
      const pageSizeStr = req.query.pageSize as string | undefined;
      const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 10;
      const filterStatus = (req.query.status as 'all' | 'available' | 'working') || 'all';
      const searchTerm = (req.query.search as string) || '';

      if (isNaN(pageSize) || pageSize <= 0) {
        throw new BadRequestError('Invalid page size');
      }

      const taskAgents = await this.taskAgentService.getTaskAgents(
        cursor || null,
        pageSize,
        filterStatus,
        searchTerm
      );

      res.status(200).json(taskAgents);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handler to get task agent by ID with task counts
   */
  private handleGetTaskAgentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('Task agent ID is required');
      }

      const taskAgent = await this.taskAgentService.getTaskAgentById(id);

      if (!taskAgent) {
        return res.status(404).json({
          message: 'Task agent not found',
        });
      }

      res.status(200).json(taskAgent);
    } catch (error) {
      next(error);
    }
  };
  // Publicly exposed route handlers
  getTaskAgentIds = asyncHandler(this.handleGetTaskAgentIds);
  getTaskAgents = asyncHandler(this.handleGetTaskAgents);
  getTaskAgentById = asyncHandler(this.handleGetTaskAgentById);
}
