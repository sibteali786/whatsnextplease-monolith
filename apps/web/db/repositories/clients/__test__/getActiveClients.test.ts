/*
 * @jest-environment node
 */

import { prismaMock } from "@/singleton";
import { getActiveClients } from "../getActiveClients";
import { ActiveClientsResponseSchema } from "@/utils/validationSchemas";
import { TaskStatusEnum } from "@prisma/client";
import { internalServerErrorMessage } from "@/errors/internalServerError";

describe("getActiveClients", () => {
  const mockFindMany = prismaMock.client.findMany as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the default number of clients when limit is not provided", async () => {
    // Mock data for active clients
    const mockActiveClients = [
      {
        id: "client1",
        companyName: "Client One",
        contactName: "Contact One",
        tasksCreated: [{ id: "task1" }, { id: "task2" }],
      },
      {
        id: "client2",
        companyName: "Client Two",
        contactName: "Contact Two",
        tasksCreated: [{ id: "task3" }],
      },
      {
        id: "client3",
        companyName: "Client Three",
        contactName: "Contact Three",
        tasksCreated: [{ id: "task4" }, { id: "task5" }, { id: "task6" }],
      },
    ];

    mockFindMany.mockResolvedValue(mockActiveClients);

    const result = await getActiveClients();

    // Validate the response against the schema
    const parsedResult = ActiveClientsResponseSchema.parse(result);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.clients).toHaveLength(3);
    expect(parsedResult.clients?.[0]).toStrictEqual({
      id: "client1",
      companyName: "Client One",
      contactName: "Contact One",
      activeTaskCount: 2,
    });
    expect(parsedResult.clients?.[1]).toStrictEqual({
      id: "client2",
      companyName: "Client Two",
      contactName: "Contact Two",
      activeTaskCount: 1,
    });
    expect(parsedResult.clients?.[2]).toStrictEqual({
      id: "client3",
      companyName: "Client Three",
      contactName: "Contact Three",
      activeTaskCount: 3,
    });

    // Ensure Prisma was called with correct parameters
    expect(mockFindMany).toHaveBeenCalledWith({
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
      select: {
        id: true,
        companyName: true,
        contactName: true,
        tasksCreated: {
          where: {
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
          select: {
            id: true,
          },
        },
      },
      take: 3,
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  it("should return the specified number of clients when limit is provided", async () => {
    const mockActiveClients = [
      {
        id: "client1",
        companyName: "Client One",
        contactName: "Contact One",
        tasksCreated: [{ id: "task1" }, { id: "task2" }],
      },
      {
        id: "client2",
        companyName: "Client Two",
        contactName: "Contact Two",
        tasksCreated: [{ id: "task3" }],
      },
    ];

    mockFindMany.mockResolvedValue(mockActiveClients);

    const limit = 2;
    const result = await getActiveClients(limit);

    // Validate the response against the schema
    const parsedResult = ActiveClientsResponseSchema.parse(result);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: limit,
      }),
    );

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.clients).toHaveLength(2);
    expect(parsedResult.clients?.[0]).toStrictEqual({
      id: "client1",
      companyName: "Client One",
      contactName: "Contact One",
      activeTaskCount: 2,
    });
    expect(parsedResult.clients?.[1]).toStrictEqual({
      id: "client2",
      companyName: "Client Two",
      contactName: "Contact Two",
      activeTaskCount: 1,
    });
  });

  it("should return an empty array when there are no active clients", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getActiveClients();

    const parsedResult = ActiveClientsResponseSchema.parse(result);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.clients).toHaveLength(0);
  });

  it("should handle clients with no contact name", async () => {
    const mockActiveClients = [
      {
        id: "client1",
        companyName: "Client One",
        contactName: null,
        tasksCreated: [{ id: "task1" }],
      },
    ];

    mockFindMany.mockResolvedValue(mockActiveClients);

    const result = await getActiveClients(1);

    const parsedResult = ActiveClientsResponseSchema.parse(result);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.clients).toHaveLength(1);
    expect(parsedResult.clients?.[0]).toStrictEqual({
      id: "client1",
      companyName: "Client One",
      contactName: "N/A",
      activeTaskCount: 1,
    });
  });

  it("should handle errors gracefully when database operation fails", async () => {
    const message = "Database connection failed";
    const mockError = new Error(message);

    mockFindMany.mockRejectedValue(mockError);

    const result = await getActiveClients();

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe(internalServerErrorMessage);
    expect(result.details).toEqual({ originalError: message });
  });

  it("should return a validation error when limit is invalid (negative number)", async () => {
    const result = await getActiveClients(-1);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
    expect(result.message).toBe("Validation failed.");
    expect(result.details).toBeDefined();
  });

  it("should return a validation error when limit is invalid (zero)", async () => {
    const result = await getActiveClients(0);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
    expect(result.message).toBe("Validation failed.");
    expect(result.details).toBeDefined();
  });

  it("should return a validation error when limit is invalid (non-integer)", async () => {
    const result = await getActiveClients(2.5);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
    expect(result.message).toBe("Validation failed.");
    expect(result.details).toBeDefined();
  });

  it("should handle excessively large limit values", async () => {
    const mockActiveClients = Array(100)
      .fill(null)
      .map((_, index) => ({
        id: `client${index + 1}`,
        companyName: `Client ${index + 1}`,
        contactName: `Contact ${index + 1}`,
        tasksCreated: [{ id: `task${index + 1}` }],
      }));

    mockFindMany.mockResolvedValue(mockActiveClients);

    const result = await getActiveClients(100);

    const parsedResult = ActiveClientsResponseSchema.parse(result);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.clients).toHaveLength(100);
  });

  it('should default contactName to "N/A" when it is undefined', async () => {
    const mockActiveClients = [
      {
        id: "client1",
        companyName: "Client One",
        contactName: undefined,
        tasksCreated: [{ id: "task1" }],
      },
    ];

    mockFindMany.mockResolvedValue(mockActiveClients);

    const result = await getActiveClients(1);

    const parsedResult = ActiveClientsResponseSchema.parse(result);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.clients).toHaveLength(1);
    expect(parsedResult.clients?.[0]).toStrictEqual({
      id: "client1",
      companyName: "Client One",
      contactName: "N/A",
      activeTaskCount: 1,
    });
  });
});
