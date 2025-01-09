/*
 * @jest-environment node
 */
import { prismaMock } from "@/singleton";
import { deleteTaskById } from "../deleteTaskById";
import { randomUUID } from "crypto";

describe("deleteTaskById", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  let taskDeleteMock: jest.Mock;

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
    taskDeleteMock = prismaMock.task.delete;
  });

  it("should delete a task successfully", async () => {
    // Arrange
    const randomId = randomUUID();
    taskDeleteMock.mockResolvedValueOnce({
      id: randomId,
    });

    // Act
    const result = await deleteTaskById(randomId);
    console.log(result, "RESULT");
    // Assert
    expect(result).toEqual(expect.objectContaining({ task: { id: randomId } }));
    expect(taskDeleteMock).toHaveBeenCalledWith({
      where: { id: randomId },
      select: { id: true },
    });
  });

  it("should handle non-existing task", async () => {
    // Arrange
    const errorMessage = "The given task with id does not exist in database";
    taskDeleteMock.mockRejectedValue(new Error(errorMessage));

    // Act
    const result = await deleteTaskById("non-existing-task-id");

    // Assert
    expect(result).toEqual(getInternalErrorMock(errorMessage));
    expect(prismaMock.task.delete).toHaveBeenCalledWith({
      where: { id: "non-existing-task-id" },
      select: { id: true },
    });
  });

  it("should handle error during task deletion", async () => {
    // Arrange
    const errorMessage = "Database error";
    taskDeleteMock.mockRejectedValueOnce(new Error(errorMessage));

    // Act
    const result = await deleteTaskById("task-id");

    // Assert
    expect(result).toEqual(getInternalErrorMock(errorMessage));
  });
});
