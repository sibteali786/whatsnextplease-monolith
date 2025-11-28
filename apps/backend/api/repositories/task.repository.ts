/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PrismaClient,
  Prisma,
  TaskStatusEnum,
  TaskPriorityEnum,
  CreatorType,
  Roles,
} from '@prisma/client';
// import { DurationEnum } from '@wnp/types';

export interface TaskFilters {
  whereCondition?: Prisma.TaskWhereInput;
  dateFilter?: Prisma.TaskWhereInput;
  searchTerm?: string;
  status?: TaskStatusEnum | TaskStatusEnum[];
  priority?: TaskPriorityEnum | TaskPriorityEnum[];
  assignedToId?: string | null | { not: null };
  categoryId?: string;
}

export interface TaskQueryOptions {
  cursor?: string;
  pageSize: number;
  orderBy?: Prisma.TaskOrderByWithRelationInput;
}

export interface BatchUpdateData {
  statusId?: string;
  priorityId?: string;
  assignedToId?: string | null;
  categoryId?: string;
  dueDate?: Date | null;
}

export class TaskRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  /**
   * Find tasks with filters and pagination
   */
  async findTasks(filters: TaskFilters, options: TaskQueryOptions) {
    const {
      whereCondition = {},
      dateFilter = {},
      searchTerm,
      status,
      priority,
      assignedToId,
      categoryId,
    } = filters;

    const { cursor, pageSize, orderBy = { createdAt: 'asc' } } = options;
    // Build comprehensive where clause
    const where: Prisma.TaskWhereInput = {
      ...whereCondition,
      ...dateFilter,
      ...(status && { status: { statusName: { in: Array.isArray(status) ? status : [status] } } }), // Handle both single and array status

      ...(priority && {
        priority: { priorityName: { in: Array.isArray(priority) ? priority : [priority] } },
      }),
      ...(assignedToId !== undefined && { assignedToId: assignedToId }),
      ...(categoryId && { categoryId }),
      ...(searchTerm && {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }),
    };
    const tasks = await this.prisma.task.findMany({
      where,
      take: pageSize + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        serialNumber: true,
        priority: { select: { id: true, priorityName: true } },
        status: { select: { id: true, statusName: true } },
        taskCategory: { select: { id: true, categoryName: true, prefix: true } },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        associatedClient: {
          select: { id: true, companyName: true, contactName: true, avatarUrl: true },
        },
        assignedToId: true,
        associatedClientId: true,
        dueDate: true,
        timeForTask: true,
        overTime: true,
        taskSkills: {
          select: { skill: { select: { id: true, name: true } } },
        },
        taskFiles: {
          select: {
            file: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                fileSize: true,
                uploadedBy: true,
                uploadedAt: true,
              },
            },
          },
        },
        createdByClient: {
          select: { id: true, companyName: true, contactName: true },
        },
        createdByClientId: true,
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasNextCursor = tasks.length > pageSize;
    const nextCursor = hasNextCursor ? tasks[pageSize]?.id : null;
    if (hasNextCursor) {
      tasks.pop();
    }
    return {
      tasks,
      hasNextCursor,
      nextCursor,
    };
  }

  /**
   * Count tasks with filters
   */
  async countTasks(filters: TaskFilters): Promise<number> {
    const {
      whereCondition = {},
      dateFilter = {},
      searchTerm,
      status,
      priority,
      assignedToId,
      categoryId,
    } = filters;

    const where: Prisma.TaskWhereInput = {
      ...whereCondition,
      ...dateFilter,
      ...(status && { status: { statusName: { in: Array.isArray(status) ? status : [status] } } }), // Handle both single and array status
      ...(priority && {
        priority: { priorityName: { in: Array.isArray(priority) ? priority : [priority] } },
      }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(categoryId && { categoryId }),
      ...(searchTerm && {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.task.count({ where });
  }

  /**
   * Find task by ID
   */
  async findTaskById(taskId: string) {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        priority: { select: { id: true, priorityName: true } },
        status: { select: { id: true, statusName: true } },
        taskCategory: { select: { id: true, categoryName: true } },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },

        associatedClient: {
          select: { id: true, companyName: true, contactName: true, avatarUrl: true },
        },

        taskSkills: {
          include: {
            skill: { select: { id: true, name: true } },
          },
        },
        taskFiles: {
          include: {
            file: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                fileSize: true,
                uploadedBy: true,
                uploadedAt: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find multiple tasks by IDs
   */
  async findTasksByIds(taskIds: string[]) {
    return this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        statusId: true,
        priorityId: true,
      },
    });
  }

  /**
   * Batch update tasks
   */
  async batchUpdateTasks(taskIds: string[], updateData: BatchUpdateData) {
    return this.prisma.$transaction(async tx => {
      const updatedTasks = await Promise.all(
        taskIds.map(taskId => {
          // Build the update data with proper Prisma relation syntax
          const prismaUpdateData: any = {};

          // Handle status update
          if (updateData.statusId) {
            prismaUpdateData.status = {
              connect: { id: updateData.statusId },
            };
          }

          // Handle priority update
          if (updateData.priorityId) {
            prismaUpdateData.priority = {
              connect: { id: updateData.priorityId },
            };
          }

          // Handle assignee update
          if (updateData.assignedToId !== undefined) {
            if (updateData.assignedToId) {
              prismaUpdateData.assignedTo = {
                connect: { id: updateData.assignedToId },
              };
            } else {
              prismaUpdateData.assignedTo = {
                disconnect: true,
              };
            }
          }

          // Handle category update
          if (updateData.categoryId) {
            prismaUpdateData.taskCategory = {
              connect: { id: updateData.categoryId },
            };
          }

          // Handle due date update
          if (updateData.dueDate !== undefined) {
            prismaUpdateData.dueDate = updateData.dueDate;
          }

          return tx.task.update({
            where: { id: taskId },
            data: prismaUpdateData,
            select: { id: true, title: true },
          });
        })
      );

      return updatedTasks;
    });
  }

  /**
   * Batch update task skills
   */
  async batchUpdateTaskSkills(taskIds: string[], skillIds: string[]) {
    return this.prisma.$transaction(async tx => {
      // Remove existing skills for all tasks
      await tx.taskSkill.deleteMany({
        where: { taskId: { in: taskIds } },
      });

      // Add new skills for all tasks
      const taskSkillData = taskIds.flatMap(taskId =>
        skillIds.map(skillId => ({ taskId, skillId }))
      );

      if (taskSkillData.length > 0) {
        await tx.taskSkill.createMany({
          data: taskSkillData,
        });
      }

      return taskSkillData.length;
    });
  }

  /**
   * Batch delete tasks
   */
  async batchDeleteTasks(taskIds: string[]) {
    return this.prisma.task.deleteMany({
      where: { id: { in: taskIds } },
    });
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(whereCondition: Prisma.TaskWhereInput = {}) {
    const [totalTasks, tasksByStatus, tasksByPriority, overdueTasks, tasksCreatedToday] =
      await Promise.all([
        this.prisma.task.count({ where: whereCondition }),

        this.prisma.task.groupBy({
          by: ['statusId'],
          where: whereCondition,
          _count: { id: true },
        }),

        this.prisma.task.groupBy({
          by: ['priorityId'],
          where: whereCondition,
          _count: { id: true },
        }),

        this.prisma.task.count({
          where: {
            ...whereCondition,
            OR: [
              { status: { statusName: 'OVERDUE' } },
              {
                dueDate: { lt: new Date() },
                status: { statusName: { notIn: ['COMPLETED', 'REJECTED'] } },
              },
            ],
          },
        }),

        this.prisma.task.count({
          where: {
            ...whereCondition,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);

    // Get status and priority details
    const [statusDetails, priorityDetails] = await Promise.all([
      this.prisma.taskStatus.findMany({
        where: { id: { in: tasksByStatus.map(s => s.statusId) } },
        select: { id: true, statusName: true },
      }),
      this.prisma.taskPriority.findMany({
        where: { id: { in: tasksByPriority.map(p => p.priorityId) } },
        select: { id: true, priorityName: true },
      }),
    ]);

    return {
      totalTasks,
      tasksByStatus: tasksByStatus.map(stat => ({
        ...stat,
        status: statusDetails.find(s => s.id === stat.statusId),
      })),
      tasksByPriority: tasksByPriority.map(stat => ({
        ...stat,
        priority: priorityDetails.find(p => p.id === stat.priorityId),
      })),
      overdueTasks,
      tasksCreatedToday,
    };
  }
  async getTaskAssignmentStatusCounts(whereCondition: Prisma.TaskWhereInput = {}) {
    const [unassignedCount, assignedCount] = await Promise.all([
      this.prisma.task.count({
        where: { ...whereCondition, assignedToId: null }, // Unassigned tasks
      }),
      this.prisma.task.count({
        where: { ...whereCondition, NOT: { assignedToId: null } }, // Assigned tasks
      }),
    ]);

    return {
      UnassignedTasks: unassignedCount,
      AssignedTasks: assignedCount,
    };
  }
  /**
   * Find task status by name
   */
  async findTaskStatusByName(statusName: TaskStatusEnum) {
    return this.prisma.taskStatus.findFirst({
      where: { statusName },
      select: { id: true, statusName: true },
    });
  }

  /**
   * Find task priority by name
   */
  async findTaskPriorityByName(priorityName: TaskPriorityEnum) {
    return this.prisma.taskPriority.findFirst({
      where: { priorityName },
      select: { id: true, priorityName: true },
    });
  }

  /**
   * Find task category by ID
   */
  async findTaskCategoryById(categoryId: string) {
    return this.prisma.taskCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, categoryName: true },
    });
  }

  /**
   * Find user by ID (for assignee validation)
   */
  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
  }

  /**
   * Find skills by IDs
   */
  async findSkillsByIds(skillIds: string[]) {
    return this.prisma.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true, name: true },
    });
  }

  /**
   * Get task IDs only (for pagination)
   */
  async findTaskIds(
    filters: TaskFilters,
    orderBy: Prisma.TaskOrderByWithRelationInput = { createdAt: 'asc' }
  ) {
    const {
      whereCondition = {},
      dateFilter = {},
      searchTerm,
      status,
      priority,
      assignedToId,
      categoryId,
    } = filters;

    const where: Prisma.TaskWhereInput = {
      ...whereCondition,
      ...dateFilter,
      ...(status && { status: { statusName: { in: Array.isArray(status) ? status : [status] } } }), // Handle both single and array status
      ...(priority && {
        priority: { priorityName: { in: Array.isArray(priority) ? priority : [priority] } },
      }), // Handle both single and array status
      ...(assignedToId !== undefined && { assignedToId }),
      ...(categoryId && { categoryId }),
      ...(searchTerm && {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }),
    };

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy,
      select: { id: true },
    });

    return tasks.map(task => task.id);
  }
  /**
   * Get all available task statuses for dropdowns
   */
  async getAllTaskStatuses() {
    return this.prisma.taskStatus.findMany({
      select: { id: true, statusName: true },
      orderBy: { statusName: 'asc' },
    });
  }

  /**
   * Get all available task priorities for dropdowns
   */
  async getAllTaskPriorities() {
    return this.prisma.taskPriority.findMany({
      select: { id: true, priorityName: true },
      orderBy: { priorityName: 'asc' },
    });
  }

  /**
   * Validate task status transition based on workflow rules
   */
  async validateStatusTransition(
    fromStatus: TaskStatusEnum,
    toStatus: TaskStatusEnum
  ): Promise<boolean> {
    // Define your workflow transitions
    const allowedTransitions: Record<TaskStatusEnum, TaskStatusEnum[]> = {
      [TaskStatusEnum.NEW]: [
        TaskStatusEnum.IN_PROGRESS,
        TaskStatusEnum.CONTENT_IN_PROGRESS,
        TaskStatusEnum.BLOCKED,
        TaskStatusEnum.ON_HOLD,
      ],
      [TaskStatusEnum.IN_PROGRESS]: [
        TaskStatusEnum.TESTING,
        TaskStatusEnum.REVIEW,
        TaskStatusEnum.COMPLETED,
        TaskStatusEnum.BLOCKED,
        TaskStatusEnum.ON_HOLD,
      ],
      [TaskStatusEnum.CONTENT_IN_PROGRESS]: [
        TaskStatusEnum.REVIEW,
        TaskStatusEnum.IN_PROGRESS,
        TaskStatusEnum.BLOCKED,
        TaskStatusEnum.ON_HOLD,
      ],
      [TaskStatusEnum.TESTING]: [
        TaskStatusEnum.REVIEW,
        TaskStatusEnum.COMPLETED,
        TaskStatusEnum.REJECTED,
        TaskStatusEnum.BLOCKED,
      ],
      [TaskStatusEnum.REVIEW]: [
        TaskStatusEnum.APPROVED,
        TaskStatusEnum.REJECTED,
        TaskStatusEnum.IN_PROGRESS,
      ],
      [TaskStatusEnum.BLOCKED]: [
        TaskStatusEnum.IN_PROGRESS,
        TaskStatusEnum.NEW,
        TaskStatusEnum.ON_HOLD,
      ],
      [TaskStatusEnum.ON_HOLD]: [TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.NEW],
      [TaskStatusEnum.REJECTED]: [TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.CONTENT_IN_PROGRESS],
      [TaskStatusEnum.APPROVED]: [TaskStatusEnum.COMPLETED],
      [TaskStatusEnum.COMPLETED]: [], // Terminal state
      [TaskStatusEnum.OVERDUE]: [
        TaskStatusEnum.IN_PROGRESS,
        TaskStatusEnum.COMPLETED,
        TaskStatusEnum.BLOCKED,
      ],
    };

    return allowedTransitions[fromStatus]?.includes(toStatus) ?? false;
  }

  /**
   * Get priority mapping for grouping legacy and new priorities
   */
  getPriorityLevelMapping(): Record<string, TaskPriorityEnum[]> {
    return {
      critical: [TaskPriorityEnum.CRITICAL, TaskPriorityEnum.URGENT],
      high: [TaskPriorityEnum.HIGH],
      medium: [TaskPriorityEnum.MEDIUM, TaskPriorityEnum.NORMAL],
      low: [TaskPriorityEnum.LOW, TaskPriorityEnum.LOW_PRIORITY],
      hold: [TaskPriorityEnum.HOLD],
    };
  }

  /**
   * Get tasks by priority level (combines legacy and new priorities)
   */
  async getTasksByPriorityLevel(
    level: 'critical' | 'high' | 'medium' | 'low' | 'hold',
    filters: TaskFilters,
    options: TaskQueryOptions
  ) {
    const priorityMapping = this.getPriorityLevelMapping();
    const priorities = priorityMapping[level] || [];

    if (priorities.length === 0) {
      return { tasks: [], hasNextCursor: false, nextCursor: null };
    }

    const updatedFilters = {
      ...filters,
      priority: undefined, // Remove single priority filter
    };

    const { cursor, pageSize, orderBy = { id: 'asc' } } = options;

    const where: Prisma.TaskWhereInput = {
      ...updatedFilters.whereCondition,
      ...updatedFilters.dateFilter,
      priority: { priorityName: { in: priorities } }, // Use multiple priorities
      ...(updatedFilters.status && {
        status: {
          statusName: {
            in: Array.isArray(updatedFilters.status)
              ? updatedFilters.status
              : [updatedFilters.status],
          },
        },
      }), // Handle single or array status
      ...(updatedFilters.assignedToId !== undefined && {
        assignedToId: updatedFilters.assignedToId,
      }),
      ...(updatedFilters.categoryId && { categoryId: updatedFilters.categoryId }),
      ...(updatedFilters.searchTerm && {
        OR: [
          { title: { contains: updatedFilters.searchTerm, mode: 'insensitive' } },
          { description: { contains: updatedFilters.searchTerm, mode: 'insensitive' } },
        ],
      }),
    };

    const tasks = await this.prisma.task.findMany({
      where,
      take: pageSize + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        priority: { select: { id: true, priorityName: true } },
        status: { select: { id: true, statusName: true } },
        taskCategory: { select: { id: true, categoryName: true } },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        associatedClient: {
          select: { id: true, companyName: true, contactName: true, avatarUrl: true },
        },
        assignedToId: true,
        associatedClientId: true,
        dueDate: true,
        timeForTask: true,
        overTime: true,
        taskSkills: {
          select: { skill: { select: { id: true, name: true } } },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasNextCursor = tasks.length > pageSize;
    const nextCursor = hasNextCursor ? tasks[pageSize]?.id : null;
    if (hasNextCursor) {
      tasks.pop();
    }

    return { tasks, hasNextCursor, nextCursor };
  }

  /**
   * Find task category by name
   */
  async findTaskCategoryByName(categoryName: string) {
    return this.prisma.taskCategory.findFirst({
      where: { categoryName },
      select: { id: true, categoryName: true, prefix: true },
    });
  }

  /**
   * Find first task category (fallback)
   */
  async findFirstTaskCategory() {
    return this.prisma.taskCategory.findFirst({
      select: { id: true, categoryName: true, prefix: true },
    });
  }

  /**
   * Create a new task category
   */
  async createTaskCategory(categoryName: string) {
    // Generate prefix automatically
    const prefix = this.generatePrefixFromName(categoryName);

    // Check uniqueness
    let finalPrefix = prefix;
    let counter = 1;
    while (await this.prisma.taskCategory.findFirst({ where: { prefix: finalPrefix } })) {
      finalPrefix = `${prefix}${counter}`;
      counter++;
    }

    const category = await this.prisma.taskCategory.create({
      data: {
        categoryName,
        prefix: finalPrefix,
      },
    });

    // Create corresponding TaskSequence
    await this.prisma.taskSequence.create({
      data: {
        prefix: finalPrefix,
        taskCategoryId: category.id,
        currentNumber: 0,
      },
    });

    return category;
  }

  private generatePrefixFromName(categoryName: string): string {
    const words = categoryName
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);

    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    } else {
      return words
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 3);
    }
  }

  /**
   * Find client by ID
   */
  async findClientById(clientId: string) {
    return this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, username: true, companyName: true, contactName: true },
    });
  }

  /**
   * Find skills by names
   */
  async findSkillsByNames(skillNames: string[]) {
    return this.prisma.skill.findMany({
      where: { name: { in: skillNames } },
      select: { id: true, name: true },
    });
  }

  /**
   * Create a draft task
   */
  async createDraftTask(data: {
    statusId: string;
    priorityId: string;
    taskCategoryId: string;
    creatorType: CreatorType;
    createdByUserId?: string;
    createdByClientId?: string;
  }) {
    console.log('Creating draft task with data:', data);
    return this.prisma.task.create({
      data: {
        title: '',
        description: '',
        timeForTask: 0,
        ...data,
      },
      select: { id: true },
    });
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, data: any) {
    return this.prisma.task.update({
      where: { id: taskId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        statusId: true,
        priorityId: true,
        taskCategoryId: true,
        assignedToId: true,
        associatedClientId: true,
        dueDate: true,
        timeForTask: true,
        overTime: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update task skills
   */
  async updateTaskSkills(taskId: string, skillIds: string[]) {
    // Remove existing skills
    await this.prisma.taskSkill.deleteMany({
      where: { taskId },
    });

    // Add new skills if any
    if (skillIds.length > 0) {
      await this.prisma.taskSkill.createMany({
        data: skillIds.map(skillId => ({ taskId, skillId })),
      });
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string) {
    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  /**
   * Create a task comment
   */
  async createTaskComment(data: {
    content: string;
    taskId: string;
    authorUserId?: string | null;
    authorClientId?: string | null;
    authorType: CreatorType;
  }) {
    return this.prisma.taskComment.create({
      data: {
        ...data,
        mentionedUserIds: [],
      },
    });
  }

  /**
   * Search tasks by title or description
   */
  async searchTasks(searchTerm: string) {
    return this.prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: { select: { priorityName: true } },
        status: { select: { statusName: true } },
        taskCategory: { select: { categoryName: true } },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find users by role (excluding specific user)
   */
  async findUsersByRole(role: Roles, excludeUserId?: string) {
    return this.prisma.user.findMany({
      where: {
        role: { name: role },
        ...(excludeUserId && { id: { not: excludeUserId } }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  /**
   * Find task by serial number
   */
  async findTaskBySerialNumber(serialNumber: string) {
    return this.prisma.task.findUnique({
      where: { serialNumber },
      include: {
        priority: { select: { id: true, priorityName: true } },
        status: { select: { id: true, statusName: true } },
        taskCategory: { select: { id: true, categoryName: true, prefix: true } },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        associatedClient: {
          select: { id: true, companyName: true, contactName: true, avatarUrl: true },
        },
        taskSkills: {
          include: {
            skill: { select: { id: true, name: true } },
          },
        },
        taskFiles: {
          include: {
            file: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                fileSize: true,
                uploadedBy: true,
                uploadedAt: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Check if serial number exists
   */
  async serialNumberExists(serialNumber: string): Promise<boolean> {
    const task = await this.prisma.task.findUnique({
      where: { serialNumber },
      select: { id: true },
    });
    return !!task;
  }
}
