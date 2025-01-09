/*
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  UpdateTaskParamsSchema,
  UpdateTaskResponseSchema,
} from "@/utils/validationSchemas";
import { Prisma, TaskPriorityEnum, TaskStatusEnum } from "@prisma/client";
import { updateTaskById } from "../updateTaskbyId";
import { prismaMock } from "@/singleton";
import { randomUUID } from "crypto";
// In your test setup file or at the top of the test file
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));
describe("updateTask", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  let taskStatusMock: jest.Mock;
  let taskPriorityMock: jest.Mock;
  let taskCategoryMock: jest.Mock;
  let userMock: jest.Mock;
  let taskMock: jest.Mock;
  const statusName = TaskStatusEnum.NEW;
  const priorityName = TaskPriorityEnum.NORMAL;
  const taskCategoryName = "Data Entry";
  const taskId: string = randomUUID();
  const assignedToId: string = randomUUID();
  const dueDate = new Date();
  beforeEach(() => {
    taskStatusMock = prismaMock.taskStatus.findFirst;
    taskPriorityMock = prismaMock.taskPriority.findFirst;
    taskCategoryMock = prismaMock.taskCategory.findFirst;
    userMock = prismaMock.user.findFirst;
    taskMock = prismaMock.task.update;
  });
  const validParams = {
    id: taskId,
    title: "Updated Task Title",
    description: "Updated Description",
    statusName: statusName,
    priorityName: priorityName,
    taskCategoryName: taskCategoryName,
    dueDate: dueDate,
    timeForTask: "5.6",
    overTime: "2.3",
    assignedToId,
  };

  it("should update a task successfully", async () => {
    // Arrange
    taskStatusMock.mockResolvedValue({ statusName: statusName });
    taskPriorityMock.mockResolvedValue({ priorityName: priorityName });
    taskCategoryMock.mockResolvedValue({ categoryName: taskCategoryName });
    userMock.mockResolvedValue({ id: assignedToId });
    taskMock.mockResolvedValue({
      id: taskId,
      title: "Updated Task Title",
      description: "Updated Description",
      priority: { priorityName: priorityName },
      status: { statusName: statusName },
      taskCategory: { categoryName: taskCategoryName },
      dueDate: dueDate,
      timeForTask: new Prisma.Decimal("5.6"),
      overTime: new Prisma.Decimal("2.3"),
      assignedToId,
    });

    // Act
    const result = await updateTaskById(validParams);
    console.log(result);
    // Assert
    expect(result).toEqual(
      UpdateTaskResponseSchema.parse({
        success: true,
        task: {
          id: taskId,
          title: "Updated Task Title",
          description: "Updated Description",
          priorityName: priorityName,
          statusName: statusName,
          taskCategoryName: taskCategoryName,
          dueDate: dueDate,
          timeForTask: "5.6",
          overTime: "2.3",
          assignedToId,
        },
        message: "Task updated successfully.",
      }),
    );
  });

  it("should return an error if status, priority, or category ID is invalid", async () => {
    // Arrange
    taskStatusMock.mockResolvedValue(null);
    taskPriorityMock.mockResolvedValue(null);
    taskCategoryMock.mockResolvedValue(null);
    userMock.mockResolvedValue({ id: assignedToId });
    // Act
    const result = await updateTaskById(validParams);

    // Assert
    expect(result).toEqual(
      UpdateTaskResponseSchema.parse({
        success: false,
        task: null,
        message:
          "Invalid statusName, priorityName or taskCategoryName provided.",
      }),
    );
  });

  it("should handle validation errors", async () => {
    // Arrange
    const errorMessage = "Validation Error";
    jest.spyOn(UpdateTaskParamsSchema, "parse").mockImplementation(() => {
      throw new Error(errorMessage);
    });

    // Act
    const result = await updateTaskById({} as any);

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        details: {
          originalError: errorMessage,
        },
      }),
    );
  });

  it("should handle database errors gracefully", async () => {
    // Arrange
    const errorMessage = "Database error";
    const dbError = new Error(errorMessage);
    taskStatusMock.mockResolvedValue({ id: statusName });
    taskPriorityMock.mockResolvedValue({ id: priorityName });
    taskCategoryMock.mockResolvedValue({ id: taskCategoryName });
    userMock.mockResolvedValue({ id: assignedToId });
    taskMock.mockRejectedValueOnce(dbError);

    // Act
    const result = await updateTaskById(validParams);
    console.log(result);
    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        details: {
          originalError: errorMessage,
        },
      }),
    );
  });

  it("should handle missing task ID in update", async () => {
    // Arrange
    const invalidParams = { ...validParams, id: null };

    // Act
    const result = await updateTaskById(invalidParams as any);

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: "VALIDATION_ERROR",
      }),
    );
  });
});
