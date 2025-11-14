'use server';
import prisma from '@/db/db';
import logger from '@/utils/logger';
import { handleError } from '@/utils/errorHandler';
import {
  GetTaskByIdParamsSchema,
  GetTaskByIdResponse,
  GetTaskByIdResponseSchema,
} from '@/utils/validationSchemas';

export const getTaskById = async (taskId: string) => {
  try {
    // Validate the input parameters
    GetTaskByIdParamsSchema.parse({ taskId });

    // Fetch the task from the database, now including taskFiles and related files
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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
        timeForTask: true,
        overTime: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        associatedClient: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            avatarUrl: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        createdByClient: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            avatarUrl: true,
          },
        },
        taskSkills: {
          select: {
            skill: {
              select: { name: true },
            },
          },
        },
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        // Include taskFiles and file details
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
      },
    });
    if (!task) {
      return GetTaskByIdResponseSchema.parse({
        success: false,
        task: null,
        message: 'Task not found',
      });
    }
    // Prepare the response data
    const responseData = {
      success: true,
      task: {
        ...task,
        taskSkills: task.taskSkills.map(task => task.skill.name),
      },
    };

    // parse the decimal values to strings for frontend
    const accommodatedResponse = JSON.parse(
      JSON.stringify(GetTaskByIdResponseSchema.parse(responseData))
    );
    return accommodatedResponse;
  } catch (error) {
    logger.error({ error }, 'Error in getTaskById');
    return handleError(error, 'getTaskById') as GetTaskByIdResponse;
  }
};
