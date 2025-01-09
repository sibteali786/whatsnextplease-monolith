"use server";

import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { handleError } from "@/utils/errorHandler";
import logger from "@/utils/logger";

config();

interface DeleteFileResponse {
  success: boolean;
  message: string;
}

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const deleteFileFromS3 = async (
  fileKey: string,
): Promise<DeleteFileResponse> => {
  try {
    // Step 1: Check if the object exists
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileKey,
        }),
      );
    } catch (err) {
      return handleError(err, "deleteFileFromS3");
    }

    // Step 2: Delete the object from S3
    const res = await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
      }),
    );

    logger.info(
      { fileKey, metadata: res.$metadata },
      "File successfully deleted from S3",
    );

    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    return handleError(error, "deleteFileFromS3");
  }
};
