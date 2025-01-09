// app/actions/getActiveClientCount.ts

"use server";
import prisma from "@/db/db";
import logger from "@/utils/logger";
import { TaskStatusEnum } from "@prisma/client";
import { handleError } from "@/utils/errorHandler";
import {
  ActiveClientCountResponse,
  ActiveClientCountResponseSchema,
} from "@/utils/validationSchemas";
import { InvalidDataError } from "@/errors/invalidDataError";

// Define the Task Status Enum for reference
const ACTIVE_TASK_STATUSES: TaskStatusEnum[] = [
  TaskStatusEnum.NEW,
  TaskStatusEnum.IN_PROGRESS,
  TaskStatusEnum.OVERDUE,
];
// FIXME: utilize nextjs-sevrer-actions-parallel to run get actions in parallel using this library as server actions are not concurrent and cause performance impact in practical scnario
export const getActiveClientCount =
  async (): Promise<ActiveClientCountResponse> => {
    try {
      const activeClientCount = await prisma.client.count({
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
      });

      // Ensure activeClientCount is a number
      if (typeof activeClientCount !== "number" || activeClientCount < 0) {
        if (typeof activeClientCount !== "number" || activeClientCount < 0) {
          throw new InvalidDataError(
            "Invalid count value received from database.",
            {
              activeClientCount,
            },
          );
        }
      }

      logger.debug(
        { activeClientCount },
        "Retrieved active client count successfully.",
      );

      const responseData = {
        success: true,
        count: activeClientCount,
      };

      // Validate the response against the schema
      return ActiveClientCountResponseSchema.parse(responseData);
    } catch (error) {
      logger.error({ error }, "Error in getActiveClientCount");
      return handleError(
        error,
        "getActiveClientCount",
      ) as ActiveClientCountResponse;
    }
  };
