import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { TaskCategoryService } from '../services/taskCategory.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { TaskCategoryCreateSchema } from '@wnp/types';

export class TaskCategoryController {
  constructor(
    private readonly taskCategoryService: TaskCategoryService = new TaskCategoryService()
  ) {}
  private handleGetAllTaskCategories = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const taskCategories = await this.taskCategoryService.getAllTaskCategories();
      res.status(200).json(taskCategories);
    } catch (error) {
      next(error);
    }
  };
  private handleCreateTaskCategory = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const { categoryName } = req.body;
    try {
      const parsedInput = TaskCategoryCreateSchema.parse({ categoryName });
      const newTaskCategory = await this.taskCategoryService.createTaskCategory({
        categoryName: parsedInput.categoryName,
      });
      res.status(201).json(newTaskCategory);
    } catch (error) {
      next(error);
    }
  };
  getAllTaskCategories = asyncHandler(this.handleGetAllTaskCategories);
  createTaskCategory = asyncHandler(this.handleCreateTaskCategory);
}
