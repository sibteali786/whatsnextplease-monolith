/*
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { prismaMock } from "@/singleton";
import { getInvoicesByClientId } from "../getInvoicesByClientId";
import { GetInvoicesByClientIdResponseSchema } from "@/utils/validationSchemas";
import { internalServerErrorMessage } from "@/errors/internalServerError";

describe("getInvoicesByClientId", () => {
  const mockFindMany = prismaMock.invoice.findMany as jest.Mock;
  const mockCount = prismaMock.invoice.count as jest.Mock;

  const mockClientId = "00000000-0000-0000-0000-000000000000"; // Valid UUID
  const pageSize = 10;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock invoices
  const createMockInvoices = (count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `invoice${index + 1}`,
      invoiceNumber: `INV-${index + 1}`,
      date: new Date(),
      amount: (1000 + index * 100).toString(),
      status: "PAID",
      task: {
        taskCategory: {
          categoryName: "Consulting",
        },
      },
    }));
  };

  describe("Validation Errors", () => {
    it("should return a validation error when clientId is invalid", async () => {
      const invalidClientId = "invalid-uuid";

      const result = await getInvoicesByClientId(
        invalidClientId,
        null,
        pageSize,
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("Validation failed.");
      expect(result.details).toBeDefined();

      // Ensure no database calls were made
      expect(mockFindMany).not.toHaveBeenCalled();
      expect(mockCount).not.toHaveBeenCalled();
    });

    it("should return a validation error when pageSize is invalid", async () => {
      const invalidPageSize = -1;

      const result = await getInvoicesByClientId(
        mockClientId,
        null,
        invalidPageSize,
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("Validation failed.");
      expect(result.details).toBeDefined();

      // Ensure no database calls were made
      expect(mockFindMany).not.toHaveBeenCalled();
      expect(mockCount).not.toHaveBeenCalled();
    });
  });

  describe("Successful Retrieval", () => {
    it("should return empty invoices array when clientId is valid but has no invoices", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const result = await getInvoicesByClientId(mockClientId, null, pageSize);

      // Validate response against schema
      const parsedResult = GetInvoicesByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.invoices).toHaveLength(0);
      expect(parsedResult.hasNextCursor).toBe(false);
      expect(parsedResult.nextCursor).toBeNull();
      expect(parsedResult.totalCount).toBe(0);

      // Verify database calls
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: mockClientId },
        }),
      );
      expect(mockCount).toHaveBeenCalledWith({
        where: { clientId: mockClientId },
      });
    });

    it("should return invoices when clientId is valid and has invoices", async () => {
      const mockInvoices = createMockInvoices(5);
      mockFindMany.mockResolvedValue(mockInvoices);
      mockCount.mockResolvedValue(5);

      const result = await getInvoicesByClientId(mockClientId, null, pageSize);

      // Validate response against schema
      const parsedResult = GetInvoicesByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.invoices).toHaveLength(5);
      expect(parsedResult.hasNextCursor).toBe(false);
      expect(parsedResult.nextCursor).toBeNull();
      expect(parsedResult.totalCount).toBe(5);
    });
  });

  describe("Pagination Logic", () => {
    it("should handle pagination correctly when there are more invoices than pageSize", async () => {
      const testPageSize = 2;
      const mockInvoices = createMockInvoices(3);
      mockFindMany.mockResolvedValue([...mockInvoices]);
      mockCount.mockResolvedValue(3);

      const result = await getInvoicesByClientId(
        mockClientId,
        null,
        testPageSize,
      );

      const parsedResult = GetInvoicesByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.invoices).toHaveLength(2);
      expect(parsedResult.hasNextCursor).toBe(true);
      expect(parsedResult.nextCursor).toBe("invoice3");
      expect(parsedResult.totalCount).toBe(3);
    });

    it("should handle pagination correctly when a cursor is provided", async () => {
      const testPageSize = 2;
      const cursor = "invoice1";
      const mockInvoices = createMockInvoices(4).slice(1);
      mockFindMany.mockResolvedValue([...mockInvoices]);
      mockCount.mockResolvedValue(4);

      const result = await getInvoicesByClientId(
        mockClientId,
        cursor,
        testPageSize,
      );

      const parsedResult = GetInvoicesByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.invoices).toHaveLength(2);
      expect(parsedResult.hasNextCursor).toBe(true);
      expect(parsedResult.nextCursor).toBe("invoice4");
      expect(parsedResult.totalCount).toBe(4);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const errorMessage = "Database error";
      mockFindMany.mockRejectedValue(new Error(errorMessage));

      const result = await getInvoicesByClientId(mockClientId, null, pageSize);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INTERNAL_SERVER_ERROR");
      expect(result.message).toBe(internalServerErrorMessage);
      expect(result.details).toBeDefined();

      // Ensure count is not called after error
      expect(mockCount).not.toHaveBeenCalled();
    });

    it("should handle data parsing errors gracefully", async () => {
      const invalidMockInvoices = [
        {
          id: "invoice1",
          // Missing 'invoiceNumber' field
          date: new Date(),
          amount: "1000.5",
          status: "PAID",
          task: {
            taskCategory: {
              categoryName: "Consulting",
            },
          },
        },
      ];
      mockFindMany.mockResolvedValue(invalidMockInvoices);
      mockCount.mockResolvedValue(1);

      const result = await getInvoicesByClientId(mockClientId, null, pageSize);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("Validation failed.");
      expect(result.details).toBeDefined();
    });
  });
});
