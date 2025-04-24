'use server';
import prisma from '@/db/db';
import logger from '@/utils/logger';
import { Roles } from '@prisma/client';
import { getDateFilter } from '@/utils/dateFilter';
import { DurationEnum } from '@/types';
import { TaskByUserIdResponse, TaskByUserIdSchema } from '@/utils/validationSchemas';

export const getTasksByUserId = async (
  userId: string,
  role: Roles,
  cursor: string | null,
  pageSize = 10,
  searchTerm = '',
  duration: DurationEnum = DurationEnum.ALL
): Promise<TaskByUserIdResponse> => {
  try {
    if (role !== Roles.TASK_AGENT && role !== Roles.TASK_SUPERVISOR && role !== Roles.CLIENT) {
      return {
        success: false,
        tasks: [],
        nextCursor: null,
        hasNextCursor: false,
        message: 'Invalid role. Only Task Agent and Client are supported.',
        totalCount: 0,
      };
    }

    const whereCondition =
      role === Roles.TASK_AGENT || role === Roles.TASK_SUPERVISOR
        ? { assignedToId: userId }
        : { createdByClientId: userId };

    const dateFilter = getDateFilter(duration);
    const tasks = await prisma.task.findMany({
      where: {
        ...whereCondition,
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
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        priority: {
          select: { priorityName: true },
        },
        status: {
          select: { statusName: true },
        },
        taskCategory: {
          select: { categoryName: true },
        },
        assignedTo: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
        dueDate: true,
        timeForTask: true,
        overTime: true,
        taskSkills: {
          select: {
            skill: {
              select: { name: true },
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
        createdAt: true,
        updatedAt: true,
      },
    });
    const hasNextCursor = tasks.length > pageSize;
    const nextCursor = hasNextCursor ? tasks[pageSize]?.id : null;
    if (hasNextCursor) {
      tasks.pop();
    }

    const totalCount = await prisma.task.count({
      where: {
        ...whereCondition,
        ...dateFilter,
        OR: searchTerm
          ? [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ]
          : undefined,
      },
    });
    // Format tasks to match the shape needed by update:
    const formattedTasks = tasks.map(task => {
      const skills = task.taskSkills.map(ts => ts.skill.name);
      return {
        ...task,
        taskSkills: skills,
      };
    });
    const response = {
      success: true,
      tasks: formattedTasks,
      hasNextCursor,
      nextCursor,
      totalCount,
    };
    const parsedResponse = JSON.parse(JSON.stringify(TaskByUserIdSchema.parse(response)));
    return parsedResponse;
  } catch (error) {
    logger.error({ error }, 'Error in getTasksByUserId');
    throw new Error('Failed to retrieve tasks for the given user');
  }
};
