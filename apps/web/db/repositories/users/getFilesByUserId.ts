// src/db/repositories/users/getFilesByUserId.ts

import prisma from "@/db/db";
import { z } from "zod";
import "server-only";

/**
 * Zod schema defining the structure of the file data retrieved by user ID.
 */
const FileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileSize: z.string(),
  dateUploaded: z.date(),
  lastUpdated: z.date(),
  uploadedBy: z.string(),
});

/**
 * Zod schema for the overall response structure
 */
const FilesResponseSchema = z.object({
  files: z.array(FileSchema),
  success: z.boolean(),
  hasNextCursor: z.boolean(),
  nextCursor: z.string().nullable(),
  totalCount: z.number(),
  message: z.string().optional(),
});

/**
 * TypeScript type based on the Zod schema
 */
export type FilesByUserId = z.infer<typeof FilesResponseSchema>;

/**
 * Retrieves files for a specific user using their user ID.
 *
 * @param userId - The ID of the user to fetch files for.
 * @param cursor - The cursor for pagination to fetch the next set of files.
 * @param pageSize - The number of files to fetch per page.
 * @returns A promise containing the files assigned to the user, pagination information, or an error message.
 */
export const getFilesByUserId = async (
  userId: string,
  cursor: string | null,
  pageSize: number = 10,
): Promise<FilesByUserId> => {
  try {
    if (typeof userId !== "string" || userId.trim().length === 0) {
      return FilesResponseSchema.parse({
        success: false,
        message: "Invalid user ID provided.",
        files: [],
        hasNextCursor: false,
        nextCursor: null,
        totalCount: 0,
      });
    }

    const files = await prisma.file.findMany({
      where: { ownerUserId: userId },
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
      where: { ownerUserId: userId },
    });

    const responseData = {
      success: true,
      files: files.map((file) => ({
        ...file,
        fileSize: file.fileSize.toString(),
        dateUploaded: file.uploadedAt,
        lastUpdated: file.updatedAt,
        uploadedBy: file.ownerUser
          ? `${file.ownerUser.firstName} ${file.ownerUser.lastName}`
          : "",
      })),
      hasNextCursor,
      nextCursor,
      totalCount,
    };
    return FilesResponseSchema.parse(responseData);
  } catch (error) {
    console.error("Error in getFilesByUserId:", error);
    return FilesResponseSchema.parse({
      success: false,
      message:
        "An error occurred while retrieving files. Please try again later.",
      files: [],
      hasNextCursor: false,
      nextCursor: null,
      totalCount: 0,
    });
  }
};
