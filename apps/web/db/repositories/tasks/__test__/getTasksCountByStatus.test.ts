/*
 * @jest-environment node
 */
 
import { getTasksCountByStatus } from "../getTasksCountByStatus";
import { prismaMock } from "@/singleton";
import { Roles, TaskStatusEnum } from "@prisma/client";

describe("getTasksCountByStatus", () => {
  const mockGroupBy = prismaMock.task.groupBy as jest.Mock;
  const mockFindMany = prismaMock.taskStatus.findMany as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return task counts grouped by status as an object for Task Agent", async () => {
    const userId = "user-id-task-agent";
    const role = Roles.TASK_AGENT;

    // Mock data
    const mockTaskCounts = [
      { statusId: "status1", _count: { id: 5 } },
      { statusId: "status2", _count: { id: 3 } },
    ];
    const mockStatusNames = [
      { id: "status1", statusName: TaskStatusEnum.NEW },
      { id: "status2", statusName: TaskStatusEnum.IN_PROGRESS },
    ];

    // Mock behavior
    mockGroupBy.mockResolvedValue(mockTaskCounts);
    mockFindMany.mockResolvedValue(mockStatusNames);

    // Execute function
    const result = await getTasksCountByStatus(userId, role);

    // Expectations
    expect(result.success).toBe(true);
    expect(result.tasksWithStatus).toEqual({
      NEW: 5,
      IN_PROGRESS: 3,
    });
    expect(mockGroupBy).toHaveBeenCalledWith({
      by: ["statusId"],
      _count: { id: true },
      where: { assignedToId: userId },
    });
  });

  it("should return task counts grouped by status as an object for Client", async () => {
    const userId = "client-id";
    const role = Roles.CLIENT;

    // Mock data
    const mockTaskCounts = [
      { statusId: "status1", _count: { id: 8 } },
      { statusId: "status3", _count: { id: 4 } },
    ];
    const mockStatusNames = [
      { id: "status1", statusName: TaskStatusEnum.NEW },
      { id: "status3", statusName: TaskStatusEnum.COMPLETED },
    ];

    // Mock behavior
    mockGroupBy.mockResolvedValue(mockTaskCounts);
    mockFindMany.mockResolvedValue(mockStatusNames);

    // Execute function
    const result = await getTasksCountByStatus(userId, role);

    // Expectations
    expect(result.success).toBe(true);
    expect(result.tasksWithStatus).toEqual({
      NEW: 8,
      COMPLETED: 4,
    });
    expect(mockGroupBy).toHaveBeenCalledWith({
      by: ["statusId"],
      _count: { id: true },
      where: { createdByClientId: userId },
    });
  });

  it("should throw an error for invalid role", async () => {
    const userId = "user-id-invalid";
    const role = "Invalid Role";

    // Execute function
    const result = await getTasksCountByStatus(userId, role as Roles);

    // Expectations
    expect(result.success).toBe(false);
    expect(result.details.originalError).toBe(
      "Invalid role. Only Task Agent and Client are supported.",
    );
    expect(mockGroupBy).not.toHaveBeenCalled();
  });

  it("should return empty counts if no tasks exist for the given user and role", async () => {
    const userId = "user-id-task-agent";
    const role = Roles.TASK_AGENT;

    // Mock data
    const mockTaskCounts: any[] = [];
    const mockStatusNames = [
      { id: "status1", statusName: TaskStatusEnum.NEW },
      { id: "status2", statusName: TaskStatusEnum.IN_PROGRESS },
      { id: "status3", statusName: TaskStatusEnum.COMPLETED },
    ];

    // Mock behavior
    mockGroupBy.mockResolvedValue(mockTaskCounts);
    mockFindMany.mockResolvedValue(mockStatusNames);

    // Execute function
    const result = await getTasksCountByStatus(userId, role);

    // Expectations
    expect(result.success).toBe(true);
    expect(result.tasksWithStatus).toEqual({
      NEW: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    });
    expect(mockGroupBy).toHaveBeenCalledWith({
      by: ["statusId"],
      _count: { id: true },
      where: { assignedToId: userId },
    });
  });

  it("should handle database errors gracefully", async () => {
    const userId = "client-id";
    const role = Roles.CLIENT;
    const errorMessage = "Database error";

    // Mock behavior
    mockGroupBy.mockRejectedValue(new Error(errorMessage));

    // Execute function
    const result = await getTasksCountByStatus(userId, role);

    // Expectations
    expect(result.success).toBe(false);
    expect(result.details.originalError).toBe(errorMessage);
    expect(result.errorCode).toBe("INTERNAL_SERVER_ERROR");
  });
});
