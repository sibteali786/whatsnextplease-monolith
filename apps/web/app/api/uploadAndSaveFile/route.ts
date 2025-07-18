/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from '@/db/db';
import { getApiGatewayUrl } from '@/db/repositories/files/getApiGatewayUrl';
import { FileMetadataSchema, UploadContextType } from '@/utils/validationSchemas';
import { NextRequest, NextResponse } from 'next/server';
import { deleteFileFromS3 } from '@/db/repositories/files/deleteFileFromS3';
import { sanitizeFileName } from '@/utils/fileUtils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 });
    }

    const metaDataString = formData.get('metadata') as string;
    if (!metaDataString) {
      return NextResponse.json(
        { success: false, message: 'Metadata is required' },
        { status: 400 }
      );
    }

    let metadata: unknown;
    try {
      metadata = JSON.parse(metaDataString);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid metadata JSON' },
        { status: 400 }
      );
    }

    // Validate metadata
    const {
      fileName,
      fileSize,
      uploadedBy,
      createdAt,
      role,
      userId,
      uploadContext,
      taskId,
      targetClientId,
      targetUserId,
    } = FileMetadataSchema.parse(metadata);

    const sanitizedFileName = sanitizeFileName(fileName ?? file.name);

    // Generate context-specific fileKey
    let fileKey: string;
    let ownerFields: any;

    switch (uploadContext) {
      case UploadContextType.TASK:
        if (!taskId) throw new Error('taskId required for TASK context');
        fileKey = `tasks/${taskId}/users/${userId}/${sanitizedFileName}`;
        ownerFields = role === 'CLIENT' ? { ownerClientId: userId } : { ownerUserId: userId };
        break;

      case UploadContextType.CLIENT_PROFILE:
        if (!targetClientId) throw new Error('targetClientId required for CLIENT_PROFILE context');
        fileKey = `clients/${targetClientId}/uploaded-by/${userId}/${sanitizedFileName}`;
        ownerFields = { ownerClientId: targetClientId, ownerUserId: userId }; // Both for tracking
        break;

      case UploadContextType.USER_PROFILE:
        if (!targetUserId) throw new Error('targetUserId required for USER_PROFILE context');
        fileKey = `users/${targetUserId}/uploaded-by/${userId}/${sanitizedFileName}`;
        ownerFields = { ownerUserId: targetUserId };
        break;

      default:
        throw new Error('Invalid upload context');
    }

    const secretName = process.env.API_GATEWAY_SECRET_NAME;
    const uploadUrl = await getApiGatewayUrl(secretName);

    if (!uploadUrl) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch API Gateway URL' },
        { status: 500 }
      );
    }

    // Step 1: Get pre-signed URL
    const presignedUrlResponse = await fetch(`${uploadUrl}generate-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileKey: fileKey,
        fileType: file.type,
      }),
    });

    if (!presignedUrlResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch pre-signed URL' },
        { status: 500 }
      );
    }

    const { uploadUrl: presignedUrl } = await presignedUrlResponse.json();

    // Step 2: Upload file to S3
    const s3Response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!s3Response.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to upload file to S3' },
        { status: 500 }
      );
    }

    // Step 3: Save metadata in DB with proper transaction and rollback
    try {
      // Use a transaction to ensure atomicity
      const fileRecord = await prisma.$transaction(async prismaTx => {
        const newFile = await prismaTx.file.create({
          data: {
            fileName: sanitizedFileName,
            filePath: fileKey,
            fileSize,
            createdAt: new Date(createdAt),
            uploadedBy,
            ...ownerFields,
          },
        });

        // Only create TaskFile relation for task uploads
        if (uploadContext === UploadContextType.TASK && taskId) {
          await prismaTx.taskFile.create({
            data: {
              taskId,
              fileId: newFile.id,
            },
          });
        }

        return newFile;
      });

      // If we reach here, everything succeeded
      return NextResponse.json({
        success: true,
        data: {
          fileId: fileRecord.id,
          fileName: fileRecord.fileName,
          uploadContext,
          ...(taskId && { taskId }),
          ...(targetClientId && { targetClientId }),
          ...(targetUserId && { targetUserId }),
          progress: 100,
          uploadTime: new Date().toISOString(),
          fileKey: sanitizedFileName,
        },
      });
    } catch (dbError: any) {
      // Database insertion failed, rollback the uploaded file from S3
      console.error('Database error, rolling back S3 upload:', dbError);
      try {
        await deleteFileFromS3(fileKey);
        console.log('Successfully rolled back S3 upload');
      } catch (s3Error) {
        console.error('Failed to rollback S3 upload:', s3Error);
        // Continue with the original error response
      }

      return NextResponse.json({ success: false, message: dbError.message }, { status: 500 });
    }
  } catch (error: any) {
    console.log(error);
    return NextResponse.json(
      { success: false, message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
