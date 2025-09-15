// apps/backend/api/services/task.service.ts
import { Roles, TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError } from '@wnp/types';
import { canViewTasks, getTaskFilterCondition } from '../utils/tasks/taskPermissions';
import { getDateFilter } from '../utils/dateFilter';
import { DurationEnum } from '@wnp/types';
import {
  TaskRepository,
  TaskFilters,
  TaskQueryOptions,
  BatchUpdateData,
} from '../repositories/task.repository';

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
  assignedToId?: string | null | { not: null };
  categoryId?: string;
}

export interface UpdateTaskFieldRequest {
  taskId: string;
  field: 'status' | 'priority' | 'taskCategory';
  value: string;
  userId: string;
  role: Roles;
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

    const whereCondition = userId && role ? getTaskFilterCondition(userId, role) : {};
    const statistics = await this.taskRepository.getTaskStatistics(whereCondition);

    return {
      success: true,
      statistics,
    };
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

  async getAssignedTasks(role: Roles, cursor?: string, pageSize = 10) {
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view tasks.`);
    }

    const filters: TaskFilters = {
      whereCondition: { assignedToId: { not: null } },
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

  async getTaskAssignmentStatusCounts(userId: string, role: Roles) {
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view tasks.`);
    }
    if (role === Roles.CLIENT) {
      const whereCondition = getTaskFilterCondition(userId, role);
      const counts = await this.taskRepository.getTaskAssignmentStatusCounts(whereCondition);
      return {
        success: true,
        counts,
      };
    }
    const counts = await this.taskRepository.getTaskAssignmentStatusCounts({});
    return {
      success: true,
      counts,
    };
  }

  // Add this method to TaskService class
  /**
   * Update a single field of a task
   */
  async updateTaskField(
    taskId: string,
    field: 'status' | 'priority' | 'taskCategory',
    value: string,
    userId: string,
    role: Roles
  ) {
    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to update tasks.`);
    }

    // Verify task exists
    const existingTask = await this.taskRepository.findTaskById(taskId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Prepare update data based on field
    const updateData: BatchUpdateData = {};

    switch (field) {
      case 'status': {
        const statusRecord = await this.taskRepository.findTaskStatusByName(
          value as TaskStatusEnum
        );
        if (!statusRecord) {
          throw new BadRequestError('Invalid status value');
        }
        updateData.statusId = statusRecord.id;
        break;
      }

      case 'priority': {
        const priorityRecord = await this.taskRepository.findTaskPriorityByName(
          value as TaskPriorityEnum
        );
        if (!priorityRecord) {
          throw new BadRequestError('Invalid priority value');
        }
        updateData.priorityId = priorityRecord.id;
        break;
      }

      case 'taskCategory': {
        const categoryRecord = await this.taskRepository.findTaskCategoryById(value);
        if (!categoryRecord) {
          throw new BadRequestError('Invalid category ID');
        }
        updateData.categoryId = value;
        break;
      }

      default:
        throw new BadRequestError('Invalid field');
    }

    // Perform update
    await this.taskRepository.batchUpdateTasks([taskId], updateData);

    // Get updated task with relations
    const updatedTask = await this.taskRepository.findTaskById(taskId);

    return {
      success: true,
      message: `Successfully updated task ${field}`,
      task: {
        ...updatedTask,
        taskSkills: updatedTask?.taskSkills.map(ts => ts.skill.name) || [],
      },
    };
  }
  /**
   * Get all available statuses and priorities for UI dropdowns
   */
  async getTaskMetadata() {
    const [statuses, priorities] = await Promise.all([
      this.taskRepository.getAllTaskStatuses(),
      this.taskRepository.getAllTaskPriorities(),
    ]);

    // Group priorities by level for better UX
    const priorityLevels = {
      critical: priorities.filter(p => ['URGENT', 'CRITICAL'].includes(p.priorityName)),
      high: priorities.filter(p => p.priorityName === 'HIGH'),
      medium: priorities.filter(p => ['NORMAL', 'MEDIUM'].includes(p.priorityName)),
      low: priorities.filter(p => ['LOW_PRIORITY', 'LOW'].includes(p.priorityName)),
      hold: priorities.filter(p => p.priorityName === 'HOLD'),
    };

    return {
      success: true,
      data: {
        statuses: statuses.map(s => ({
          id: s.id,
          name: s.statusName,
          displayName: s.statusName
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase()),
        })),
        priorities: priorities.map(p => ({
          id: p.id,
          name: p.priorityName,
          displayName: p.priorityName
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase()),
          isLegacy: ['URGENT', 'NORMAL', 'LOW_PRIORITY'].includes(p.priorityName),
        })),
        priorityLevels,
      },
    };
  }

  /**
   * Update task status with transition validation
   */
  async updateTaskStatusWithValidation(
    taskId: string,
    newStatus: TaskStatusEnum,
    userId: string,
    role: Roles
  ) {
    // Get current task
    const currentTask = await this.taskRepository.findTaskById(taskId);
    if (!currentTask) {
      throw new NotFoundError('Task not found');
    }

    // Validate status transition
    const isValidTransition = await this.taskRepository.validateStatusTransition(
      currentTask.status.statusName,
      newStatus
    );

    if (!isValidTransition) {
      throw new BadRequestError(
        `Invalid status transition from ${currentTask.status.statusName} to ${newStatus}. 
       Please check the workflow requirements.`
      );
    }

    // Proceed with update
    return this.updateTaskField(taskId, 'status', newStatus, userId, role);
  }

  /**
   * Get tasks by priority level (combines legacy and new priorities)
   */
  async getTasksByPriorityLevel(
    level: 'critical' | 'high' | 'medium' | 'low' | 'hold',
    params: TaskQueryParams
  ) {
    const {
      userId,
      role,
      cursor,
      pageSize = 10,
      searchTerm,
      duration,
      status,
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
      dateFilter: getDateFilter(duration || DurationEnum.ALL),
      searchTerm,
      status,
      assignedToId,
      categoryId,
    };

    const queryOptions: TaskQueryOptions = {
      cursor,
      pageSize,
      orderBy: { id: 'asc' },
    };

    // Get tasks by priority level
    const taskResult = await this.taskRepository.getTasksByPriorityLevel(
      level,
      filters,
      queryOptions
    );

    // Get total count for this priority level
    const priorityMapping = this.taskRepository.getPriorityLevelMapping();
    const priorities = priorityMapping[level] || [];

    const countFilters = {
      ...filters,
      priority: undefined, // Will be handled in count method
    };

    // Count tasks with multiple priorities
    const totalCount = await this.taskRepository.countTasks({
      ...countFilters,
      whereCondition: {
        ...countFilters.whereCondition,
        priority: { priorityName: { in: priorities } },
      },
    });

    // Format tasks
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
      level,
      prioritiesIncluded: priorities,
    };
  }
}
