"use server";
import prisma from "@/db/db";
import logger from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";
import {
  CreateDraftTask,
  TaskDraftResponseSchema,
} from "@/utils/validationSchemas";
import {
  CreatorType,
  Roles,
  TaskPriorityEnum,
  TaskStatusEnum,
} from "@prisma/client";

export const createDraftTask = async (
  creatorType: CreatorType,
  userId: string,
  role: Roles,
): Promise<CreateDraftTask> => {
  try {
    const [defaultStatus, defaultPriority, defaultCategory] = await Promise.all(
      [
        prisma.taskStatus.findFirst({
          where: { statusName: TaskStatusEnum.NEW },
          select: { id: true },
        }),
        prisma.taskPriority.findFirst({
          where: { priorityName: TaskPriorityEnum.LOW_PRIORITY },
          select: { id: true },
        }),
        prisma.taskCategory.findFirst({
          where: { categoryName: "Data Entry" },
          select: { id: true },
        }),
      ],
    );

    if (!defaultStatus) {
      const error = new Error("Default value for Status is not defined.");
      return handleError(error, "createDraftTask") as CreateDraftTask;
    }
    if (!defaultPriority) {
      const error = new Error("Default value for Priority is not defined.");
      return handleError(error, "createDraftTask") as CreateDraftTask;
    }
    if (!defaultCategory) {
      const error = new Error("Default value for Category are not defined.");
      return handleError(error, "createDraftTask") as CreateDraftTask;
    }

    let createdByUserId: string | undefined;
    let createdByClientId: string | undefined;

    if (creatorType === CreatorType.CLIENT) {
      // Assign the client ID as the creator
      createdByClientId = userId;
    } else if (creatorType === CreatorType.USER) {
      // Allowed roles for user creators
      // Allowed roles for user creators as enum values
      const allowedRoles: Roles[] = [
        Roles.SUPER_USER,
        Roles.TASK_SUPERVISOR,
        Roles.TASK_AGENT,
      ];

      // Now you can check:
      if (!allowedRoles.includes(role)) {
        const error = new Error(
          "User does not have permission to create tasks.",
        );
        return handleError(error, "createDraftTask") as CreateDraftTask;
      }
      createdByUserId = userId;
    } else {
      const error = new Error("Invalid creator type provided.");
      return handleError(error, "createDraftTask") as CreateDraftTask;
    }

    // Create the draft task
    const task = await prisma.task.create({
      data: {
        title: "",
        description: "",
        timeForTask: 0,
        statusId: defaultStatus.id,
        priorityId: defaultPriority.id,
        taskCategoryId: defaultCategory.id,
        creatorType,
        ...(createdByUserId && { createdByUserId }),
        ...(createdByClientId && { createdByClientId }),
      },
      select: {
        id: true,
      },
    });

    // Prepare the response data
    const responseData = {
      success: true,
      task,
    };

    // Validate response data against schema
    return JSON.parse(
      JSON.stringify(TaskDraftResponseSchema.parse(responseData)),
    );
  } catch (error) {
    logger.error({ error }, "Error in createDraftTask");
    return handleError(error, "createDraftTask") as CreateDraftTask;
  }
};
