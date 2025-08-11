'use server';
import prisma from '@/db/db';
import logger from '@/utils/logger';
import { Roles } from '@prisma/client';
import { getDateFilter } from '@/utils/dateFilter';
import { DurationEnum } from '@/types';
import { TaskByUserIdResponse, TaskByUserIdSchema } from '@/utils/validationSchemas';
import {
  canViewTasks,
  getGeneralTaskFilter,
  getUserProfileTaskFilter,
  USER_CREATED_TASKS_CONTEXT,
} from '@/utils/commonUtils/taskPermissions';

export const getTasksByUserId = async (
  userId: string,
  role: Roles,
  cursor: string | null,
  pageSize = 10,
  searchTerm = '',
  duration: DurationEnum = DurationEnum.ALL,
  context: USER_CREATED_TASKS_CONTEXT = USER_CREATED_TASKS_CONTEXT.GENERAL
): Promise<TaskByUserIdResponse> => {
  try {
    // Check if the role has permission to view tasks
    if (!canViewTasks(role)) {
      return {
        success: false,
        tasks: [],
        nextCursor: null,
        hasNextCursor: false,
        message: `Role ${role} is not authorized to view tasks.`,
        totalCount: 0,
      };
    }

    // Get the appropriate filter condition based on role
    const whereCondition =
      context === USER_CREATED_TASKS_CONTEXT.USER_PROFILE
        ? getUserProfileTaskFilter(userId)
        : getGeneralTaskFilter(userId, role);
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
        createdByUserId: true,
        createdByClientId: true,
        assignedToId: true,
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
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
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
