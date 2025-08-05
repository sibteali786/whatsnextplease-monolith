import prisma from '../config/db';
import { Prisma, Roles, TaskStatusEnum } from '@prisma/client';
import { logger } from '../utils/logger';

export interface TaskAgentWithCounts {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
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
   * This optimized version reduces database queries by using aggregate
   */
  async getTaskAgents(
    cursor: string | null = null,
    pageSize: number = 10,
    filterStatus: 'all' | 'available' | 'working' = 'all',
    searchTerm: string = ''
  ): Promise<TaskAgentsResponse> {
    try {
      // Base query to get task agents
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

      // Get the total count
      const totalCount = await prisma.user.count({
        where: whereCondition,
      });

      // Get all user IDs first
      const userIds = await prisma.user.findMany({
        where: whereCondition,
        take: pageSize + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: {
          id: 'asc',
        },
        select: {
          id: true,
        },
      });

      // Check if there are more results
      const hasMore = userIds.length > pageSize;
      if (hasMore) {
        userIds.pop(); // Remove the extra item
      }

      // Get nextCursor
      const nextCursor = hasMore ? userIds[userIds.length - 1].id : null;

      // If no users found, return early
      if (userIds.length === 0) {
        return {
          taskAgents: [],
          nextCursor,
          hasMore,
          totalCount,
        };
      }

      // Get user details
      const userDetails = await prisma.user.findMany({
        where: {
          id: {
            in: userIds.map(u => u.id),
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
        },
      });

      // Get all task counts in one query using groupBy
      // For each status type, group by assignedToId and count
      const taskCountsByStatus = await prisma.$transaction([
        // Assigned tasks (NEW)
        prisma.task.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { in: userIds.map(u => u.id) },
            status: { statusName: TaskStatusEnum.NEW },
          },
          orderBy: {
            assignedToId: 'asc',
          },
          _count: { id: true },
        }),
        // In Progress tasks
        prisma.task.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { in: userIds.map(u => u.id) },
            status: { statusName: TaskStatusEnum.IN_PROGRESS },
          },
          orderBy: {
            assignedToId: 'asc',
          },
          _count: { id: true },
        }),
        // Completed tasks
        prisma.task.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { in: userIds.map(u => u.id) },
            status: { statusName: TaskStatusEnum.COMPLETED },
          },
          orderBy: {
            assignedToId: 'asc',
          },
          _count: { id: true },
        }),
        // Overdue tasks
        prisma.task.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { in: userIds.map(u => u.id) },
            status: { statusName: TaskStatusEnum.OVERDUE },
          },
          orderBy: {
            assignedToId: 'asc',
          },
          _count: { id: true },
        }),
        // Overdue tasks
        prisma.task.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { in: userIds.map(u => u.id) },
            status: { statusName: TaskStatusEnum.OVERDUE },
          },
          orderBy: {
            assignedToId: 'asc',
          },
          _count: { id: true },
        }),
      ]);

      // Convert group by results to a map for easier lookup
      const [newTasks, inProgressTasks, completedTasks, overdueTasks] = taskCountsByStatus;

      // Create lookup maps
      const newTasksMap = new Map(
        newTasks.map(item => [
          item.assignedToId,
          typeof item._count === 'object' ? (item._count.id ?? 0) : 0,
        ])
      );

      const inProgressTasksMap = new Map(
        inProgressTasks.map(item => [
          item.assignedToId,
          typeof item._count === 'object' ? (item._count.id ?? 0) : 0,
        ])
      );

      const completedTasksMap = new Map(
        completedTasks.map(item => [
          item.assignedToId,
          typeof item._count === 'object' ? (item._count.id ?? 0) : 0,
        ])
      );

      const overdueTasksMap = new Map(
        overdueTasks.map(item => [
          item.assignedToId,
          typeof item._count === 'object' ? (item._count.id ?? 0) : 0,
        ])
      );

      // Build the task agents with counts
      let taskAgentsWithCounts = userDetails.map(user => {
        const newTasksCount = newTasksMap.get(user.id) || 0;
        const inProgressTasksCount = inProgressTasksMap.get(user.id) || 0;
        const completedTasksCount = completedTasksMap.get(user.id) || 0;
        const overdueTasksCount = overdueTasksMap.get(user.id) || 0;

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          designation: user.designation,
          newTasksCount,
          inProgressTasksCount,
          completedTasksCount,
          overdueTasksCount,
        };
      });

      // Apply the available/working filter
      if (filterStatus === 'available') {
        taskAgentsWithCounts = taskAgentsWithCounts.filter(
          agent => agent.newTasksCount === 0 && agent.inProgressTasksCount === 0
        );
      } else if (filterStatus === 'working') {
        taskAgentsWithCounts = taskAgentsWithCounts.filter(
          agent => agent.newTasksCount > 0 || agent.inProgressTasksCount > 0
        );
      }

      return {
        taskAgents: taskAgentsWithCounts,
        nextCursor,
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
   * This optimized version reduces database queries by using countBy
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

      // Get all task counts in one transaction
      const taskCounts = await prisma.$transaction([
        // Assigned tasks (NEW)
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

        // Overdue tasks
        prisma.task.count({
          where: {
            assignedToId: id,
            status: { statusName: TaskStatusEnum.OVERDUE },
          },
        }),
      ]);

      const [newTasksCount, inProgressTasksCount, completedTasksCount, overdueTasksCount] =
        taskCounts;

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        designation: user.designation,
        newTasksCount,
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
