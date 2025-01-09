/* eslint-disable @typescript-eslint/no-explicit-any */
// /app/api/uploadAndSaveFile/route.ts
import prisma from "@/db/db";
import { getApiGatewayUrl } from "@/db/repositories/files/getApiGatewayUrl";
import { FileMetadataSchema } from "@/utils/validationSchemas";
import { NextRequest, NextResponse } from "next/server";
import { deleteFileFromS3 } from "@/db/repositories/files/deleteFileFromS3";
import { sanitizeFileName } from "@/utils/fileUtils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, message: "File is required" },
        { status: 400 },
      );
    }

    const metaDataString = formData.get("metadata") as string;
    if (!metaDataString) {
      return NextResponse.json(
        { success: false, message: "Metadata is required" },
        { status: 400 },
      );
    }

    let metadata: unknown;
    try {
      metadata = JSON.parse(metaDataString);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid metadata JSON" },
        { status: 400 },
      );
    }

    // Validate metadata
    const { fileName, fileSize, uploadedBy, createdAt, role, userId, taskId } =
      FileMetadataSchema.parse(metadata);

    const sanitizedFileName = sanitizeFileName(fileName ?? file.name);
    const secretName = process.env.API_GATEWAY_SECRET_NAME;
    const uploadUrl = await getApiGatewayUrl(secretName);
    // Construct the new path (directory structure)
    const fileKey = `tasks/${taskId}/users/${userId}/${sanitizedFileName}`;

    if (!uploadUrl) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch API Gateway URL" },
        { status: 500 },
      );
    }

    // Step 1: Get pre-signed URL
    const presignedUrlResponse = await fetch(
      `${uploadUrl}generate-upload-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey: fileKey,
          fileType: file.type,
        }),
      },
    );

    if (!presignedUrlResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch pre-signed URL" },
        { status: 500 },
      );
    }

    const { uploadUrl: presignedUrl } = await presignedUrlResponse.json();

    // Step 2: Upload file to S3
    const s3Response = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!s3Response.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to upload file to S3" },
        { status: 500 },
      );
    }

    // Step 3: Save metadata in DB
    const ownerFields =
      role === "CLIENT" ? { ownerClientId: userId } : { ownerUserId: userId };

    try {
      // Use a transaction to ensure atomicity
      const fileRecord = await prisma.$transaction(async (prismaTx) => {
        const newFile = await prismaTx.file.create({
          data: {
            fileName: sanitizedFileName,
            filePath: fileKey, // same as fileName unless you have a different scheme
            fileSize,
            createdAt,
            uploadedBy,
            ...ownerFields,
          },
        });

        await prismaTx.taskFile.create({
          data: {
            taskId,
            fileId: newFile.id,
          },
        });

        return newFile;
      });

      // If we reach here, everything succeeded
      return NextResponse.json({
        success: true,
        data: {
          fileId: fileRecord.id,
          fileName: fileRecord.fileName,
          taskId,
          progress: 100,
          uploadTime: new Date().toISOString(),
          fileKey: sanitizedFileName,
        },
      });
    } catch (dbError: any) {
      // Database insertion failed, rollback the uploaded file
      const fileKey = `tasks/${taskId}/users/${userId}/${sanitizedFileName}`;
      await deleteFileFromS3(fileKey);
      return NextResponse.json(
        { success: false, message: dbError.message },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.log(error);
    return NextResponse.json(
      { success: false, message: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}
