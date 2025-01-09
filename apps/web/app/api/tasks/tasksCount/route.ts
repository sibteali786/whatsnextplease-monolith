import { NextResponse } from "next/server";
import prisma from "@/db/db";
import logger from "@/utils/logger";
import {
  getTasksCountInputSchema,
  getTasksCountOutputSchema,
} from "@/utils/validationSchemas";

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // Validate input parameters
    getTasksCountInputSchema.parse({ role });

    // Fetch Unassigned and Assigned Task Counts
    const [unassignedCount, assignedCount] = await Promise.all([
      prisma.task.count({
        where: { assignedToId: null }, // Unassigned tasks
      }),
      prisma.task.count({
        where: { NOT: { assignedToId: null } }, // Assigned tasks
      }),
    ]);

    // Format the response
    const response = {
      success: true,
      taskCounts: {
        UnassignedTasks: unassignedCount,
        AssignedTasks: assignedCount,
      },
    };

    // Validate response data with Zod
    const validatedResponse = getTasksCountOutputSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    logger.error({ error }, "Error in GET /tasks/count");
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while fetching task counts.",
      },
      { status: 500 },
    );
  }
}
