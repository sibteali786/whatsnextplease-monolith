"use server";
import prisma from "@/db/db";
import logger from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";
import {
  DeleteTask,
  DeleteTaskInputSchema,
  DeleteTaskResponseSchema,
} from "@/utils/validationSchemas";

export const deleteTaskById = async (taskId: string) => {
  try {
    // making sure id is in correct format
    DeleteTaskInputSchema.parse({ taskId });
    // delete task from the database
    const task = await prisma.task.delete({
      where: { id: taskId },
      select: { id: true },
    });

    // Prepare the response data
    const responseData = {
      success: true,
      task,
      message: `Task with ID:${task.id} is deleted successfully`,
    };

    // Validate response data against schema
    return DeleteTaskResponseSchema.parse(responseData);
  } catch (error) {
    logger.error({ error }, "Error in getTaskById");
    return handleError(error, "getTaskById") as DeleteTask;
  }
};
