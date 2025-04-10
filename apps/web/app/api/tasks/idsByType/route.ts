import { NextResponse } from "next/server";
import prisma from "@/db/db";
import logger from "@/utils/logger";
import { Roles } from "@prisma/client";
import { getDateFilter } from "@/utils/dateFilter";
import { getIdsByTypeInputSchema } from "@/utils/validationSchemas";

// The GET request handler for fetching task IDs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = getIdsByTypeInputSchema.parse({
      type: searchParams.get("type"),
      searchTerm: searchParams.get("searchTerm"),
      duration: searchParams.get("duration"),
      role: searchParams.get("role"),
    });

    const { type, searchTerm, duration, role } = parsedParams;

    if (role !== Roles.TASK_SUPERVISOR && role !== Roles.SUPER_USER) {
      return NextResponse.json(
        { success: false, message: "Unauthorized role" },
        { status: 403 },
      );
    }

    // Filters for tasks
    const whereCondition = {
      ...(type === "assigned" && { assignedToId: { not: null } }),
      ...(type === "unassigned" && { assignedToId: null }),
    };

    const dateFilter = getDateFilter(duration);

    // Fetch task IDs
    const taskIds = await prisma.task.findMany({
      where: {
        ...whereCondition,
        ...dateFilter,
        OR: searchTerm
          ? [
              { title: { contains: searchTerm, mode: "insensitive" } },
              { description: { contains: searchTerm, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
      },
    });

    // Extract IDs into a simple array
    const ids = taskIds.map((task) => task.id);

    const response = {
      success: true,
      taskIds: ids,
    };
    return NextResponse.json(response);
  } catch (error) {
    logger.error("Error fetching task IDs:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred while fetching task IDs" },
      { status: 500 },
    );
  }
}
