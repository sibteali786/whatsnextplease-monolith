/*
 * @jest-environment node
 */
import { prismaMock } from "@/singleton";
import { CreatorType } from "@prisma/client";
import { createDraftTask } from "../createDraftTask";
describe("createDraftTask", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  let taskStatusMock: jest.Mock;
  let taskPriorityMock: jest.Mock;
  let taskCategoryMock: jest.Mock;
  let taskMock: jest.Mock;
  const getInternalErrorMock = (errorMessage: string) => {
    return {
      success: false,
      errorCode: "INTERNAL_SERVER_ERROR",
      message: "An unexpected internal server error occurred.",
      details: {
        originalError: errorMessage,
      },
      statusCode: 500,
    };
  };
  beforeEach(() => {
    taskStatusMock = prismaMock.taskStatus.findFirst;
    taskPriorityMock = prismaMock.taskPriority.findFirst;
    taskCategoryMock = prismaMock.taskCategory.findFirst;
    taskMock = prismaMock.task.create;
  });

  it("should create a draft task successfully", async () => {
    // Arrange
    taskStatusMock.mockResolvedValueOnce({
      id: "status-id",
    });
    taskPriorityMock.mockResolvedValueOnce({
      id: "priority-id",
    });
    taskCategoryMock.mockResolvedValueOnce({
      id: "category-id",
    });
    taskMock.mockResolvedValueOnce({ id: "task-id" });

    // Act
    const result = await createDraftTask(CreatorType.CLIENT);

    // Assert
    expect(result).toEqual({
      success: true,
      task: { id: "task-id" },
    });
    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: {
        title: "",
        description: "",
        timeForTask: 0,
        statusId: "status-id",
        priorityId: "priority-id",
        taskCategoryId: "category-id",
        creatorType: CreatorType.CLIENT,
      },
      select: { id: true },
    });
  });

  it("should handle missing default status, priority, or category", async () => {
    // Arrange
    taskStatusMock.mockResolvedValueOnce(null);
    taskPriorityMock.mockResolvedValueOnce({
      id: "priority-id",
    });
    taskCategoryMock.mockResolvedValueOnce({
      id: "category-id",
    });
    const errorMessage = "Default value for Status is not defined.";
    // const error = new Error(errorMessage);
    taskMock.mockResolvedValue(new Error(errorMessage));

    // Act
    const result = await createDraftTask(CreatorType.CLIENT);
    // Assert
    expect(result).toEqual(getInternalErrorMock(errorMessage));
    expect(taskMock).not.toHaveBeenCalled();
  });

  it("should handle error during task creation", async () => {
    // Arrange
    taskStatusMock.mockResolvedValueOnce({ id: "status-id" });
    taskPriorityMock.mockResolvedValueOnce({
      id: "priority-id",
    });
    taskCategoryMock.mockResolvedValueOnce({
      id: "category-id",
    });
    const errorMessage = "Database error";
    taskMock.mockRejectedValueOnce(new Error(errorMessage));

    // Act
    const result = await createDraftTask(CreatorType.CLIENT);

    // Assert
    expect(result).toEqual(getInternalErrorMock(errorMessage));
  });
});
