"use server";
import prisma from "@/db/db";
import { TaskPriorityEnum } from "@prisma/client";
export const getTaskIdsByPriority = async (priority: TaskPriorityEnum) => {
  try {
    if (typeof priority !== "string" || priority.trim().length === 0) {
      return {
        message: "Invalid priority provided.",
        taskIds: null,
      };
    }
    const taskIds = await prisma.task.findMany({
      where: {
        priority: { priorityName: priority },
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
      },
    });
    return {
      taskIds: taskIds.map((task) => task.id),
      message: "successfully retrieved task IDs by priority",
    };
  } catch (e) {
    console.error(e);
    throw new Error("Failed to retrieve task IDs by priority");
  }
};
