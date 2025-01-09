"use server";
import prisma from "@/db/db";
import { handleError } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import {
  UpdateTaskParams,
  UpdateTaskParamsSchema,
  UpdateTaskResponse,
  UpdateTaskResponseSchema,
} from "@/utils/validationSchemas";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";

export const updateTaskById = async (
  params: UpdateTaskParams,
): Promise<UpdateTaskResponse> => {
  try {
    // Validate the input
    const validatedInput = UpdateTaskParamsSchema.parse(params);
    const {
      id,
      statusName,
      priorityName,
      taskCategoryName,
      assignedToId,
      skills,
      ...updateData
    } = validatedInput;
    // handle the timeForTask value to be converted to Decimal
    const modUpdatedData = {
      ...updateData,
      timeForTask: new Prisma.Decimal(params.timeForTask ?? 0),
      overTime: new Prisma.Decimal(params.overTime ?? 0),
    };
    // Find IDs for provided names (status, priority, category)
    const [status, priority, category] = await Promise.all([
      statusName
        ? prisma.taskStatus.findFirst({
            where: { statusName: statusName },
            select: { id: true },
          })
        : null,
      priorityName
        ? prisma.taskPriority.findFirst({
            where: { priorityName: priorityName },
            select: { id: true },
          })
        : null,
      taskCategoryName
        ? prisma.taskCategory.findFirst({
            where: { categoryName: taskCategoryName },
            select: { id: true },
          })
        : null,
    ]);
    // Validate assignedToId
    let assignee = null;
    if (assignedToId) {
      if (typeof assignedToId !== "string") {
        return {
          success: false,
          task: null,
          message: "Invalid assignedToId format provided.",
        };
      }

      assignee = await prisma.user.findFirst({
        where: { id: assignedToId },
        select: { id: true },
      });

      if (!assignee) {
        return {
          success: false,
          task: null,
          message: "Assigned user not found in database.",
        };
      }
    }
    // Ensure all IDs are resolved
    if (!status || !priority || !category) {
      const response = {
        success: false,
        task: null,
        message:
          "Invalid statusName, priorityName or taskCategoryName provided.",
      };

      return UpdateTaskResponseSchema.parse(response);
    }

    // If skills are provided, validate them and find their IDs
    let skillIds: string[] = [];
    if (skills && skills.length > 0) {
      const foundSkills = await prisma.skill.findMany({
        where: {
          name: { in: skills },
        },
        select: { id: true, name: true },
      });

      // Check if all requested skills were found
      const foundSkillNames = foundSkills.map((s) => s.name);
      const missingSkills = skills.filter(
        (skill) => !foundSkillNames.includes(skill),
      );
      if (missingSkills.length > 0) {
        const response = {
          success: false,
          task: null,
          message: `Invalid skill names provided: ${missingSkills.join(", ")}`,
        };
        return UpdateTaskResponseSchema.parse(response);
      }

      skillIds = foundSkills.map((s) => s.id);
    }
    // TODO: Check if current task title already exists in the database and return error if it does
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...modUpdatedData,
        assignedToId: assignee ? assignee.id : null, // if no id then keep it null
        statusId: status.id,
        priorityId: priority.id,
        taskCategoryId: category.id,
      },
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
        priorityId: true,
        statusId: true,
        taskCategoryId: true,
        dueDate: true,
        timeForTask: true,
        overTime: true,
      },
    });

    // Update task skills if provided
    if (skills && skills.length > 0) {
      // Remove existing taskSkill entries
      await prisma.taskSkill.deleteMany({ where: { taskId: id } });

      // Insert new taskSkill entries
      const taskSkillData = skillIds.map((skillId) => ({
        taskId: id,
        skillId: skillId,
      }));
      await prisma.taskSkill.createMany({ data: taskSkillData });
    }
    revalidateTag("tasks:userId");

    // Return the response
    const responseData = {
      success: true,
      task: updatedTask,
      message: "Task updated successfully.",
    };
    // make sure timeForTask is string when sent back
    const responseDataMod = {
      ...responseData,
      task: {
        ...responseData.task,
        timeForTask: responseData.task.timeForTask.toString(),
        overTime: responseData.task?.overTime
          ? responseData.task?.overTime.toString()
          : "0",
        statusName: responseData.task.status.statusName,
        priorityName: responseData.task.priority.priorityName,
        taskCategoryName: responseData.task.taskCategory.categoryName,
      },
    };
	logger.info({ updatedTask }, "Task updated successfully");
    return UpdateTaskResponseSchema.parse(responseDataMod);
  } catch (error) {
    logger.error({ error }, "Error in updateTask");
    return handleError(error, "updateTask") as UpdateTaskResponse;
  }
};
