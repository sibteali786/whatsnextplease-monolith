"use server";
import prisma from "@/db/db";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { revalidateTag } from "next/cache";
config();

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const deleteFileById = async (fileId: string) => {
  try {
    // Fetch file details to get the S3 object key
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error("File not found in database");
    }

    // Step 1: Delete file from S3 using the `filePath` as the key
    const deleteParams = {
      Bucket: process.env.S3_BUCKET_NAME, // Ensure this environment variable is set
      Key: file.fileName, // Assuming `filePath` is the S3 object key
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log("File deleted from S3:", file.filePath);

    // Step 2: Delete file record from the database
    const deletedFile = await prisma.file.delete({
      where: { id: fileId },
    });

    console.log("File record deleted from database:", deletedFile);
    revalidateTag("clients:files");
    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting file:", error);
    return {
      success: false,
      message: "Error deleting file",
    };
  }
};
