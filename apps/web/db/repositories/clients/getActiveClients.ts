// app/actions/getActiveClients.ts
"use server";
import prisma from "@/db/db";
import { handleError } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import {
  ActiveClientsResponse,
  ActiveClientsResponseSchema,
} from "@/utils/validationSchemas";
import { TaskStatusEnum } from "@prisma/client"; // Import the TaskStatusEnum
import { z } from "zod";

// Use the enum directly for task status filtering
const ACTIVE_TASK_STATUSES: TaskStatusEnum[] = [
  TaskStatusEnum.NEW,
  TaskStatusEnum.IN_PROGRESS,
  TaskStatusEnum.OVERDUE,
];
const GetActiveClientsParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(3),
});
export const getActiveClients = async (
  limit: number = 3,
): Promise<ActiveClientsResponse> => {
  try {
    GetActiveClientsParamsSchema.parse({ limit });
    // Fetch clients with active task count and contact details
    const clients = await prisma.client.findMany({
      where: {
        tasksCreated: {
          some: {
            status: {
              statusName: {
                in: ACTIVE_TASK_STATUSES,
              },
            },
          },
        },
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        tasksCreated: {
          where: {
            status: {
              statusName: {
                in: ACTIVE_TASK_STATUSES,
              },
            },
          },
          select: {
            id: true,
          },
        },
      },
      take: limit, // Limit the number of results
      orderBy: {
        createdAt: "desc",
      },
    });
    const clientsData = clients.map((client) => ({
      id: client.id,
      companyName: client.companyName,
      contactName: client.contactName || "N/A",
      activeTaskCount: client.tasksCreated.length,
    }));
    const responseData = {
      success: true,
      clients: clientsData,
    };
    // Validate the response data against the schema
    return ActiveClientsResponseSchema.parse(responseData);
  } catch (error) {
    logger.error({ error }, "Error in getActiveClients");
    return handleError(error, "getActiveClients") as ActiveClientsResponse;
  }
};
