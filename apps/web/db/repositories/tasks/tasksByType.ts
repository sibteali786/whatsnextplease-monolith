"use client";
import { DurationEnum } from "@/types";
import { handleError } from "@/utils/errorHandler";
import { getTasksOutputSchema } from "@/utils/validationSchemas";
import { Roles } from "@prisma/client";
import { z } from "zod";
type GetTaskSchema = z.infer<typeof getTasksOutputSchema>;
export const tasksByType = async (
  type: "all" | "assigned" | "unassigned",
  role: Roles,
  cursor: string | null,
  pageSize: number,
  searchTerm: string,
  duration: DurationEnum,
): Promise<GetTaskSchema> => {
  try {
    const response = await fetch(
      `/api/tasks/taskType?type=${type}&pageSize=${pageSize}&searchTerm=${searchTerm}&duration=${duration}&cursor=${cursor}&role=${role}`,
    );
    if (!response.ok) {
      const error = new Error("Failed to fetch tasks");
      return handleError(error, "tasksByType") as GetTaskSchema;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    return handleError(error, "tasksByType") as GetTaskSchema;
  }
};
