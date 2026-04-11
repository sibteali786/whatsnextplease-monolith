import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PreferenceService } from '../services/preference.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';

import z from 'zod';
import { TaskSortField, SortDirection } from '@prisma/client';

const mapSortField = (value?: string): TaskSortField | undefined => {
  if (!value) return undefined;

  switch (value.toLowerCase()) {
    case 'startdate':
    case 'start_date': // just in case
      return TaskSortField.START_DATE;
    case 'enddate':
    case 'end_date':
      return TaskSortField.END_DATE;
    case 'priority':
      return TaskSortField.PRIORITY;
    default:
      return undefined;
  }
};

const mapSortDirection = (value?: string): SortDirection | undefined => {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper === 'ASC') return SortDirection.ASC;
  if (upper === 'DESC') return SortDirection.DESC;
  return undefined; // safety fallback
};
export const TaskViewFilterCreateSchema = z.object({
  name: z.string().min(1),

  taskCategoryId: z.string().uuid().optional(),
  /* status: z.nativeEnum(TaskStatusEnum).optional(), */
  assignedToId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),

  sortField: z.nativeEnum(TaskSortField).optional(),
  sortDirection: z.nativeEnum(SortDirection).optional(),
});

export type TaskViewFilterCreateDto = z.infer<typeof TaskViewFilterCreateSchema>;

export class PreferenceController {
  constructor(private readonly preferenceService: PreferenceService = new PreferenceService()) {}

  private handleCreateTaskViewFilter = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const parsedInput = TaskViewFilterCreateSchema.parse({
        ...req.body,
        sortField: mapSortField(req.body.sortField),
        sortDirection: mapSortDirection(req.body.sortDirection) ?? SortDirection.ASC, // default ASC
      });

      const filter = await this.preferenceService.createTaskViewFilter(userId, parsedInput);

      res.status(201).json({ success: true, data: filter });
    } catch (error) {
      next(error);
    }
  };

  private handleGetTaskViewFilters = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const filters = await this.preferenceService.getTaskViewFilters(userId);

      res.status(200).json({ success: true, data: filters });
    } catch (error) {
      next(error);
    }
  };

  createTaskViewFilter = asyncHandler(this.handleCreateTaskViewFilter);
  getTaskViewFilters = asyncHandler(this.handleGetTaskViewFilters);
}
