import prisma from "@/db/db";
import { deleteFileFromS3 } from "@/db/repositories/files/deleteFileFromS3";
import logger from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  // Check if file exists both in database and S3 bucket
  // If it exists, delete it from both locations
  // If it does not exist, return an error message
  try {
    const { id } = await request.json();
    const file = await prisma.file.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        filePath: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "File not found",
        },
        {
          status: 404,
        },
      );
    }

    // Delete file from S3
    const fileKey = file.filePath;
    const response = await deleteFileFromS3(fileKey);
    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete file from S3",
        },
        { status: 500 },
      );
    }

    // Delete file from database
    await prisma.file.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "File deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error(error, "deleteFileById");
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
