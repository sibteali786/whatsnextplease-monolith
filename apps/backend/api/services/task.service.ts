// apps/backend/api/services/task.service.ts
import { Roles, TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError } from '@wnp/types';
import { canViewTasks, getTaskFilterCondition } from './../utils/tasks/taskPermissions';
import { DurationEnum } from '@wnp/types';
import {
  TaskRepository,
  TaskFilters,
  TaskQueryOptions,
  BatchUpdateData,
} from '../repositories/task.repository';
import { getDateFilter } from '../utils/dateFilter';

export interface BatchUpdateRequest {
  taskIds: string[];
  updates: {
    status?: TaskStatusEnum;
    priority?: TaskPriorityEnum;
    assignedToId?: string | null;
    categoryId?: string;
    dueDate?: Date | null;
    skillIds?: string[];
  };
}

export interface BatchDeleteRequest {
  taskIds: string[];
}

export interface TaskQueryParams {
  userId?: string;
  role: Roles;
  cursor?: string;
  pageSize?: number;
  searchTerm?: string;
  duration?: DurationEnum;
  status?: TaskStatusEnum;
  priority?: TaskPriorityEnum;
  assignedToId?: string | null;
  categoryId?: string;
}

export class TaskService {
  constructor(private readonly taskRepository: TaskRepository = new TaskRepository()) {}

  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(params: TaskQueryParams) {
    const {
      userId,
      role,
      cursor,
      pageSize = 10,
      searchTerm = '',
      duration = DurationEnum.ALL,
      status,
      priority,
      assignedToId,
      categoryId,
    } = params;

    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view tasks.`);
    }

    // Build filters
    const filters: TaskFilters = {
      whereCondition: userId ? getTaskFilterCondition(userId, role) : {},
      dateFilter: getDateFilter(duration),
      searchTerm,
      status,
      priority,
      assignedToId,
      categoryId,
    };

    const queryOptions: TaskQueryOptions = {
      cursor,
      pageSize,
      orderBy: { id: 'asc' },
    };

    // Execute queries
    const [taskResult, totalCount] = await Promise.all([
      this.taskRepository.findTasks(filters, queryOptions),
      this.taskRepository.countTasks(filters),
    ]);

    // Transform tasks to match expected format
    const formattedTasks = taskResult.tasks.map(task => ({
      ...task,
      taskSkills: task.taskSkills.map(ts => ts.skill.name),
    }));

    return {
      success: true,
      tasks: formattedTasks,
      hasNextCursor: taskResult.hasNextCursor,
      nextCursor: taskResult.nextCursor,
      totalCount,
    };
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string, userId?: string, role?: Roles) {
    // Authorization check
    if (role && !canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view tasks.`);
    }

    const task = await this.taskRepository.findTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return {
      success: true,
      task: {
        ...task,
        taskSkills: task.taskSkills.map(ts => ts.skill.name),
      },
    };
  }

  /**
   * Get task IDs for pagination
   */
  async getTaskIds(params: TaskQueryParams) {
    const {
      userId,
      role,
      searchTerm = '',
      duration = DurationEnum.ALL,
      status,
      priority,
      assignedToId,
      categoryId,
    } = params;

    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view tasks.`);
    }

    // Build filters
    const filters: TaskFilters = {
      whereCondition: userId ? getTaskFilterCondition(userId, role) : {},
      dateFilter: getDateFilter(duration),
      searchTerm,
      status,
      priority,
      assignedToId,
      categoryId,
    };

    const taskIds = await this.taskRepository.findTaskIds(filters);

    return {
      success: true,
      taskIds,
      message: 'Successfully retrieved task IDs',
    };
  }

  /**
   * Batch update tasks
   */
  async batchUpdateTasks(request: BatchUpdateRequest, userId: string, role: Roles) {
    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to update tasks.`);
    }

    const { taskIds, updates } = request;

    if (!taskIds || taskIds.length === 0) {
      throw new BadRequestError('Task IDs are required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new BadRequestError('Updates are required');
    }

    // Verify all tasks exist
    const existingTasks = await this.taskRepository.findTasksByIds(taskIds);
    if (existingTasks.length !== taskIds.length) {
      throw new NotFoundError('One or more tasks not found');
    }

    // Validate and prepare update data
    const updateData: BatchUpdateData = {};

    // Validate status
    if (updates.status) {
      const statusRecord = await this.taskRepository.findTaskStatusByName(updates.status);
      if (!statusRecord) {
        throw new BadRequestError('Invalid status');
      }
      updateData.statusId = statusRecord.id;
    }

    // Validate priority
    if (updates.priority) {
      const priorityRecord = await this.taskRepository.findTaskPriorityByName(updates.priority);
      if (!priorityRecord) {
        throw new BadRequestError('Invalid priority');
      }
      updateData.priorityId = priorityRecord.id;
    }

    // Validate assignee
    if (updates.assignedToId !== undefined) {
      if (updates.assignedToId) {
        const assignee = await this.taskRepository.findUserById(updates.assignedToId);
        if (!assignee) {
          throw new BadRequestError('Invalid assignee');
        }
      }
      updateData.assignedToId = updates.assignedToId;
    }

    // Validate category
    if (updates.categoryId) {
      const category = await this.taskRepository.findTaskCategoryById(updates.categoryId);
      if (!category) {
        throw new BadRequestError('Invalid category');
      }
      updateData.categoryId = updates.categoryId;
    }

    // Handle due date
    if (updates.dueDate !== undefined) {
      updateData.dueDate = updates.dueDate;
    }

    // Perform batch update
    const updatedTasks = await this.taskRepository.batchUpdateTasks(taskIds, updateData);

    // Handle skill updates separately
    if (updates.skillIds && updates.skillIds.length > 0) {
      // Validate skills exist
      const existingSkills = await this.taskRepository.findSkillsByIds(updates.skillIds);
      if (existingSkills.length !== updates.skillIds.length) {
        throw new BadRequestError('One or more skills not found');
      }

      await this.taskRepository.batchUpdateTaskSkills(taskIds, updates.skillIds);
    }

    return {
      success: true,
      message: `Successfully updated ${updatedTasks.length} tasks`,
      updatedTasks,
    };
  }

  /**
   * Batch delete tasks
   */
  async batchDeleteTasks(request: BatchDeleteRequest, userId: string, role: Roles) {
    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to delete tasks.`);
    }

    const { taskIds } = request;

    if (!taskIds || taskIds.length === 0) {
      throw new BadRequestError('Task IDs are required');
    }

    // Verify tasks exist and get details for response
    const existingTasks = await this.taskRepository.findTasksByIds(taskIds);
    if (existingTasks.length !== taskIds.length) {
      throw new NotFoundError('One or more tasks not found');
    }

    // Delete tasks
    const deleteResult = await this.taskRepository.batchDeleteTasks(taskIds);

    return {
      success: true,
      message: `Successfully deleted ${deleteResult.count} tasks`,
      deletedTasks: existingTasks.map(task => ({
        id: task.id,
        title: task.title,
      })),
    };
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(userId?: string, role?: Roles) {
    // Authorization check
    if (role && !canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view task statistics.`);
    }
    if (role) {
      const whereCondition = userId ? getTaskFilterCondition(userId, role) : {};
      const statistics = await this.taskRepository.getTaskStatistics(whereCondition);

      return {
        success: true,
        statistics,
      };
    }
  }

  /**
   * Get unassigned tasks
   */
  async getUnassignedTasks(role: Roles, cursor?: string, pageSize = 10) {
    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view tasks.`);
    }

    const filters: TaskFilters = {
      assignedToId: null, // Only unassigned tasks
    };

    const queryOptions: TaskQueryOptions = {
      cursor,
      pageSize,
      orderBy: { createdAt: 'desc' },
    };

    const [taskResult, totalCount] = await Promise.all([
      this.taskRepository.findTasks(filters, queryOptions),
      this.taskRepository.countTasks(filters),
    ]);

    const formattedTasks = taskResult.tasks.map(task => ({
      ...task,
      taskSkills: task.taskSkills.map(ts => ts.skill.name),
    }));

    return {
      success: true,
      tasks: formattedTasks,
      hasNextCursor: taskResult.hasNextCursor,
      nextCursor: taskResult.nextCursor,
      totalCount,
    };
  }
}
