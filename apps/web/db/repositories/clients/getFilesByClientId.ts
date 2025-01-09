import prisma from "@/db/db";
import "server-only";
import {
  FileSchema,
  GetFilesByClientIdResponse,
  GetFilesByClientIdResponseSchema,
  InputParamsSchema,
} from "@/utils/validationSchemas";
import logger from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";

/**
 * Retrieves files for a specific client using their client ID.
 *
 * @param clientId - The ID of the client to fetch files for.
 * @param cursor - The cursor for pagination to fetch the next set of files.
 * @param pageSize - The number of files to fetch per page.
 * @returns A promise containing the files assigned to the client, pagination information, or an error message.
 */
export const getFilesByClientId = async (
  clientId: string,
  cursor: string | null,
  pageSize: number = 10,
): Promise<GetFilesByClientIdResponse> => {
  try {
    // Validate input parameters
    InputParamsSchema.parse({ clientId, cursor, pageSize });

    // Fetch files from the database
    const files = await prisma.file.findMany({
      where: { ownerClientId: clientId },
      take: pageSize + 1, // Fetch one extra record to determine if there's a next page
      ...(cursor && { cursor: { id: cursor }, skip: 1 }), // Skip the cursor itself if provided
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        uploadedAt: true,
        updatedAt: true,
        ownerUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const hasNextCursor = files.length > pageSize;
    const nextCursor = hasNextCursor ? files[pageSize]?.id : null;

    if (hasNextCursor) {
      files.pop(); // Remove the extra record if it exists
    }

    const totalCount = await prisma.file.count({
      where: { ownerClientId: clientId },
    });

    // Transform and validate files
    const filesData = files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize.toString(), // Ensure fileSize is stringified
      dateUploaded: file.uploadedAt,
      lastUpdated: file.updatedAt,
      uploadedBy: file.ownerUser
        ? `${file.ownerUser.firstName} ${file.ownerUser.lastName}`
        : "",
    }));

    // Validate files data against FileSchema
    filesData.forEach((file) => {
      FileSchema.parse(file);
    });

    const responseData = {
      success: true,
      files: filesData,
      hasNextCursor,
      nextCursor,
      totalCount,
    };

    // Validate response data against schema
    return GetFilesByClientIdResponseSchema.parse(responseData);
  } catch (error) {
    logger.error({ error }, "Error in getFilesByClientId");
    return handleError(
      error,
      "getFilesByClientId",
    ) as GetFilesByClientIdResponse;
  }
};
