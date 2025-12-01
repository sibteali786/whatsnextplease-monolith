/* eslint-disable @typescript-eslint/no-explicit-any */
import { Roles, TaskStatusEnum, TaskPriorityEnum, CreatorType, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError } from '@wnp/types';
import {
  canViewTasks,
  getGeneralTaskFilter,
  getTaskFilterCondition,
  getUserProfileTaskFilter,
  USER_CREATED_TASKS_CONTEXT,
} from '../utils/tasks/taskPermissions';
import { getDateFilter } from '../utils/dateFilter';
import { DurationEnum } from '@wnp/types';
import {
  TaskRepository,
  TaskFilters,
  TaskQueryOptions,
  BatchUpdateData,
} from '../repositories/task.repository';
import { NotificationService } from './notification.service';
import { NotificationFormatterService } from './notificationFormatter.service';
import { UserService } from './user.service';
import { ClientService } from './client.service';
import { TaskSerialNumberService } from './taskSerialNumber.service';
import { logger } from '../utils/logger';

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
interface CurrentUser {
  id: string;
  role: {
    id: string;
    name: Roles;
  };
  name?: string;
  username?: string;
  avatarUrl?: string;
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
  context?: USER_CREATED_TASKS_CONTEXT;
}

export interface UpdateTaskFieldRequest {
  taskId: string;
  field: 'status' | 'priority' | 'taskCategory';
  value: string;
  userId: string;
  role: Roles;
}

export interface CreateDraftTaskRequest {
  creatorType: CreatorType;
  userId: string;
  role: Roles;
}

export interface UpdateTaskRequest {
  id: string;
  title?: string;
  description?: string;
  statusName: TaskStatusEnum;
  priorityName: TaskPriorityEnum;
  taskCategoryName: string;
  assignedToId?: string;
  assignedToClientId?: string;
  skills?: string[];
  timeForTask?: string;
  overTime?: string;
  dueDate?: Date;
  initialComment?: string;
  customPrefix?: string;
}

