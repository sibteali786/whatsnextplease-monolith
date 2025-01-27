/*
 * @jest-environment node
 */
 
import { prismaMock } from "@/singleton";
import { getFilesByClientId } from "../getFilesByClientId";
import { mockClientId, pageSize } from "@/mocks/clientMocks";
import { GetFilesByClientIdResponseSchema } from "@/utils/validationSchemas";
import { internalServerErrorMessage } from "@/errors/internalServerError";

describe("getFilesByClientId", () => {
  const mockFindMany = prismaMock.file.findMany as jest.Mock;
  const mockCount = prismaMock.file.count as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock files
  const createMockFiles = (count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `file${index + 1}`,
      fileName: `Document${index + 1}.pdf`,
      fileSize: (1024 * (index + 1)).toString(),
      uploadedAt: new Date(),
      updatedAt: new Date(),
      ownerUser: {
        firstName: `FirstName${index + 1}`,
        lastName: `LastName${index + 1}`,
      },
    }));
  };

  describe("Validation Errors", () => {
    it("should return a validation error when clientId is invalid", async () => {
      const invalidClientId = ""; // Empty string

      const result = await getFilesByClientId(invalidClientId, null, pageSize);

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

      const result = await getFilesByClientId(
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

    it("should return a validation error when cursor is invalid", async () => {
      const invalidCursor = 123 as any; // Non-string value

      const result = await getFilesByClientId(
        mockClientId,
        invalidCursor,
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
  });

  describe("Successful Retrieval", () => {
    it("should return empty array when clientId is valid but has no files", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const result = await getFilesByClientId(mockClientId, null, pageSize);

      // Validate response against schema
      const parsedResult = GetFilesByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.files).toHaveLength(0);
      expect(parsedResult.hasNextCursor).toBe(false);
      expect(parsedResult.nextCursor).toBeNull();
      expect(parsedResult.totalCount).toBe(0);

      // Verify database calls
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { ownerClientId: mockClientId },
        take: pageSize + 1,
        select: expect.any(Object),
      });
      expect(mockCount).toHaveBeenCalledWith({
        where: { ownerClientId: mockClientId },
      });
    });

    it("should return files when clientId is valid and has files less than pageSize", async () => {
      const mockFiles = createMockFiles(5).map((file) => ({
        ...file,
        fileSize: parseInt(file.fileSize), // Convert fileSize back to number for mocking
      }));
      mockFindMany.mockResolvedValue(mockFiles);
      mockCount.mockResolvedValue(5);

      const result = await getFilesByClientId(mockClientId, null, pageSize);

      // Validate response against schema
      const parsedResult = GetFilesByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.files).toHaveLength(5);
      expect(parsedResult.hasNextCursor).toBe(false);
      expect(parsedResult.nextCursor).toBeNull();
      expect(parsedResult.totalCount).toBe(5);
    });
  });

  describe("Pagination Logic", () => {
    it("should handle pagination correctly when there are more files than pageSize", async () => {
      const testPageSize = 2;
      const mockFiles = createMockFiles(3).map((file) => ({
        ...file,
        fileSize: parseInt(file.fileSize), // Convert fileSize back to number for mocking
      }));
      mockFindMany.mockResolvedValue([...mockFiles]);
      mockCount.mockResolvedValue(3);

      const result = await getFilesByClientId(mockClientId, null, testPageSize);

      const parsedResult = GetFilesByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.files).toHaveLength(2);
      expect(parsedResult.hasNextCursor).toBe(true);
      expect(parsedResult.nextCursor).toBe("file3");
      expect(parsedResult.totalCount).toBe(3);
    });

    it("should handle pagination correctly when a cursor is provided", async () => {
      const testPageSize = 2;
      const cursor = "file1";
      const mockFiles = createMockFiles(4)
        .slice(1)
        .map((file) => ({
          ...file,
          fileSize: parseInt(file.fileSize),
        }));
      mockFindMany.mockResolvedValue([...mockFiles]);
      mockCount.mockResolvedValue(4);

      const result = await getFilesByClientId(
        mockClientId,
        cursor,
        testPageSize,
      );

      const parsedResult = GetFilesByClientIdResponseSchema.parse(result);

      expect(parsedResult.success).toBe(true);
      expect(parsedResult.files).toHaveLength(2);
      expect(parsedResult.hasNextCursor).toBe(true);
      expect(parsedResult.nextCursor).toBe("file4");
      expect(parsedResult.totalCount).toBe(4);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const errorMessage = "Database error";
      mockFindMany.mockRejectedValue(new Error(errorMessage));

      const result = await getFilesByClientId(mockClientId, null, pageSize);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INTERNAL_SERVER_ERROR");
      expect(result.message).toBe(internalServerErrorMessage);
      expect(result.details).toBeDefined();

      // Ensure count is not called after error
      expect(mockCount).not.toHaveBeenCalled();
    });

    it("should handle data parsing errors gracefully", async () => {
      const mockFiles = [
        {
          id: "file1",
          // Missing 'fileName' field
          fileSize: 1024,
          uploadedAt: new Date(),
          updatedAt: new Date(),
          ownerUser: {
            firstName: "John",
            lastName: "Doe",
          },
        },
      ];
      mockFindMany.mockResolvedValue(mockFiles);
      mockCount.mockResolvedValue(1);

      const result = await getFilesByClientId(mockClientId, null, pageSize);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("Validation failed.");
      expect(result.details).toBeDefined();
    });
  });
});
