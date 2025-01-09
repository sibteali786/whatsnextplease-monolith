// app/actions/getTasksByPriority.ts
"use server";
import prisma from "@/db/db";
import { formatDate } from "@/utils/dateFormatter";
import { handleError } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import { TasksResponse, TasksResponseSchema } from "@/utils/validationSchemas";
import { TaskPriorityEnum } from "@prisma/client";

export const getTasksByPriority = async (
  priority: TaskPriorityEnum,
  limit: number = 3,
): Promise<TasksResponse> => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        priority: {
          priorityName: priority,
        },
      },
      take: limit,
      select: {
        id: true,
        description: true,
        title: true,
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
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        createdByClient: {
          select: {
            contactName: true,
            companyName: true,
          },
        },
        taskCategory: {
          select: {
            categoryName: true,
          },
        },
        dueDate: true,
      },
    });
    const response = {
      tasks: tasks.map((task) => {
        return {
          ...task,
          dueDate: formatDate(task.dueDate),
        };
      }),
      success: true,
    };
    return TasksResponseSchema.parse(response);
  } catch (error) {
    logger.error(error, "Error in getTasksByPriority");
    return handleError(error, "getTasksByPriorityId") as TasksResponse;
  }
};
