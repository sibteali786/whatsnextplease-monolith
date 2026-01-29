import { PrismaClient, CreatorType, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateWorkLogData {
  taskId: string;
  authorUserId?: string;
  authorClientId?: string;
  authorType: CreatorType;
  timeSpent: number; // in minutes
  timeRemaining?: number; // in minutes
  startedAt: Date;
  description: string;
}

export interface UpdateWorkLogData {
  timeSpent?: number;
  timeRemaining?: number;
  startedAt?: Date;
  description?: string;
}

export interface WorkLogWithRelations {
  id: string;
  taskId: string;
  authorType: CreatorType;
  timeSpent: number;
  timeRemaining: number | null;
  startedAt: Date;
  description: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  authorClient?: {
    id: string;
    companyName: string;
    contactName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface WorkLogQueryOptions {
  cursor?: string;
  pageSize: number;
  orderBy?: Prisma.WorkLogOrderByWithRelationInput;
  includeDeleted?: boolean;
}

export class WorklogRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}
  /**
   * Create a work log with task aggregation update (transactional)
   */
  async createWorklog(data: CreateWorkLogData): Promise<WorkLogWithRelations> {
    return await this.prisma.$transaction(async tx => {
      // 1. Create the work log
      const workLog = await tx.workLog.create({
        data,
        include: {
          authorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          authorClient: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // 2. Update task aggregation
      await this.updateTaskAggregation(tx, data.taskId);

      logger.info(`WorkLog created: ${workLog.id} for task ${data.taskId}`);
      return workLog;
    });
  }

  /**
   * Find work logs by task ID with pagination
   */
  async findWorkLogsByTaskId(
    taskId: string,
    options: WorkLogQueryOptions
  ): Promise<{
    workLogs: WorkLogWithRelations[];
    hasNextCursor: boolean;
    nextCursor: string | null;
  }> {
    const { cursor, pageSize, orderBy = { startedAt: 'desc' }, includeDeleted = false } = options;

    const whereCondition: Prisma.WorkLogWhereInput = {
      taskId,
      ...(includeDeleted ? {} : { isDeleted: false }),
    };

    const workLogs = await this.prisma.workLog.findMany({
      where: whereCondition,
      take: pageSize + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy,
      include: {
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        authorClient: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const hasNextCursor = workLogs.length > pageSize;
    const nextCursor = hasNextCursor ? workLogs[pageSize - 1].id : null;
    if (hasNextCursor) {
      workLogs.pop();
    }
    return {
      workLogs,
      hasNextCursor,
      nextCursor,
    };
  }

  /**
   * Find work log by ID
   */
  async findWorkLogById(workLogId: string): Promise<WorkLogWithRelations | null> {
    return await this.prisma.workLog.findUnique({
      where: { id: workLogId },
      include: {
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        authorClient: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Update work log with task aggregation update (transactional)
   */
  async updateWorkLog(workLogId: string, data: UpdateWorkLogData): Promise<WorkLogWithRelations> {
    return await this.prisma.$transaction(async tx => {
      // 1. Get current work log to access taskId
      const existingWorkLog = await tx.workLog.findUniqueOrThrow({
        where: { id: workLogId },
        select: { taskId: true },
      });

      // 2. Update the work log
      const updatedWorkLog = await tx.workLog.update({
        where: { id: workLogId },
        data,
        include: {
          authorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          authorClient: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // 3. Update task aggregation
      await this.updateTaskAggregation(tx, existingWorkLog.taskId);

      logger.info(`WorkLog updated: ${workLogId}`);
      return updatedWorkLog;
    });
  }

  /**
   * Soft delete work log with task aggregation update (transactional)
   */
  async deleteWorkLog(workLogId: string, deletedById: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      // 1. Get work log before deletion
      const workLog = await tx.workLog.findUniqueOrThrow({
        where: { id: workLogId },
        select: { taskId: true },
      });

      // 2. Soft delete the work log
      await tx.workLog.update({
        where: { id: workLogId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedById,
        },
      });

      // 3. Update task aggregation
      await this.updateTaskAggregation(tx, workLog.taskId);

      logger.info(`WorkLog soft deleted: ${workLogId} by user ${deletedById}`);
    });
  }

  /**
   * Count work logs for a task
   */
  async countWorkLogsByTaskId(taskId: string, includeDeleted = false): Promise<number> {
    return await this.prisma.workLog.count({
      where: {
        taskId,
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
    });
  }

  /**
   * Update task aggregation fields (totalTimeSpent, latestTimeRemaining)
   * This method is called within transactions by create/update/delete operations
   */
  private async updateTaskAggregation(
    tx: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
    taskId: string
  ): Promise<void> {
    // Get all non-deleted work logs for this task
    const workLogs = await tx.workLog.findMany({
      where: {
        taskId,
        isDeleted: false,
      },
      select: {
        timeSpent: true,
        timeRemaining: true,
        startedAt: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Calculate aggregations
    const totalTimeSpent = workLogs.reduce((sum, log) => sum + log.timeSpent, 0);
    const latestTimeRemaining =
      workLogs.length > 0 && workLogs[0].timeRemaining !== null ? workLogs[0].timeRemaining : null;

    // Update task
    await tx.task.update({
      where: { id: taskId },
      data: {
        totalTimeSpent: workLogs.length > 0 ? totalTimeSpent : null,
        latestTimeRemaining,
      },
    });

    logger.debug(
      `Task aggregation updated for task ${taskId}: totalTimeSpent=${totalTimeSpent}, latestTimeRemaining=${latestTimeRemaining}`
    );
  }

  /**
   * Get total time spent for a task (without loading all work logs)
   */
  async getTotalTimeSpent(taskId: string): Promise<number> {
    const result = await this.prisma.workLog.aggregate({
      where: {
        taskId,
        isDeleted: false,
      },
      _sum: {
        timeSpent: true,
      },
    });

    return result._sum.timeSpent || 0;
  }

  /**
   * Verify task exists
   */
  async findTaskById(taskId: string) {
    return await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        createdByUserId: true,
        createdByClientId: true,
      },
    });
  }
}