export interface DeleteTaskRequest {
  taskId: string;
  userId: string;
  role: Roles;
}
export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository = new TaskRepository(),
    private readonly serialNumberService: TaskSerialNumberService = new TaskSerialNumberService()
  ) {}

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
      context = USER_CREATED_TASKS_CONTEXT.GENERAL,
    } = params;
    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view tasks.`);
    }
    const normalizedStatus: TaskStatusEnum[] = (() => {
      if (status) {
        const statusArray = decodeURIComponent(status).split(',');

        return statusArray
          .map(s => TaskStatusEnum[s as keyof typeof TaskStatusEnum])
          .filter(Boolean);
      }
      return [];
    })();
    const normalizedPriority: TaskPriorityEnum[] = (() => {
      if (priority) {
        const priorityArray = decodeURIComponent(priority).split(',');

        return priorityArray
          .map(s => TaskPriorityEnum[s as keyof typeof TaskPriorityEnum])
          .filter(Boolean);
      }
      return [];
    })();
    const whereCondition = userId
      ? context === USER_CREATED_TASKS_CONTEXT.USER_PROFILE
        ? getUserProfileTaskFilter(userId) // Always show tasks assigned to this user
        : getGeneralTaskFilter(userId, role) // Role-based filtering
      : {};
    // Build filters
    const filters: TaskFilters = {
      whereCondition,
      dateFilter: getDateFilter(duration),
      searchTerm,
      status: normalizedStatus.length ? normalizedStatus : undefined,
      priority: normalizedPriority.length ? normalizedPriority : undefined,
      assignedToId,
      categoryId,
    };

    const queryOptions: TaskQueryOptions = {
      cursor,
      pageSize,
      orderBy: { createdAt: 'desc' },
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
      context,
    } = params;

    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view tasks.`);
    }
    const normalizedStatus: TaskStatusEnum[] = (() => {
      if (status) {
        // Decode URL-encoded string and split by comma if there are multiple statuses
        const statusArray = decodeURIComponent(status).split(',');

        // Map the status values to the TaskStatusEnum values
        return statusArray
          .map(s => TaskStatusEnum[s as keyof typeof TaskStatusEnum])
          .filter(Boolean); // Filter out invalid values
      }
      return []; // Return empty array if no status is provided
    })();
    const normalizedPriority: TaskPriorityEnum[] = (() => {
      if (priority) {
        // Decode URL-encoded string and split by comma if there are multiple priority
        const priorityArray = decodeURIComponent(priority).split(',');

        // Map the priority values to the TaskPriorityEnum values
        return priorityArray
          .map(s => TaskPriorityEnum[s as keyof typeof TaskPriorityEnum])
          .filter(Boolean); // Filter out invalid values
      }
      return []; // Return empty array if no priority is provided
    })();
    const whereCondition = userId
      ? context === USER_CREATED_TASKS_CONTEXT.USER_PROFILE
        ? getUserProfileTaskFilter(userId)
        : getGeneralTaskFilter(userId, role)
      : {};
    // Build filters
    const filters: TaskFilters = {
      whereCondition,
      dateFilter: getDateFilter(duration),
      searchTerm,
      status: normalizedStatus.length ? normalizedStatus : undefined,
      priority: normalizedPriority.length ? normalizedPriority : undefined,
      assignedToId,
      categoryId,
    };

    const taskIds = await this.taskRepository.findTaskIds(filters, { createdAt: 'desc' });

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
  async getTasksByPriorityLevel(level: TaskPriorityEnum, params: TaskQueryParams) {
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

    const countFilters = {
      ...filters,
      priority: undefined, // Will be handled in count method
    };

    // Count tasks with multiple priorities
    const totalCount = await this.taskRepository.countTasks({
      ...countFilters,
      whereCondition: {
        ...countFilters.whereCondition,
        priority: { priorityName: { in: [level] } },
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
      prioritiesIncluded: level,
    };
  }
  /**
   * Create a draft task (for two-step creation flow)
   */
  async createDraftTask(request: CreateDraftTaskRequest) {
    const { creatorType, userId, role } = request;

    // Get default status and priority
    const [defaultStatus, defaultPriority] = await Promise.all([
      this.taskRepository.findTaskStatusByName(TaskStatusEnum.NEW),
      this.taskRepository.findTaskPriorityByName(TaskPriorityEnum.LOW),
    ]);

    if (!defaultStatus) {
      throw new BadRequestError('Default Task Status (NEW) is not configured in the system.');
    }
    if (!defaultPriority) {
      throw new BadRequestError(
        'Default Task Priority (LOW_PRIORITY) is not configured in the system.'
      );
    }

    // Try to find a default category
    let taskCategory = await this.taskRepository.findTaskCategoryByName('Data Entry');

    if (!taskCategory) {
      taskCategory = await this.taskRepository.findFirstTaskCategory();

      if (!taskCategory) {
        // Create a default category if none exist
        taskCategory = await this.taskRepository.createTaskCategory('General Tasks');
      }
    }

    // Validate creator permissions
    let createdByUserId: string | undefined;
    let createdByClientId: string | undefined;

    if (creatorType === CreatorType.CLIENT) {
      createdByClientId = userId;
    } else if (creatorType === CreatorType.USER) {
      const allowedRoles: Roles[] = [Roles.SUPER_USER, Roles.TASK_SUPERVISOR, Roles.TASK_AGENT];

      if (!allowedRoles.includes(role)) {
        throw new ForbiddenError('User does not have permission to create tasks.');
      }
      createdByUserId = userId;
    } else {
      throw new BadRequestError('Invalid creator type provided.');
    }
    // Create the draft task
    const task = await this.taskRepository.createDraftTask({
      statusId: defaultStatus.id,
      priorityId: defaultPriority.id,
      taskCategoryId: taskCategory.id,
      creatorType,
      createdByUserId,
      createdByClientId,
    });

    return {
      success: true,
      task: { id: task.id },
    };
  }

  /**
   * Update task (handles both draft finalization and regular updates)
   */
  async updateTask(
    request: UpdateTaskRequest,
    userFromRequest: {
      id: string;
      role: Roles;
      name?: string;
      username?: string;
      avatarUrl?: string;
    }
  ) {
    const {
      id,
      statusName,
      priorityName,
      taskCategoryName,
      assignedToId,
      assignedToClientId,
      skills,
      initialComment,
      ...updateData
    } = request;

    // fetching user since we need to use the name feild
    const userService = new UserService();
    const clientService = new ClientService();
    const user =
      userFromRequest.role !== Roles.CLIENT
        ? await userService.getUserProfile(userFromRequest.id)
        : await clientService.getClientProfile(userFromRequest.id);

    if (!user) {
      throw new BadRequestError('User not found');
    }

    const currentUser: CurrentUser = {
      id: user.id,
      role: {
        id: user?.role?.id ?? '',
        name: user?.role?.name ?? ('' as Roles),
      },
      name:
        user?.role?.name === Roles.CLIENT
          ? (user as any).contactName
          : `${(user as any).firstName} ${(user as any).lastName}`,
      username: user.username,
      avatarUrl: user.avatarUrl ?? '',
    };
    // Get the original task with all relationships
    const originalTask = await this.taskRepository.findTaskById(id);
    if (!originalTask) {
      throw new NotFoundError('Task not found');
    }

    // Determine if this is a new task (draft finalization)
    const isNewTask = !originalTask.title || originalTask.title === '';

    // Find IDs for status, priority, category
    const [status, priority, category] = await Promise.all([
      this.taskRepository.findTaskStatusByName(statusName),
      this.taskRepository.findTaskPriorityByName(priorityName),
      this.taskRepository.findTaskCategoryByName(taskCategoryName),
    ]);

    if (!status || !priority || !category) {
      throw new BadRequestError('Invalid statusName, priorityName, or taskCategoryName provided.');
    }

    // Permission check for assignment changes
    const canAssignTasks = (
      [
        Roles.SUPER_USER,
        Roles.TASK_SUPERVISOR,
        Roles.DISTRICT_MANAGER,
        Roles.TERRITORY_MANAGER,
      ] as Roles[]
    ).includes(currentUser?.role?.name as Roles);

    const isAssignmentChanging = assignedToId && assignedToId !== originalTask.assignedToId;
    const isClientAssignmentChanging =
      assignedToClientId && assignedToClientId !== originalTask.associatedClientId;

    if ((isAssignmentChanging || isClientAssignmentChanging) && !canAssignTasks) {
      throw new ForbiddenError("You don't have permission to assign tasks.");
    }

    // Validate assignee if changed
    let assignee = null;
    let assigneeName = null;
    let assigneeClient = null;
    let assigneeClientName = null;

    if (isAssignmentChanging && assignedToId) {
      assignee = await this.taskRepository.findUserById(assignedToId);
      if (!assignee) {
        throw new BadRequestError('Assigned user not found.');
      }
      assigneeName = `${assignee.firstName} ${assignee.lastName}`;
    }

    if (isClientAssignmentChanging && assignedToClientId) {
      assigneeClient = await this.taskRepository.findClientById(assignedToClientId);
      if (!assigneeClient) {
        throw new BadRequestError('Assigned client not found.');
      }
      assigneeClientName = `${assigneeClient.contactName} (${assigneeClient.companyName})`;
    }

    // Get original assignee names for change tracking
    let originalAssigneeName = 'Unassigned';
    if (originalTask.assignedToId) {
      const originalAssigneeData = await this.taskRepository.findUserById(
        originalTask.assignedToId
      );
      if (originalAssigneeData) {
        originalAssigneeName = `${originalAssigneeData.firstName} ${originalAssigneeData.lastName}`;
      }
    }

    let originalClientAssigneeName = 'Unassigned';
    if (originalTask.associatedClientId) {
      const originalClientData = await this.taskRepository.findClientById(
        originalTask.associatedClientId
      );
      if (originalClientData) {
        originalClientAssigneeName = `${originalClientData.contactName} (${originalClientData.companyName})`;
      }
    }

    // Validate skills if provided
    let skillIds: string[] = [];
    if (skills && skills.length > 0) {
      const foundSkills = await this.taskRepository.findSkillsByNames(skills);
      const foundSkillNames = foundSkills.map(s => s.name);
      const missingSkills = skills.filter(skill => !foundSkillNames.includes(skill));

      if (missingSkills.length > 0) {
        throw new BadRequestError(`Invalid skill names: ${missingSkills.join(', ')}`);
      }
      skillIds = foundSkills.map(s => s.id);
    }

    // Track changes for notifications (only if not a new task)
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      displayOldValue: string;
      displayNewValue: string;
    }> = [];

    if (!isNewTask) {
      // Helper function to transform enum values
      const transformEnumValue = (value: string): string => {
        return value
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };

      // Status change
      if (statusName && originalTask.status.statusName !== statusName) {
        changes.push({
          field: 'status',
          oldValue: originalTask.status.statusName,
          newValue: statusName,
          displayOldValue: transformEnumValue(originalTask.status.statusName),
          displayNewValue: transformEnumValue(statusName),
        });
      }

      // Priority change
      if (priorityName && originalTask.priority.priorityName !== priorityName) {
        changes.push({
          field: 'priority',
          oldValue: originalTask.priority.priorityName,
          newValue: priorityName,
          displayOldValue: transformEnumValue(originalTask.priority.priorityName),
          displayNewValue: transformEnumValue(priorityName),
        });
      }

      // Category change
      if (taskCategoryName && originalTask.taskCategory.categoryName !== taskCategoryName) {
        changes.push({
          field: 'taskCategory',
          oldValue: originalTask.taskCategory.categoryName,
          newValue: taskCategoryName,
          displayOldValue: originalTask.taskCategory.categoryName,
          displayNewValue: taskCategoryName,
        });
      }

      // Title change
      if (updateData.title && originalTask.title !== updateData.title) {
        changes.push({
          field: 'title',
          oldValue: originalTask.title,
          newValue: updateData.title,
          displayOldValue: originalTask.title,
          displayNewValue: updateData.title,
        });
      }

      // Description change
      if (updateData.description && originalTask.description !== updateData.description) {
        changes.push({
          field: 'description',
          oldValue: originalTask.description,
          newValue: updateData.description,
          displayOldValue: 'Previous description',
          displayNewValue: 'Updated description',
        });
      }

      // Due date change
      if (updateData.dueDate) {
        const newDueDateStr =
          typeof updateData.dueDate === 'string'
            ? updateData.dueDate
            : updateData.dueDate.toISOString().split('T')[0];
        const oldDueDateStr = originalTask.dueDate
          ? originalTask.dueDate.toISOString().split('T')[0]
          : null;

        if (oldDueDateStr !== newDueDateStr) {
          changes.push({
            field: 'dueDate',
            oldValue: oldDueDateStr,
            newValue: newDueDateStr,
            displayOldValue: oldDueDateStr
              ? new Date(oldDueDateStr).toLocaleDateString()
              : 'Not set',
            displayNewValue: newDueDateStr
              ? new Date(newDueDateStr).toLocaleDateString()
              : 'Not set',
          });
        }
      }

      // Time estimate change
      if (request.timeForTask && originalTask.timeForTask.toString() !== request.timeForTask) {
        const formatTime = (hours: string): string => {
          const totalHours = parseFloat(hours);
          if (totalHours < 24) return `${totalHours}h`;
          const days = Math.floor(totalHours / 24);
          const remainingHours = totalHours % 24;
          return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
        };

        changes.push({
          field: 'timeForTask',
          oldValue: originalTask.timeForTask.toString(),
          newValue: request.timeForTask,
          displayOldValue: formatTime(originalTask.timeForTask.toString()),
          displayNewValue: formatTime(request.timeForTask),
        });
      }

      // User Assignment change
      const newAssignedToId = assignee ? assignee.id : originalTask.assignedToId;
      if (newAssignedToId !== originalTask.assignedToId) {
        changes.push({
          field: 'assignedTo',
          oldValue: originalTask.assignedToId,
          newValue: newAssignedToId,
          displayOldValue: originalAssigneeName,
          displayNewValue: assigneeName || 'Unassigned',
        });
      }

      // Client Assignment change
      const newAssignedToClientId = assigneeClient
        ? assigneeClient.id
        : originalTask.associatedClientId;
      if (newAssignedToClientId !== originalTask.associatedClientId) {
        changes.push({
          field: 'associatedClient',
          oldValue: originalTask.associatedClientId,
          newValue: newAssignedToClientId,
          displayOldValue: originalClientAssigneeName,
          displayNewValue: assigneeClientName || 'Unassigned',
        });
      }

      // Skills change
      if (skills && skills.length > 0) {
        const currentSkills = originalTask.taskSkills.map(ts => ts.skill.name).sort();
        const newSkills = [...skills].sort();

        if (JSON.stringify(currentSkills) !== JSON.stringify(newSkills)) {
          changes.push({
            field: 'skills',
            oldValue: currentSkills.join(', '),
            newValue: newSkills.join(', '),
            displayOldValue: currentSkills.join(', ') || 'No skills',
            displayNewValue: newSkills.join(', '),
          });
        }
      }
    }

    // Prepare update data
    const taskUpdateData: any = {
      ...updateData,
      statusId: status.id,
      priorityId: priority.id,
      taskCategoryId: category.id,
    };

    // Handle decimal fields
    if (request.timeForTask) {
      taskUpdateData.timeForTask = new Prisma.Decimal(request.timeForTask);
    }
    if (request.overTime) {
      taskUpdateData.overTime = new Prisma.Decimal(request.overTime);
    }

    // Handle assignment changes
    if (isAssignmentChanging) {
      taskUpdateData.assignedToId = assignee ? assignee.id : null;
    }
    if (isClientAssignmentChanging) {
      taskUpdateData.associatedClientId = assigneeClient ? assigneeClient.id : null;
    }

    if (isNewTask && updateData.title) {
      try {
        // Check if custom prefix was provided
        const prefixToUse = request.customPrefix || category.prefix;

        if (!prefixToUse) {
          throw new BadRequestError(
            `Category "${category.categoryName}" does not have a prefix assigned`
          );
        }

        // Generate serial number
        const serialNumber = await this.serialNumberService.generateSerialNumber(prefixToUse);
        taskUpdateData.serialNumber = serialNumber;
        // delete the customPrefix from updateData to avoid issues
        delete taskUpdateData.customPrefix;

        if (taskUpdateData.customPrefix) {
          logger.error(
            'Custom prefix was tried to be deleted from request object',
            taskUpdateData.customPrefix
          );
        }

        logger.info(
          { taskId: id, serialNumber, prefix: prefixToUse, category: category.categoryName },
          'Generated serial number for new task'
        );
      } catch (error) {
        logger.error({ error, taskId: id }, 'Failed to generate serial number');
        // Don't fail the task creation if serial number generation fails
        // The task can be updated with a serial number later
      }
    }
    // Update the task
    const updatedTask = await this.taskRepository.updateTask(id, taskUpdateData);

    // Update skills
    if (skills !== undefined) {
      await this.taskRepository.updateTaskSkills(id, skillIds);
    }

    // Handle initial comment
    if (initialComment && initialComment.trim().length > 0) {
      try {
        await this.taskRepository.createTaskComment({
          content: initialComment.trim(),
          taskId: id,
          authorUserId: currentUser?.role?.name === Roles.CLIENT ? null : currentUser.id,
          authorClientId: currentUser?.role?.name === Roles.CLIENT ? currentUser.id : null,
          authorType:
            currentUser?.role?.name === Roles.CLIENT ? CreatorType.CLIENT : CreatorType.USER,
        });
      } catch (error) {
        console.error('Failed to create initial comment:', error);
      }
    }
    // ===== NOTIFICATION HANDLING =====
    try {
      if (isNewTask) {
        await this.handleNewTaskNotifications(
          updatedTask,
          originalTask,
          currentUser as CurrentUser,
          assignedToClientId
        );
      } else {
        await this.handleTaskUpdateNotifications(
          updatedTask,
          originalTask,
          changes,
          currentUser as CurrentUser,
          assignedToClientId
        );
      }
    } catch (notificationError) {
      // Log error but don't fail the task operation
      console.error('Failed to send notifications:', notificationError);
    }

    return {
      success: true,
      task: {
        ...updatedTask,
        statusName: status.statusName,
        priorityName: priority.priorityName,
        taskCategoryName: category.categoryName,
        timeForTask: updatedTask.timeForTask.toString(),
        overTime: updatedTask.overTime?.toString() || '0',
      },
      message: isNewTask ? 'Task created successfully.' : 'Task updated successfully.',
    };
  }

  /**
   * Handle notifications for new task creation
   */
  private async handleNewTaskNotifications(
    updatedTask: any,
    originalTask: any,
    currentUser: CurrentUser,
    assignedToClientId?: string
  ) {
    const notificationService = new NotificationService();
    const notificationFormatter = new NotificationFormatterService();
    let shouldNotifySupervisors = false;
    let notificationMessage = '';

    // Determine if we should send notifications based on creator role
    switch (currentUser.role.name) {
      case Roles.CLIENT:
        shouldNotifySupervisors = true;
        notificationMessage = `New task "${updatedTask.title}" has been created by ${currentUser.name} and needs assignment`;
        break;

      case Roles.TASK_AGENT:
        shouldNotifySupervisors = true;
        notificationMessage = `New task "${updatedTask.title}" has been created by ${currentUser.name}`;
        break;

      case Roles.SUPER_USER:
      case Roles.TASK_SUPERVISOR:
        shouldNotifySupervisors = false;
        notificationMessage = `New task "${updatedTask.title}" has been created by ${currentUser.name}`;
        break;

      default:
        shouldNotifySupervisors = false;
    }
    // format base notification data
    const taskCreationNotification = notificationFormatter.formatTaskCreationNotification({
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      priority: updatedTask.priority?.priorityName || TaskPriorityEnum.MEDIUM,
      status: updatedTask.status?.statusName || TaskStatusEnum.NEW,
      category: updatedTask.taskCategory?.categoryName || 'General',
      currentUser,
    });
    // Notify Task Supervisors
    if (shouldNotifySupervisors) {
      const taskSupervisors = await this.taskRepository.findUsersByRole(
        Roles.TASK_SUPERVISOR,
        currentUser.id
      );

      for (const supervisor of taskSupervisors) {
        try {
          const notification = await notificationService.createNotification({
            type: taskCreationNotification.type,
            message: notificationMessage,
            userId: supervisor.id,
            clientId: null,
            data: taskCreationNotification.data,
          });

          await notificationService.deliverNotification(
            {
              type: taskCreationNotification.type,
              message: notificationMessage,
              data: taskCreationNotification.data,
            },
            {
              type: taskCreationNotification.type,
              message: notificationMessage,
              userId: supervisor.id,
              clientId: null,
              data: taskCreationNotification.data,
            }
          );

          await notificationService.updateDeliveryStatus(notification.id);
        } catch (error) {
          console.error(`Failed to notify supervisor ${supervisor.id}:`, error);
        }
      }
    }

    // Notify assigned user if task was assigned during creation
    if (updatedTask.assignedToId && updatedTask.assignedToId !== currentUser.id) {
      try {
        const assignmentNotification = notificationFormatter.formatTaskAssignmentNotification({
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          priority: updatedTask.priority?.priorityName || TaskPriorityEnum.MEDIUM,
          status: updatedTask.status?.statusName || TaskStatusEnum.NEW,
          category: updatedTask.taskCategory?.categoryName || 'General',
          currentUser,
        });

        const notification = await notificationService.createNotification({
          type: assignmentNotification.type,
          message: assignmentNotification.message,
          userId: updatedTask.assignedToId,
          clientId: assignedToClientId || null,
          data: assignmentNotification.data,
        });

        await notificationService.deliverNotification(
          {
            type: assignmentNotification.type,
            message: assignmentNotification.message,
            data: assignmentNotification.data,
          },
          {
            type: assignmentNotification.type,
            message: assignmentNotification.message,
            userId: updatedTask.assignedToId,
            clientId: assignedToClientId || null,
            data: assignmentNotification.data,
          }
        );

        await notificationService.updateDeliveryStatus(notification.id);
      } catch (error) {
        console.error('Failed to send assignment notification:', error);
      }
    }
  }

  /**
   * Handle notifications for task updates
   */
  private async handleTaskUpdateNotifications(
    updatedTask: any,
    originalTask: any,
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      displayOldValue: string;
      displayNewValue: string;
    }>,
    currentUser: CurrentUser,
    assignedToClientId?: string
  ) {
    const NotificationService = (await import('./notification.service')).NotificationService;
    const notificationService = new NotificationService();
    const { NotificationFormatterService } = await import('./notificationFormatter.service');
    const formatter = new NotificationFormatterService();
    // Send batched update notifications if there are changes
    if (changes.length > 0) {
      try {
        // Format notification using the formatter service
        const updateNotification = formatter.formatTaskUpdateNotification({
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          changes,
          currentUser,
        });

        // Determine recipients
        const recipients: Array<{ userId?: string; clientId?: string | null }> = [];

        // Notify task creator if different from current user
        if (originalTask.createdByUserId && originalTask.createdByUserId !== currentUser.id) {
          recipients.push({ userId: originalTask.createdByUserId, clientId: null });
        }
        if (originalTask.createdByClientId && originalTask.createdByClientId !== currentUser.id) {
          recipients.push({ userId: undefined, clientId: originalTask.createdByClientId });
        }

        // Notify assigned user if different from current user
        if (originalTask.assignedToId && originalTask.assignedToId !== currentUser.id) {
          recipients.push({ userId: originalTask.assignedToId, clientId: null });
        }

        // Notify associated client if exists
        if (originalTask.associatedClientId) {
          recipients.push({ userId: undefined, clientId: originalTask.associatedClientId });
        }

        // Send to all recipients
        for (const recipient of recipients) {
          try {
            const notification = await notificationService.createNotification({
              type: updateNotification.type,
              message: updateNotification.message,
              userId: recipient.userId,
              clientId: recipient.clientId,
              data: updateNotification.data,
            });

            await notificationService.deliverNotification(
              {
                type: updateNotification.type,
                message: updateNotification.message,
                data: updateNotification.data,
              },
              {
                type: updateNotification.type,
                message: updateNotification.message,
                userId: recipient.userId,
                clientId: recipient.clientId,
                data: updateNotification.data,
              }
            );

            await notificationService.updateDeliveryStatus(notification.id);
          } catch (error) {
            console.error(`Failed to notify recipient:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to send task update notifications:', error);
      }
    }

    // Handle NEW assignment notifications separately
    if (originalTask.assignedToId !== updatedTask.assignedToId && updatedTask.assignedToId) {
      try {
        const assignmentNotification = formatter.formatTaskAssignmentNotification({
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          priority: updatedTask.priority?.priorityName || 'NORMAL',
          status: updatedTask.status?.statusName || 'NEW',
          category: updatedTask.taskCategory?.categoryName || 'General',
          currentUser,
        });

        const notification = await notificationService.createNotification({
          type: assignmentNotification.type,
          message: assignmentNotification.message,
          userId: updatedTask.assignedToId,
          clientId: assignedToClientId || null,
          data: assignmentNotification.data,
        });

        await notificationService.deliverNotification(
          {
            type: assignmentNotification.type,
            message: assignmentNotification.message,
            data: assignmentNotification.data,
          },
          {
            type: assignmentNotification.type,
            message: assignmentNotification.message,
            userId: updatedTask.assignedToId,
            clientId: assignedToClientId || null,
            data: assignmentNotification.data,
          }
        );

        await notificationService.updateDeliveryStatus(notification.id);
      } catch (error) {
        console.error('Failed to send assignment notification:', error);
      }
    }

    // Handle NEW client assignment notifications
    if (
      originalTask.associatedClientId !== updatedTask.associatedClientId &&
      updatedTask.associatedClientId
    ) {
      try {
        const clientAssignmentNotification = formatter.formatTaskAssignmentNotification({
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          priority: updatedTask.priority?.priorityName || 'NORMAL',
          status: updatedTask.status?.statusName || 'NEW',
          category: updatedTask.taskCategory?.categoryName || 'General',
          currentUser,
        });

        // Customize message for client
        const clientMessage = `Task "${updatedTask.title}" has been assigned to your organization by ${currentUser.name}`;

        const notification = await notificationService.createNotification({
          type: clientAssignmentNotification.type,
          message: clientMessage,
          userId: updatedTask.assignedToId || originalTask.assignedToId,
          clientId: updatedTask.associatedClientId,
          data: clientAssignmentNotification.data,
        });

        await notificationService.deliverNotification(
          {
            type: clientAssignmentNotification.type,
            message: clientMessage,
            data: clientAssignmentNotification.data,
          },
          {
            type: clientAssignmentNotification.type,
            message: clientMessage,
            userId: updatedTask.assignedToId || originalTask.assignedToId,
            clientId: updatedTask.associatedClientId,
            data: clientAssignmentNotification.data,
          }
        );

        await notificationService.updateDeliveryStatus(notification.id);
      } catch (error) {
        console.error('Failed to send client assignment notification:', error);
      }
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(request: DeleteTaskRequest) {
    const { taskId, role } = request;

    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to delete tasks.`);
    }

    // Verify task exists
    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Delete the task
    await this.taskRepository.deleteTask(taskId);

    return {
      success: true,
      task: { id: taskId },
      message: `Task with ID: ${taskId} deleted successfully`,
    };
  }

  /**
   * Search tasks by term
   */
  async searchTasks(searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new BadRequestError('Search term is required');
    }

    const tasks = await this.taskRepository.searchTasks(searchTerm);

    return {
      success: true,
      tasks,
    };
  }
}
