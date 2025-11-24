// app/actions/getTasksByClientId.ts

'use server';
import prisma from '@/db/db';
import 'server-only';
import logger from '@/utils/logger';
import { handleError } from '@/utils/errorHandler';
import {
  GetTasksByClientIdResponse,
  GetTasksByClientIdResponseSchema,
  InputParamsSchema,
} from '@/utils/validationSchemas';
import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { DurationEnum } from '@/types';
import { getUserProfileTaskFilter } from '@/utils/commonUtils/taskPermissions';
import { getDateFilter } from '@/utils/dateFilter';

export const getTasksByClientId = async (
  type: 'all' | 'assigned' | 'unassigned' | 'my-tasks',
  searchTerm = '',
  duration: DurationEnum = DurationEnum.ALL,
  clientId: string,
  cursor: string | null,
  pageSize: number = 10,
  status?: TaskStatusEnum | TaskStatusEnum[],
  priority?: TaskPriorityEnum | TaskPriorityEnum[]
): Promise<GetTasksByClientIdResponse> => {
  try {
    // Validate input parameters
    InputParamsSchema.parse({ clientId, cursor, pageSize });

    // Get the appropriate filter condition based on role
    const whereCondition = getUserProfileTaskFilter(clientId, Roles.CLIENT);
    const dateFilter = getDateFilter(duration);
    // Optional filters for status & priority
    const statusFilter =
      status && Array.isArray(status) && status.length > 0
        ? {
            status: {
              is: {
                statusName: {
                  in: status,
                },
              },
            },
          }
        : {};

    const priorityFilter =
      priority && Array.isArray(priority) && priority.length > 0
        ? {
            priority: {
              is: {
                priorityName: {
                  in: priority,
                },
              },
            },
          }
        : {};

    const assignedToId =
      type === 'assigned' ? { not: null } : type === 'unassigned' ? null : undefined;

    const searchFilter = searchTerm
      ? {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }
      : undefined;

    // start with the role-based/user filter + other filters

    const AND: any[] = [];

    // A. Visibility filter (createdByClientId OR associatedClientId)
    if (whereCondition?.OR) {
      AND.push({ OR: whereCondition.OR });
    }

    // B. Date filter
    if (Object.keys(dateFilter).length > 0) {
      AND.push(dateFilter);
    }

    // C. Status filter
    if (Object.keys(statusFilter).length > 0) {
      AND.push(statusFilter);
    }

    // D. Priority filter
    if (Object.keys(priorityFilter).length > 0) {
      AND.push(priorityFilter);
    }

    // E. Assigned/unassigned filter
    if (assignedToId !== undefined) {
      AND.push({ assignedToId });
    }

    // F. Search OR conditions
    if (searchFilter?.OR) {
      AND.push({ OR: searchFilter.OR });
    }

    // Final WHERE object
    const where = { AND };
    // Fetch tasks from the database
    const tasks = await prisma.task.findMany({
      where,
      take: pageSize + 1, // Fetch one extra record to determine if there's a next page
      ...(cursor && { cursor: { id: cursor }, skip: 1 }), // Skip the cursor itself if provided
      orderBy: { id: 'asc' },

      select: {
        id: true,
        title: true,
        description: true,
        priority: {
          select: {
            priorityName: true,
          },
        },
        status: {
          select: {
            statusName: true,
          },
        },
        taskCategory: {
          select: {
            categoryName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        associatedClient: {
          select: { id: true, companyName: true, contactName: true, avatarUrl: true },
        },
        taskSkills: {
          select: {
            skill: {
              select: {
                name: true,
              },
            },
          },
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
        timeForTask: true,
        overTime: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasNextCursor = tasks.length > pageSize;
    const nextCursor = hasNextCursor ? tasks[pageSize]?.id : null;

    if (hasNextCursor) {
      tasks.pop(); // Remove the extra record if it exists
    }

    const totalCount = await prisma.task.count({
      where,
    });
    // manipulate taskSkills shape into array of strings
    const tasksMod = tasks.map(task => {
      const skills = task.taskSkills.map(skill => skill.skill.name);
      return {
        ...task,
        taskSkills: skills,
      };
    });
    const responseData = {
      success: true,
      tasks: tasksMod,
      hasNextCursor,
      nextCursor,
      totalCount,
    };
    // parse the decimal values to strings for frontend
    const accommodatedResponse = JSON.parse(
      JSON.stringify(GetTasksByClientIdResponseSchema.parse(responseData))
    );
    // Validate response data against schema

    return accommodatedResponse;
  } catch (error) {
    logger.error({ error }, 'Error in getTasksByClientId');
    return handleError(error, 'getTasksByClientId') as GetTasksByClientIdResponse;
  }
};
