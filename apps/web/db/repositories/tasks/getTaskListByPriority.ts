'use server';
import { TaskPriorityEnum } from '@prisma/client';
import prisma from '@/db/db';
import {
  GetTasksByClientIdResponse,
  GetTasksByClientIdResponseSchema,
} from '@/utils/validationSchemas';
import { z } from 'zod';
import logger from '@/utils/logger';
import { handleError } from '@/utils/errorHandler';
import { DurationEnum } from '@/types';
import { getDateFilter } from '@/utils/dateFilter';

const GetTasksListByPriorityInputSchema = z.object({
  priority: z.nativeEnum(TaskPriorityEnum),
  cursor: z.string().nullable(),
  pageSize: z.number().int().positive().default(10),
});

export const getTasksListByPriority = async (
  priority: TaskPriorityEnum,
  cursor: string | null,
  pageSize: number = 10,
  searchTerm = '',
  duration: DurationEnum = DurationEnum.ALL
): Promise<GetTasksByClientIdResponse> => {
  try {
    // Validate input
    GetTasksListByPriorityInputSchema.parse({ priority, cursor, pageSize });

    // Get date filter based on duration
    const dateFilter = getDateFilter(duration);

    const tasks = await prisma.task.findMany({
      where: {
        priority: { priorityName: priority },
        ...dateFilter,
        OR: searchTerm
          ? [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ]
          : undefined,
      },
      take: pageSize + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
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
      tasks.pop();
    }

    // Count should also respect search and duration filters
    const totalCount = await prisma.task.count({
      where: {
        priority: { priorityName: priority },
        ...dateFilter,
        OR: searchTerm
          ? [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ]
          : undefined,
      },
    });

    const tasksMod = tasks.map(task => ({
      ...task,
      taskSkills: task.taskSkills.map(skill => skill.skill.name),
    }));

    const responseData = {
      success: true,
      tasks: tasksMod,
      hasNextCursor,
      nextCursor,
      totalCount,
    };
    return JSON.parse(JSON.stringify(GetTasksByClientIdResponseSchema.parse(responseData)));
  } catch (error) {
    logger.error({ error }, 'Error in getTasksListByPriority');
    return handleError(error, 'getTasksListByPriority');
  }
};
