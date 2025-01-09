import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/db";
import logger from "@/utils/logger";
import { Roles } from "@prisma/client";
import { getDateFilter } from "@/utils/dateFilter";
import {
  getTasksInputSchema,
  getTasksOutputSchema,
} from "@/utils/validationSchemas";
import { z } from "zod";

type GetTaskOutput = z.infer<typeof getTasksOutputSchema>;
// The GET request handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = getTasksInputSchema.parse({
      type: searchParams.get("type"),
      cursor: searchParams.get("cursor"),
      pageSize: searchParams.get("pageSize"),
      searchTerm: searchParams.get("searchTerm"),
      duration: searchParams.get("duration"),
      role: searchParams.get("role"),
    });

    const { type, cursor, pageSize, searchTerm, duration, role } = parsedParams;
    if (role !== Roles.TASK_SUPERVISOR) {
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

    const normalizedCursor = cursor === "null" || cursor === "" ? null : cursor;
    const dateFilter = getDateFilter(duration);

    // Fetch tasks with filters
    const tasks = await prisma.task.findMany({
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
      take: pageSize + 1,
      ...(normalizedCursor && { cursor: { id: normalizedCursor }, skip: 1 }), // Fixed cursor
      orderBy: { id: "asc" },
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
        dueDate: true,
        timeForTask: true,
        overTime: true,
        taskSkills: {
          select: {
            skill: {
              select: { name: true },
            },
          },
        },
        ...(type !== "unassigned" && {
          assignedTo: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        }),
        taskFiles: {
          select: {
            file: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                fileSize: true,
                uploadedBy: true,
                uploadedAt: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
    // Check for next cursor
    const hasNextCursor = tasks.length > pageSize;
    const nextCursor = hasNextCursor ? tasks[pageSize]?.id : null;
    if (hasNextCursor) tasks.pop();

    const totalCount = await prisma.task.count({
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
    });

    // Format tasks
    const formattedTasks = tasks.map((task) => {
      const skills = task.taskSkills.map((task) => task.skill.name);
      return {
        ...task,
        assignedTo: task.assignedTo
          ? {
              firstName: task.assignedTo.firstName,
              lastName: task.assignedTo.lastName,
              avatarUrl: task.assignedTo.avatarUrl,
            }
          : null,
        taskSkills: skills,
      };
    });
    const response = {
      success: true,
      tasks: formattedTasks,
      hasNextCursor,
      nextCursor,
      totalCount,
    };
    // Validate response
    const validatedResponse: GetTaskOutput = JSON.parse(
      JSON.stringify(getTasksOutputSchema.parse(response)),
    );
    return NextResponse.json(validatedResponse);
  } catch (error) {
    logger.error(error, "Error fetching tasks:");
    return NextResponse.json(
      { success: false, message: "An error occurred while fetching tasks" },
      { status: 500 },
    );
  }
}
