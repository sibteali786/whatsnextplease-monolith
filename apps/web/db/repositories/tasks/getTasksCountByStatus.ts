"use server";
import prisma from "@/db/db";
import logger from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";
import {
  GetTasksCountByStatusResponse,
  GetTasksCountByStatusResponseSchema,
} from "@/utils/validationSchemas";
import { Roles, TaskStatusEnum } from "@prisma/client";

export const getTasksCountByStatus = async (
  userId: string,
  role: Roles,
): Promise<GetTasksCountByStatusResponse> => {
  try {
    // Validate the role
    if (role !== Roles.TASK_AGENT && role !== Roles.CLIENT) {
      const error = new Error(
        "Invalid role. Only Task Agent and Client are supported.",
      );
      return handleError(
        error,
        "getTasksCountByStatus",
      ) as GetTasksCountByStatusResponse;
    }

    // Determine where condition based on role
    const whereCondition =
      role === Roles.TASK_AGENT
        ? { assignedToId: userId }
        : { createdByClientId: userId };

    // Fetch task counts grouped by their status
    const taskCounts = await prisma.task.groupBy({
      by: ["statusId"],
      _count: {
        id: true,
      },
      where: whereCondition,
    });

    // Fetch status names for better readability
    const statusNames = await prisma.taskStatus.findMany({
      select: {
        id: true,
        statusName: true,
      },
    });
    // Convert counts to an object with status names as keys
    const tasksWithStatus = statusNames.reduce(
      (acc, status) => {
        const count = taskCounts
          .filter((task) => task.statusId === status.id)
          .reduce((sum, task) => sum + task._count.id, 0);

        acc[status.statusName] = (acc[status.statusName] || 0) + count;
        return acc;
      },
      {} as Record<TaskStatusEnum, number>,
    );

    // Prepare the response
    const responseData = {
      success: true,
      tasksWithStatus,
    };

    // Validate the response data against schema
    return JSON.parse(
      JSON.stringify(GetTasksCountByStatusResponseSchema.parse(responseData)),
    );
  } catch (error) {
    logger.error({ error }, "Error in getTasksCountByStatus");
    return handleError(
      error,
      "getTasksCountByStatus",
    ) as GetTasksCountByStatusResponse;
  }
};
