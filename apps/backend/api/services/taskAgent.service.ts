import prisma from '../config/db';
import { Prisma, Roles, TaskStatusEnum } from '@prisma/client';
import { logger } from '../utils/logger';

export interface TaskAgentWithCounts {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  assignedTasksCount: number;
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

export class TaskAgentService {
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
   */
  async getTaskAgents(
    cursor: string | null = null,
    pageSize: number = 10,
    filterStatus: 'all' | 'available' | 'working' = 'all',
    searchTerm: string = ''
  ): Promise<TaskAgentsResponse> {
    try {
      const whereCondition: Prisma.UserWhereInput = {
        role: {
          name: Roles.TASK_AGENT,
        },
      };
      // Add search term filtering if provided
      if (searchTerm) {
        whereCondition.OR = [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { designation: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }
      // Fetch one more than needed to determine if there are more results
      const users = await prisma.user.findMany({
        where: whereCondition,
        take: pageSize + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: {
          id: 'asc',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
        },
      });

      // Check if there are more results
      const hasMore = users.length > pageSize;
      if (hasMore) {
        users.pop(); // Remove the extra item
      }

      // Get the total count
      const totalCount = await prisma.user.count({
        where: whereCondition,
      });

      // Calculate task counts for each agent
      const taskAgentsWithCounts: TaskAgentWithCounts[] = await Promise.all(
        users.map(async user => {
          // Get assigned tasks count
          const assignedTasksCount = await prisma.task.count({
            where: {
              assignedToId: user.id,
              status: {
                statusName: TaskStatusEnum.NEW,
              },
            },
          });

          // Get in progress tasks count
          const inProgressTasksCount = await prisma.task.count({
            where: {
              assignedToId: user.id,
              status: {
                statusName: TaskStatusEnum.IN_PROGRESS,
              },
            },
          });

          // Get completed tasks count
          const completedTasksCount = await prisma.task.count({
            where: {
              assignedToId: user.id,
              status: {
                statusName: TaskStatusEnum.COMPLETED,
              },
            },
          });

          // Get overdue tasks count
          const overdueTasksCount = await prisma.task.count({
            where: {
              assignedToId: user.id,
              status: {
                statusName: TaskStatusEnum.OVERDUE,
              },
            },
          });

          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            designation: user.designation,
            assignedTasksCount,
            inProgressTasksCount,
            completedTasksCount,
            overdueTasksCount,
          };
        })
      );

      // Apply the available/working filter after counts are calculated
      let filteredAgents = taskAgentsWithCounts;

      if (filterStatus === 'available') {
        filteredAgents = taskAgentsWithCounts.filter(
          agent => agent.assignedTasksCount === 0 && agent.inProgressTasksCount === 0
        );
      } else if (filterStatus === 'working') {
        filteredAgents = taskAgentsWithCounts.filter(
          agent => agent.assignedTasksCount > 0 || agent.inProgressTasksCount > 0
        );
      }

      return {
        taskAgents: filteredAgents,
        nextCursor: hasMore ? users[users.length - 1].id : null,
        hasMore,
        totalCount,
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching task agents');
      throw new Error('Failed to retrieve task agents');
    }
  }
  /**
   * Get task agent details by ID with task counts
   */
  async getTaskAgentById(id: string): Promise<TaskAgentWithCounts | null> {
    try {
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
        return null;
      }

      // Get assigned tasks count
      const assignedTasksCount = await prisma.task.count({
        where: {
          assignedToId: user.id,
          status: {
            statusName: TaskStatusEnum.NEW,
          },
        },
      });

      // Get in progress tasks count
      const inProgressTasksCount = await prisma.task.count({
        where: {
          assignedToId: user.id,
          status: {
            statusName: TaskStatusEnum.IN_PROGRESS,
          },
        },
      });

      // Get completed tasks count
      const completedTasksCount = await prisma.task.count({
        where: {
          assignedToId: user.id,
          status: {
            statusName: TaskStatusEnum.COMPLETED,
          },
        },
      });

      // Get overdue tasks count
      const overdueTasksCount = await prisma.task.count({
        where: {
          assignedToId: user.id,
          status: {
            statusName: TaskStatusEnum.OVERDUE,
          },
        },
      });

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        designation: user.designation,
        assignedTasksCount,
        inProgressTasksCount,
        completedTasksCount,
        overdueTasksCount,
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching task agent by ID');
      throw new Error(`Failed to retrieve task agent with ID: ${id}`);
    }
  }
}
