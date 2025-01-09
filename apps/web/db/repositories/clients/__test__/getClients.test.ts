/*
 * @jest-environment node
 */
import getClientsList from "@/db/repositories/clients/getClients";
import { internalServerErrorMessage } from "@/errors/internalServerError";
import { prismaMock } from "@/singleton";
import { jest } from "@jest/globals";

describe("getClientsList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the correct number of clients when the cursor is provided", async () => {
    const mockClients = Array(10).fill({
      id: "test-id",
      companyName: "Test Company",
      contactName: "Test Contact",
      email: "test@example.com",
      phone: "123456789",
      website: "http://example.com",
    });

    prismaMock.client.findMany.mockResolvedValue(mockClients);
    prismaMock.client.count.mockResolvedValue(10); // Mock total client count

    const result = await getClientsList({
      cursor: null,
      pageSize: 10,
    });

    expect(result.success).toBe(true);
    expect(result.clients).toHaveLength(10);
    expect(result.clients?.[0]?.companyName).toBe("Test Company");
    expect(result.hasNextPage).toBe(false);
    expect(result.totalCount).toBe(10);
  });

  it("should return the correct cursor for the next page", async () => {
    const mockClients = Array(11)
      .fill({
        id: "test-id",
        companyName: "Test Company",
        contactName: "Test Contact",
        email: "test@example.com",
        phone: "123456789",
        website: "http://example.com",
      })
      .map((client, index) => ({
        ...client,
        id: `test-id-${index}`,
      }));

    prismaMock.client.findMany.mockResolvedValue(mockClients);
    prismaMock.client.count.mockResolvedValue(mockClients.length);

    const result = await getClientsList({
      cursor: null,
      pageSize: 10,
    });
    expect(result.success).toBe(true);
    expect(result.clients).toHaveLength(10);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toBe(mockClients[9]?.id);
    expect(result.totalCount).toBe(11);
  });

  it("should handle errors gracefully", async () => {
    prismaMock.client.findMany.mockRejectedValue(new Error("Database error"));

    const result = await getClientsList({ cursor: null, pageSize: 10 });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe(internalServerErrorMessage);
    expect(result.details).toBeDefined();
  });

  it("should correctly return total count of clients", async () => {
    const mockClients = Array(5).fill({
      id: "test-id",
      companyName: "Test Company",
      contactName: "Test Contact",
      email: "test@example.com",
      phone: "123456789",
      website: "http://example.com",
    });

    prismaMock.client.findMany.mockResolvedValue(mockClients);
    prismaMock.client.count.mockResolvedValue(5); // Mock total client count

    const { totalCount } = await getClientsList({
      cursor: null,
      pageSize: 5,
    });

    expect(totalCount).toBe(5);
  });
});
