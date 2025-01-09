// Example server-side function to save file URL in PostgreSQL
import prisma from "@/db/db";
import { revalidateTag } from "next/cache";
import "server-only";
export const postFileData = async (
  clientId: string,
  userId: string,
  uploadedBy: string,
  file: File,
) => {
  const fileSizeInKb = `${file.size / 1000}kb`;
  try {
    const savedFile = await prisma.file.create({
      data: {
        filePath: file.name,
        ownerClientId: clientId,
        fileName: file.name,
        uploadedBy,
        fileSize: fileSizeInKb,
        ownerUserId: userId,
      },
    });
    revalidateTag("clients:files");
    return savedFile;
  } catch (error) {
    console.error("Error saving file URL to database:", error);
    throw error;
  }
};
