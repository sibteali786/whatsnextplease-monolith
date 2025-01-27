/*
 * @jest-environment node
 */
 
// getTasksByClientId.test.ts
import { prismaMock } from "@/singleton";
import { getTasksByClientId } from "../getTasksByClientId";
import { mockClientId } from "@/mocks/clientMocks";
import { GetTasksByClientIdResponseSchema } from "@/utils/validationSchemas";
import { internalServerErrorMessage } from "@/errors/internalServerError";
import { Prisma, TaskPriorityEnum, TaskStatusEnum } from "@prisma/client";
import { faker } from "@faker-js/faker";

describe("getTasksByClientId", () => {
  const mockFindMany = prismaMock.task.findMany as jest.Mock;
  const mockCount = prismaMock.task.count as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock tasks
  const createMockTasks = (count: number) => {
    return Array.from({ length: count }, (_, index) => {
      return {
        id: `task${index + 1}`,
        title: faker.hacker.verb() + " " + faker.hacker.noun(),
        priority: { priorityName: TaskPriorityEnum.URGENT },
        description: faker.hacker.phrase(),
        status: { statusName: TaskStatusEnum.NEW },
        taskCategory: { categoryName: "Development" },
        taskSkills: [{ skill: { name: "a" } }, { skill: { name: "b" } }],
        assignedTo: {
          firstName: "John",
          lastName: "Doe",
          avatarUrl: "avatar.jpg",
        },
        timeForTask: new Prisma.Decimal("5.97"),
        overTime: new Prisma.Decimal("2.97"),
        dueDate: new Date("2023-01-01"),
        createdAt: new Date("2022-12-01"),
        updatedAt: new Date("2022-12-05"),
      };
    });
  };

  describe("Validation Errors", () => {
    const invalidIds = [null, undefined, "", 123, {}, [], true];
    const invalidPageSizes = [0, -1, NaN, null];
    const invalidCursors = [123, {}, [], true];

    it.each(invalidIds)(
      "should return a validation error when clientId is invalid: %s",
      async (invalidClientId) => {
        const result = await getTasksByClientId(
          invalidClientId as any,
          null,
          10,
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("VALIDATION_ERROR");
        expect(result.message).toBe("Validation failed.");
        expect(result.details).toBeDefined();
      },
    );

    it.each(invalidPageSizes)(
      "should return a validation error when pageSize is invalid: %s",
      async (invalidPageSize) => {
        const result = await getTasksByClientId(
          mockClientId,
          null,
          invalidPageSize as any,
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("VALIDATION_ERROR");
        expect(result.message).toBe("Validation failed.");
        expect(result.details).toBeDefined();
      },
    );

    it.each(invalidCursors)(
      "should return a validation error when cursor is invalid: %s",
      async (invalidCursor) => {
        const result = await getTasksByClientId(
          mockClientId,
          invalidCursor as any,
          10,
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("VALIDATION_ERROR");
        expect(result.message).toBe("Validation failed.");
        expect(result.details).toBeDefined();
      },
    );
  });

  describe("Successful Retrieval", () => {
    it("should return empty tasks array when clientId is valid but has no tasks", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const result = await getTasksByClientId(mockClientId, null, 10);

      // Validate the response against the schema
      const parsedResult = GetTasksByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.tasks).toHaveLength(0);
      expect(parsedResult.hasNextCursor).toBe(false);
      expect(parsedResult.nextCursor).toBeNull();
      expect(parsedResult.totalCount).toBe(0);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { createdByClientId: mockClientId },
        take: 11,
        select: expect.any(Object),
      });
      expect(mockCount).toHaveBeenCalledWith({
        where: { createdByClientId: mockClientId },
      });
    });

    it("should return tasks when clientId is valid and has tasks less than pageSize", async () => {
      const mockTasks = createMockTasks(5);

      mockFindMany.mockResolvedValue(mockTasks);
      mockCount.mockResolvedValue(5);

      const result = await getTasksByClientId(mockClientId, null, 10);

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(5);
      expect(result.hasNextCursor).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.totalCount).toBe(5);
    });
  });

  describe("Pagination Logic", () => {
    it("should handle pagination correctly when there are more tasks than pageSize", async () => {
      const pageSize = 2;
      const mockTasks = createMockTasks(3); // 3 tasks

      mockFindMany.mockResolvedValue([...mockTasks]);
      mockCount.mockResolvedValue(3);

      const parsedResult = await getTasksByClientId(
        mockClientId,
        null,
        pageSize,
      );

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.tasks).toHaveLength(2);
      expect(parsedResult.hasNextCursor).toBe(true);
      expect(parsedResult.nextCursor).toBe("task3");
      expect(parsedResult.totalCount).toBe(3);
    });

    it("should handle pagination correctly when a cursor is provided", async () => {
      const pageSize = 2;
      const cursor = "task1";
      const mockTasks = createMockTasks(4).slice(1); // tasks after 'task1'

      mockFindMany.mockResolvedValue([...mockTasks]);
      mockCount.mockResolvedValue(4);

      const parsedResult = await getTasksByClientId(
        mockClientId,
        cursor,
        pageSize,
      );

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.tasks).toHaveLength(2);
      expect(parsedResult.hasNextCursor).toBe(true);
      expect(parsedResult.nextCursor).toBe("task4");
      expect(parsedResult.totalCount).toBe(4);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const errorMessage = "Database error";

      mockFindMany.mockRejectedValue(new Error(errorMessage));

      const result = await getTasksByClientId(mockClientId, null, 10);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INTERNAL_SERVER_ERROR");
      expect(result.message).toBe(internalServerErrorMessage);
      expect(result.details).toBeDefined();
      expect(mockCount).not.toHaveBeenCalled();
    });
  });
});
