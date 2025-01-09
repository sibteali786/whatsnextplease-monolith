"use client";
import { Roles } from "@prisma/client";
import { handleError } from "@/utils/errorHandler";
import { getAllUsersOutputSchema } from "@/utils/validationSchemas";
import { z } from "zod";

type GetUsersSchema = z.infer<typeof getAllUsersOutputSchema>;

export const usersList = async (role: Roles): Promise<GetUsersSchema> => {
  try {
    const response = await fetch(`/api/users/taskAgentList?role=${role}`);

    if (!response.ok) {
      const error = new Error("Failed to fetch users");
      return handleError(error, "usersList") as GetUsersSchema;
    }

    const jsonData = await response.json();

    const data = getAllUsersOutputSchema.parse(jsonData);

    return data;
  } catch (error) {
    return handleError(error, "usersList") as GetUsersSchema;
  }
};
