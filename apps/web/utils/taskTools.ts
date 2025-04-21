'use server';
import prisma from '@/db/db';
import { TaskPriorityEnum } from '@prisma/client';
import { getDateFilter } from '@/utils/dateFilter';
import { DurationEnum } from '@/types';

export const getTaskIdsByPriority = async (
  priority: TaskPriorityEnum,
  searchTerm: string = '',
  duration: DurationEnum = DurationEnum.ALL
) => {
  try {
    if (typeof priority !== 'string' || priority.trim().length === 0) {
      return {
        message: 'Invalid priority provided.',
        taskIds: null,
      };
    }

    // Get date filter based on duration
    const dateFilter = getDateFilter(duration);

    const taskIds = await prisma.task.findMany({
      where: {
        priority: { priorityName: priority },
        ...dateFilter,
        ...(searchTerm && {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
      },
    });

    return {
      taskIds: taskIds.map(task => task.id),
      message: 'Successfully retrieved task IDs by priority',
    };
  } catch (e) {
    console.error(e);
    throw new Error('Failed to retrieve task IDs by priority');
  }
};
