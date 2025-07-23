import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth/types';
import { FileService, FileUploadData } from '../services/file.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { BadRequestError } from '@wnp/types';
import { FileMetadataSchema } from '@wnp/types';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export class FileController {
  constructor(private readonly fileService: FileService = new FileService()) {}

  // Handle file upload with S3 integration
  private handleUploadFile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequestError('File is required');
      }

      const { metadata } = req.body;
      if (!metadata) {
        throw new BadRequestError('Metadata is required');
      }

      // Parse and validate metadata
      let parsedMetadata: unknown;
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        throw new BadRequestError('Invalid metadata JSON');
      }

      const validatedMetadata = FileMetadataSchema.parse(parsedMetadata);

      const fileData: FileUploadData = {
        fileName: validatedMetadata.fileName || file.originalname,
        fileSize: validatedMetadata.fileSize,
        uploadedBy: validatedMetadata.uploadedBy,
        createdAt: validatedMetadata.createdAt,
        role: validatedMetadata.role,
        userId: validatedMetadata.userId,
        uploadContext: validatedMetadata.uploadContext,
        taskId: validatedMetadata.taskId,
        targetClientId: validatedMetadata.targetClientId,
        targetUserId: validatedMetadata.targetUserId,
      };

      // Step 1: Generate presigned upload URL
      const uploadUrlResult = await this.fileService.generateUploadUrl(fileData, file.mimetype);

      if (!uploadUrlResult.success) {
        throw new BadRequestError(uploadUrlResult.error || 'Failed to generate upload URL');
      }

      // Step 2: Upload file to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrlResult.uploadUrl!, {
        method: 'PUT',
        headers: { 'Content-Type': file.mimetype },
        body: file.buffer,
      });

      if (!uploadResponse.ok) {
        throw new BadRequestError('Failed to upload file to S3');
      }

      // Step 3: Complete upload by saving metadata to database
      const completeResult = await this.fileService.completeFileUpload(
        fileData,
        uploadUrlResult.fileKey!
      );

      if (!completeResult.success) {
        throw new BadRequestError(completeResult.error || 'Failed to complete file upload');
      }

      res.status(201).json({
        success: true,
        data: {
          fileId: completeResult.fileId,
          fileName: completeResult.fileName,
          fileKey: completeResult.fileKey,
          uploadContext: fileData.uploadContext,
          ...(fileData.taskId && { taskId: fileData.taskId }),
          ...(fileData.targetClientId && { targetClientId: fileData.targetClientId }),
          ...(fileData.targetUserId && { targetUserId: fileData.targetUserId }),
          progress: 100,
          uploadTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete file by ID
  private handleDeleteFileById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('File ID is required');
      }

      const result = await this.fileService.deleteFileById(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  // Generate download URL by file ID
  private handleGenerateDownloadUrl = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('File ID is required');
      }

      const result = await this.fileService.generateDownloadUrl(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: 'Failed to generate download URL',
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
      });
    } catch (error) {
      next(error);
    }
  };

  // Generate download URL by file key (for direct S3 access)
  private handleGenerateDownloadUrlByKey = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { fileKey, fileType } = req.body;

      if (!fileKey) {
        throw new BadRequestError('File key is required');
      }

      const result = await this.fileService.generateDownloadUrlByKey(fileKey, fileType);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: 'Failed to generate download URL',
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        downloadUrl: result.downloadUrl,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get file details
  private handleGetFileDetails = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new BadRequestError('File ID is required');
      }

      const fileDetails = await this.fileService.getFileDetails(id);

      res.status(200).json({
        success: true,
        data: fileDetails,
      });
    } catch (error) {
      next(error);
    }
  };

  // Handle legacy file upload (for compatibility with existing frontend)
  private handleLegacyUploadAndSaveFile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // This is a wrapper that mimics the old API route behavior
      // Extract file and metadata from FormData (handled by multer)
      const file = req.file;
      const { metadata } = req.body;

      if (!file || !metadata) {
        throw new BadRequestError('File and metadata are required');
      }

      // Parse metadata
      let parsedMetadata: unknown;
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        throw new BadRequestError('Invalid metadata JSON');
      }

      const validatedMetadata = FileMetadataSchema.parse(parsedMetadata);

      const fileData: FileUploadData = {
        fileName: validatedMetadata.fileName || file.originalname,
        fileSize: validatedMetadata.fileSize,
        uploadedBy: validatedMetadata.uploadedBy,
        createdAt: validatedMetadata.createdAt,
        role: validatedMetadata.role,
        userId: validatedMetadata.userId,
        uploadContext: validatedMetadata.uploadContext,
        taskId: validatedMetadata.taskId,
        targetClientId: validatedMetadata.targetClientId,
        targetUserId: validatedMetadata.targetUserId,
      };

      // Use the same upload logic
      const uploadUrlResult = await this.fileService.generateUploadUrl(fileData, file.mimetype);

      if (!uploadUrlResult.success) {
        throw new BadRequestError(uploadUrlResult.error || 'Failed to generate upload URL');
      }

      // Upload to S3
      const uploadResponse = await fetch(uploadUrlResult.uploadUrl!, {
        method: 'PUT',
        headers: { 'Content-Type': file.mimetype },
        body: file.buffer,
      });

      if (!uploadResponse.ok) {
        throw new BadRequestError('Failed to upload file to S3');
      }

      // Complete upload
      const completeResult = await this.fileService.completeFileUpload(
        fileData,
        uploadUrlResult.fileKey!
      );

      if (!completeResult.success) {
        throw new BadRequestError(completeResult.error || 'Failed to complete file upload');
      }

      // Return response in the format expected by existing frontend
      res.status(200).json({
        success: true,
        data: {
          fileId: completeResult.fileId,
          fileName: completeResult.fileName,
          uploadContext: fileData.uploadContext,
          ...(fileData.taskId && { taskId: fileData.taskId }),
          ...(fileData.targetClientId && { targetClientId: fileData.targetClientId }),
          ...(fileData.targetUserId && { targetUserId: fileData.targetUserId }),
          progress: 100,
          uploadTime: new Date().toISOString(),
          fileKey: completeResult.fileName,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Public methods for route binding
  uploadFile = asyncHandler(this.handleUploadFile);
  deleteFileById = asyncHandler(this.handleDeleteFileById);
  generateDownloadUrl = asyncHandler(this.handleGenerateDownloadUrl);
  generateDownloadUrlByKey = asyncHandler(this.handleGenerateDownloadUrlByKey);
  getFileDetails = asyncHandler(this.handleGetFileDetails);
  legacyUploadAndSaveFile = asyncHandler(this.handleLegacyUploadAndSaveFile);

  // Multer middleware
  static uploadMiddleware = upload.single('file');
}
