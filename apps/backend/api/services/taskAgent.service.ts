import prisma from '../config/db';
import { Prisma, Roles, TaskStatusEnum } from '@prisma/client';
import { logger } from '../utils/logger';

export interface TaskAgentWithCounts {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  assignedTasksCount: number;
  newTasksCount: number;
  inProgressTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
}

export interface TaskAgentsResponse {
  taskAgents: TaskAgentWithCounts[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface TaskAgentIdsResponse {
  ids: string[];
  totalCount: number;
}

export interface TaskAgentListResponse {
  success: boolean;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  }>;
}

export class TaskAgentService {
  /**
   * Get simple list of task agents (for dropdowns/assignment)
   */
  async getTaskAgentList(): Promise<TaskAgentListResponse> {
    try {
      const taskAgents = await prisma.user.findMany({
        where: {
          role: {
            name: Roles.TASK_AGENT,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
        orderBy: {
          firstName: 'asc',
        },
      });

      return {
        success: true,
        users: taskAgents,
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching task agent list');
      throw new Error('Failed to retrieve task agent list');
    }
  }

  /**
   * Get all task agent IDs for pagination
   */
  async getTaskAgentIds(): Promise<TaskAgentIdsResponse> {
    try {
      const users = await prisma.user.findMany({
        where: {
          role: {
            name: Roles.TASK_AGENT,
          },
        },
        orderBy: {
          id: 'asc',
        },
        select: {
          id: true,
        },
      });

      return {
        ids: users.map(user => user.id),
        totalCount: users.length,
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching task agent IDs');
      throw new Error('Failed to retrieve task agent IDs');
    }
  }

  /**
   * Get task agents with paginated results and task counts
   * FIXED: Use individual count queries instead of groupBy to avoid ambiguous column reference
   */
  async getTaskAgents(
    cursor: string | null = null,
    pageSize: number = 10,
    filterStatus: 'all' | 'available' | 'working' = 'all',
    searchTerm: string = ''
  ): Promise<TaskAgentsResponse> {
    try {
      // Build the base where condition for task agents
      const baseWhereCondition: Prisma.UserWhereInput = {
        role: {
          name: Roles.TASK_AGENT,
        },
      };

      // Add search condition if provided
      if (searchTerm) {
        const searchWords = searchTerm
          .trim()
          .split(' ')
          .filter(word => word.length > 0);

        if (searchWords.length === 1) {
          baseWhereCondition.OR = [
            { firstName: { contains: searchWords[0], mode: 'insensitive' } },
            { lastName: { contains: searchWords[0], mode: 'insensitive' } },
          ];
        } else if (searchWords.length >= 2) {
          baseWhereCondition.OR = [
            { firstName: { contains: searchWords[0], mode: 'insensitive' } },
            { lastName: { contains: searchWords[0], mode: 'insensitive' } },
            { firstName: { contains: searchWords[1], mode: 'insensitive' } },
            { lastName: { contains: searchWords[1], mode: 'insensitive' } },
            {
              AND: [
                { firstName: { contains: searchWords[0], mode: 'insensitive' } },
                { lastName: { contains: searchWords[1], mode: 'insensitive' } },
              ],
            },
          ];
        }
      }

      // Get total count for pagination
      const totalCount = await prisma.user.count({
        where: baseWhereCondition,
      });

      // Get paginated user IDs first
      const paginationOptions: Prisma.UserFindManyArgs = {
        where: baseWhereCondition,
        select: { id: true },
        orderBy: { firstName: 'asc' },
        take: pageSize + 1, // Take one extra to determine if there are more pages
      };

      if (cursor) {
        paginationOptions.cursor = { id: cursor };
        paginationOptions.skip = 1; // Skip the cursor itself
      }

      const paginatedUsers = await prisma.user.findMany(paginationOptions);

      // Determine if there are more pages
      const hasMore = paginatedUsers.length > pageSize;
      const userIds = paginatedUsers.slice(0, pageSize).map(user => user.id);
      const nextCursor = hasMore ? paginatedUsers[pageSize - 1]?.id || null : null;

      if (userIds.length === 0) {
        return {
          taskAgents: [],
          nextCursor: null,
          hasMore: false,
          totalCount,
        };
      }

      // Get detailed user information
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
        },
        orderBy: { firstName: 'asc' },
      });

      // Get task counts for each user individually - this avoids the ambiguous column issue
      const taskCounts = await Promise.all(
        userIds.map(async userId => {
          const [
            assignedTasksCount,
            newTasksCount,
            inProgressTasksCount,
            completedTasksCount,
            overdueTasksCount,
          ] = await prisma.$transaction([
            // New tasks
            prisma.task.count({
              where: {
                assignedToId: userId,
              },
            }),
            prisma.task.count({
              where: {
                assignedToId: userId,
                status: { statusName: TaskStatusEnum.NEW },
              },
            }),
            // In Progress tasks
            prisma.task.count({
              where: {
                assignedToId: userId,
                status: { statusName: TaskStatusEnum.IN_PROGRESS },
              },
            }),
            // Completed tasks
            prisma.task.count({
              where: {
                assignedToId: userId,
                status: { statusName: TaskStatusEnum.COMPLETED },
              },
            }),
            // Overdue tasks (both OVERDUE status and past due date)
            prisma.task.count({
              where: {
                assignedToId: userId,
                OR: [
                  // Tasks with OVERDUE status
                  {
                    status: { statusName: TaskStatusEnum.OVERDUE },
                  },
                  // OR tasks that are past due date and not completed/rejected
                  {
                    dueDate: { lt: new Date() },
                    status: {
                      statusName: {
                        notIn: [TaskStatusEnum.COMPLETED, TaskStatusEnum.REJECTED],
                      },
                    },
                  },
                ],
              },
            }),
          ]);

          return {
            userId,
            assignedTasksCount,
            newTasksCount,
            inProgressTasksCount,
            completedTasksCount,
            overdueTasksCount,
          };
        })
      );

      // Create maps for efficient lookup
      const taskCountMap = new Map(taskCounts.map(tc => [tc.userId, tc]));

      // Combine user data with task counts
      let taskAgents: TaskAgentWithCounts[] = users.map(user => {
        const counts = taskCountMap.get(user.id) || {
          assignedTasksCount: 0,
          newTasksCount: 0,
          inProgressTasksCount: 0,
          completedTasksCount: 0,
          overdueTasksCount: 0,
        };

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          designation: user.designation,
          assignedTasksCount: counts.assignedTasksCount,
          newTasksCount: counts.newTasksCount,
          inProgressTasksCount: counts.inProgressTasksCount,
          completedTasksCount: counts.completedTasksCount,
          overdueTasksCount: counts.overdueTasksCount,
        };
      });

      // Apply status filter if needed
      if (filterStatus !== 'all') {
        taskAgents = taskAgents.filter(agent => {
          if (filterStatus === 'available') {
            // Available: agents with no new or in-progress tasks
            return agent.assignedTasksCount === 0 && agent.inProgressTasksCount === 0;
          } else if (filterStatus === 'working') {
            // Working: agents with new or in-progress tasks
            return agent.assignedTasksCount > 0 || agent.inProgressTasksCount > 0;
          }
          return true;
        });
      }

      return {
        taskAgents,
        nextCursor,
        hasMore,
        totalCount,
      };
    } catch (error) {
      // Additional debugging information
      if (error instanceof Error) {
        logger.error(
          {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          'Detailed error information'
        );
      }

      throw new Error('Failed to retrieve task agents');
    }
  }

  /**
   * Get task agent details by ID with task counts
   * FIXED VERSION with proper error handling
   */
  async getTaskAgentById(id: string): Promise<TaskAgentWithCounts | null> {
    try {
      logger.info('Fetching task agent by ID', { id });

      const user = await prisma.user.findFirst({
        where: {
          id,
          role: {
            name: Roles.TASK_AGENT,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
        },
      });

      if (!user) {
        logger.info('User not found', { id });
        return null;
      }

      logger.info('User found, fetching task counts', { user });

      // Get all task counts in one transaction - FIXED queries
      const taskCounts = await prisma.$transaction([
        // Assigned tasks
        prisma.task.count({
          where: {
            assignedToId: id,
          },
        }),

        prisma.task.count({
          where: {
            assignedToId: id,
            status: { statusName: TaskStatusEnum.NEW },
          },
        }),
        // In Progress tasks
        prisma.task.count({
          where: {
            assignedToId: id,
            status: { statusName: TaskStatusEnum.IN_PROGRESS },
          },
        }),
        // Completed tasks
        prisma.task.count({
          where: {
            assignedToId: id,
            status: { statusName: TaskStatusEnum.COMPLETED },
          },
        }),
        // Overdue tasks - using existing status or date-based logic
        prisma.task.count({
          where: {
            assignedToId: id,
            OR: [
              // Tasks with OVERDUE status
              {
                status: { statusName: TaskStatusEnum.OVERDUE },
              },
              // OR tasks that are past due date and not completed/rejected
              {
                dueDate: { lt: new Date() },
                status: {
                  statusName: {
                    notIn: [TaskStatusEnum.COMPLETED, TaskStatusEnum.REJECTED],
                  },
                },
              },
            ],
          },
        }),
      ]);

      const [
        assignedTasksCount,
        newTasksCount,
        inProgressTasksCount,
        completedTasksCount,
        overdueTasksCount,
      ] = taskCounts;

      logger.info('Task counts retrieved', {
        assignedTasksCount,
        newTasksCount,
        inProgressTasksCount,
        completedTasksCount,
        overdueTasksCount,
      });

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        designation: user.designation,
        assignedTasksCount,
        newTasksCount,
        inProgressTasksCount,
        completedTasksCount,
        overdueTasksCount,
      };
    } catch (error) {
      logger.error({ error, id }, 'Error fetching task agent by ID');
      throw new Error(`Failed to retrieve task agent with ID: ${id}`);
    }
  }
}
