import { NextResponse } from "next/server";
import prisma from "@/db/db";
import {
  getUnassignedTasksInputSchema,
  getUnassignedTasksOutputSchema,
} from "@/utils/validationSchemas";
// Input Schema for Query Parameters

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    // Validate input query parameters
    const queryParams = getUnassignedTasksInputSchema.parse({
      pageSize: searchParams.get("pageSize"),
      cursor: searchParams.get("cursor"),
    });

    const { pageSize = 10, cursor } = queryParams;

    // Fetch unassigned tasks
    const tasks = await prisma.task.findMany({
      where: { assignedToId: null },
      take: pageSize + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      // TODO: add orderBy with dueDate so that tasks are most recent ones only
      select: {
        id: true,
        title: true,
        description: true,
        priority: { select: { priorityName: true } },
        status: { select: { statusName: true } },
        assignedTo: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
        taskCategory: {
          select: {
            categoryName: true,
          },
        },
        dueDate: true,
        taskSkills: {
          select: {
            skill: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const hasNextCursor = tasks.length > pageSize;
    const nextCursor = hasNextCursor ? tasks[pageSize]?.id : null;

    if (hasNextCursor) tasks.pop();

    const totalCount = await prisma.task.count({
      where: { assignedToId: null },
    });
    // reformat
    const formattedTasks = tasks.map((task) => {
      const skills = task.taskSkills.map((ts) => ts.skill.name);
      return {
        ...task,
        taskSkills: skills,
      };
    });
    const responseData = {
      success: true,
      tasks: formattedTasks,
      hasNextCursor,
      nextCursor,
      totalCount,
    };

    // Validate output response
    const validatedResponse =
      getUnassignedTasksOutputSchema.parse(responseData);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error("Error fetching unassigned tasks:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred while fetching tasks." },
      { status: 500 },
    );
  }
}
