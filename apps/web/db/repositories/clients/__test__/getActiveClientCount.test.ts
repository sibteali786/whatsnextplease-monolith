/*
 * @jest-environment node
 */
import { prismaMock } from "@/singleton";
import { TaskStatusEnum } from "@prisma/client";
import { getActiveClientCount } from "../getActiveClientCount";
import { ActiveClientCountResponseSchema } from "@/utils/validationSchemas";
import { internalServerErrorMessage } from "@/errors/internalServerError";

describe("getActiveClientCount", () => {
  const mockCount = prismaMock.client.count as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the active client count when there are active tasks", async () => {
    // Arrange
    mockCount.mockResolvedValue(5);

    // Act
    const result = await getActiveClientCount();

    // Assert
    // Validate the response against the schema
    const parsedResult = ActiveClientCountResponseSchema.parse(result);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.count).toEqual(5);
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        tasksCreated: {
          some: {
            status: {
              statusName: {
                in: [
                  TaskStatusEnum.NEW,
                  TaskStatusEnum.IN_PROGRESS,
                  TaskStatusEnum.OVERDUE,
                ],
              },
            },
          },
        },
      },
    });
  });

  it("should return zero when there are no active tasks", async () => {
    // Arrange
    mockCount.mockResolvedValue(0);

    // Act
    const result = await getActiveClientCount();

    // Assert
    const parsedResult = ActiveClientCountResponseSchema.parse(result);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.count).toEqual(0);
  });

  it("should handle invalid count values from the database", async () => {
    // Arrange
    mockCount.mockResolvedValue(null);

    // Act
    const result = await getActiveClientCount();
    // Assert
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INVALID_DATA");
    expect(result.message).toBe("Invalid count value received from database.");
    expect(result.details).toEqual({ activeClientCount: null });
  });

  it("should return an error when the database query fails", async () => {
    // Arrange
    const errorMessage = "Database error";
    mockCount.mockRejectedValue(new Error(errorMessage));

    // Act
    const result = await getActiveClientCount();

    // Assert
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe(internalServerErrorMessage);
    expect(result.details).toBeDefined();
  });
});
