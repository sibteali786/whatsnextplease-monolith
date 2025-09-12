// apps/backend/api/repositories/task.repository.ts
import { PrismaClient, Prisma, TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';
// import { DurationEnum } from '@wnp/types';

export interface TaskFilters {
  whereCondition?: Prisma.TaskWhereInput;
  dateFilter?: Prisma.TaskWhereInput;
  searchTerm?: string;
  status?: TaskStatusEnum;
  priority?: TaskPriorityEnum;
  assignedToId?: string | null;
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

    const { cursor, pageSize, orderBy = { id: 'asc' } } = options;

    // Build comprehensive where clause
    const where: Prisma.TaskWhereInput = {
      ...whereCondition,
      ...dateFilter,
      ...(status && { status: { statusName: status } }),
      ...(priority && { priority: { priorityName: priority } }),
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
        assignedToId: true,
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
      ...(status && { status: { statusName: status } }),
      ...(priority && { priority: { priorityName: priority } }),
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            dueDate: { lt: new Date() },
            status: { statusName: { notIn: ['COMPLETED'] } },
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
    orderBy: Prisma.TaskOrderByWithRelationInput = { id: 'asc' }
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
      ...(status && { status: { statusName: status } }),
      ...(priority && { priority: { priorityName: priority } }),
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
      ...(updatedFilters.status && { status: { statusName: updatedFilters.status } }),
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
        assignedToId: true,
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
}
