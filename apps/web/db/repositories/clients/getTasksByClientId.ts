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

export const getTasksByClientId = async (
  clientId: string,
  cursor: string | null,
  pageSize: number = 10
): Promise<GetTasksByClientIdResponse> => {
  try {
    // Validate input parameters
    InputParamsSchema.parse({ clientId, cursor, pageSize });

    // Fetch tasks from the database
    const tasks = await prisma.task.findMany({
      where: { createdByClientId: clientId },
      take: pageSize + 1, // Fetch one extra record to determine if there's a next page
      ...(cursor && { cursor: { id: cursor }, skip: 1 }), // Skip the cursor itself if provided
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
      where: { createdByClientId: clientId },
    });
    // manipulate taskSkills shape into array of strings
    const tasksMod = tasks.map(task => {
      const taskSkills = task.taskSkills.map(skill => skill.skill.name);
      return {
        ...task,
        taskSkills: taskSkills,
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
