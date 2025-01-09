import { handleError } from "@/utils/errorHandler";
import prisma from "@/db/db";
import {
  SearchTasksResponse,
  SearchTasksResponseSchema,
  SearchTasksSchema,
} from "@/utils/validationSchemas";

// Function to search tasks
export const searchTasks = async (
  searchTerm: string,
): Promise<SearchTasksResponse> => {
  // TODO: decide if searching by description is needed or not
  try {
    // Validate input
    SearchTasksSchema.parse({ searchTerm });

    // Query the database for tasks matching the search term
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          //   { description: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: {
          select: { priorityName: true },
        },
        status: {
          select: { statusName: true },
        },
        taskCategory: {
          select: { categoryName: true },
        },
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Return response wrapped in Zod schema validation
    const validatedResponse = SearchTasksResponseSchema.parse({
      success: true,
      tasks,
    });

    return validatedResponse;
  } catch (error) {
    // Handle and return errors
    return handleError(error, "searchTasks") as SearchTasksResponse;
  }
};
