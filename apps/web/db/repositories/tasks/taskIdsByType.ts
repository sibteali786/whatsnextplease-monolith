"use client";
import { DurationEnum } from "@/types";
import { handleError } from "@/utils/errorHandler";
import { getTaskIdsByTypeOutput } from "@/utils/validationSchemas";
import { Roles } from "@prisma/client";
import { z } from "zod";

type GetTaskIdsSchema = z.infer<typeof getTaskIdsByTypeOutput>;
export const taskIdsByType = async (
  type: "all" | "assigned" | "unassigned",
  role: Roles,
  searchTerm: string,
  duration: DurationEnum,
): Promise<GetTaskIdsSchema> => {
  try {
    const response = await fetch(
      `/api/tasks/idsByType?type=${type}&searchTerm=${searchTerm}&duration=${duration}&&role=${role}`,
    );
    if (!response.ok) {
      const error = new Error("Failed to fetch tasks");
      return handleError(error, "tasksByType") as GetTaskIdsSchema;
    }
    const jsonData = await response.json();

    const data = getTaskIdsByTypeOutput.parse(jsonData);
    return data;
  } catch (error) {
    return handleError(error, "tasksByType") as GetTaskIdsSchema;
  }
};
