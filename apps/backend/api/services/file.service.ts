import { FileRepository, CreateFileData } from '../repositories/file.repository';
import { BadRequestError, InternalServerError, NotFoundError } from '@wnp/types';
import { UploadContextType } from '@wnp/types';
import { S3BucketService } from './s3Service';

export interface FileUploadData {
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  createdAt: string;
  role: string;
  userId: string;
  uploadContext: UploadContextType;
  taskId?: string;
  targetClientId?: string;
  targetUserId?: string;
}

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  fileKey?: string;
  downloadUrl?: string;
  uploadUrl?: string;
  error?: string;
}

export interface FileDeleteResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface FileDownloadResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  error?: string;
}

export class FileService {
  private s3Service: S3BucketService;
  private fileRepository: FileRepository;

  constructor() {
    this.s3Service = new S3BucketService();
    this.fileRepository = new FileRepository();
  }

  /**
   * Generate upload URL using direct SDK approach (no Lambda/API Gateway)
   * This method now generates presigned URLs locally with full control over parameters
   */
  async generateUploadUrl(
    fileData: FileUploadData,
    fileType: string,
    options?: {
      expiresIn?: number; // seconds, default 900 (15 minutes)
      maxFileSize?: number; // bytes, for Content-Length validation
    }
  ): Promise<FileUploadResult> {
    try {
      const { userId, fileName, uploadContext, taskId, targetClientId, targetUserId } = fileData;

      // Generate appropriate file key based on context
      let fileKey: string;
      switch (uploadContext) {
        case UploadContextType.TASK:
          if (!taskId) throw new BadRequestError('taskId required for TASK context');
          fileKey = this.s3Service.generateFileKey(userId, fileName, 'task', taskId);
          break;
        case UploadContextType.CLIENT_PROFILE:
          if (!targetClientId)
            throw new BadRequestError('targetClientId required for CLIENT_PROFILE context');
          fileKey = this.s3Service.generateFileKey(userId, fileName, 'client', targetClientId);
          break;
        case UploadContextType.USER_PROFILE:
          if (!targetUserId)
            throw new BadRequestError('targetUserId required for USER_PROFILE context');
          fileKey = this.s3Service.generateFileKey(userId, fileName, 'user', targetUserId);
          break;
        case UploadContextType.TASK_COMMENT:
          if (!taskId) throw new BadRequestError('taskId required for TASK_COMMENT context');
          fileKey = this.s3Service.generateFileKey(userId, fileName, 'task-comment', taskId);
          break;
        default:
          throw new BadRequestError('Invalid upload context');
      }

      // Generate presigned upload URL with enhanced options
      const uploadResponse = await this.s3Service.generatePresignedUploadUrl(fileKey, fileType, {
        expiresIn: options?.expiresIn || 900, // 15 minutes default
        contentLength: options?.maxFileSize,
        metadata: {
          uploadedBy: fileData.uploadedBy,
          userId: fileData.userId,
          uploadContext: uploadContext.toString(),
          originalFileName: fileName,
          ...(taskId && { taskId }),
          ...(targetClientId && { targetClientId }),
          ...(targetUserId && { targetUserId }),
        },
      });

      if (!uploadResponse.success) {
        return {
          success: false,
          error: uploadResponse.error,
        };
      }

      return {
        success: true,
        uploadUrl: uploadResponse.uploadUrl,
        fileKey,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating upload URL',
      };
    }
  }

  async completeFileUpload(fileData: FileUploadData, fileKey: string): Promise<FileUploadResult> {
    try {
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
      } = fileData;

      // Verify file was actually uploaded to S3
      const fileExists = await this.s3Service.doesFileExist(fileKey);
      if (!fileExists) {
        throw new BadRequestError('File upload verification failed - file not found in S3');
      }

      // Get actual file metadata from S3
      const s3Metadata = await this.s3Service.getFileMetadata(fileKey);

      // Determine owner fields based on context and role
      let ownerFields: Partial<CreateFileData> = {};
      switch (uploadContext) {
        case UploadContextType.TASK:
          ownerFields = role === 'CLIENT' ? { ownerClientId: userId } : { ownerUserId: userId };
          break;
        case UploadContextType.CLIENT_PROFILE:
          ownerFields = { ownerClientId: targetClientId, ownerUserId: userId };
          break;
        case UploadContextType.USER_PROFILE:
          ownerFields = { ownerUserId: targetUserId };
          break;
        case UploadContextType.TASK_COMMENT:
          ownerFields = role === 'CLIENT' ? { ownerClientId: userId } : { ownerUserId: userId };
          break;
        default:
          throw new BadRequestError('Invalid upload context');
      }

      const createFileData: CreateFileData = {
        fileName,
        filePath: fileKey,
        fileSize: s3Metadata.contentLength?.toString() || fileSize, // Use actual S3 size if available
        createdAt: new Date(createdAt),
        uploadedBy,
        ...ownerFields,
      };

      // Use repository to create file with transaction
      const fileRecord = await this.fileRepository.createFile(createFileData, taskId);

      return {
        success: true,
        fileId: fileRecord.id,
        fileName: fileRecord.fileName,
        fileKey: fileRecord.filePath,
      };
    } catch (error) {
      // If database fails, attempt to cleanup S3 file
      try {
        await this.s3Service.deleteFile(fileKey);
        console.log('Successfully cleaned up S3 file after database error');
      } catch (cleanupError) {
        console.error('Failed to cleanup S3 file after database error:', cleanupError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error completing upload',
      };
    }
  }

  async deleteFileById(fileId: string): Promise<FileDeleteResult> {
    try {
      // Use repository to fetch file details
      const file = await this.fileRepository.findFileById(fileId);

      if (!file) {
        throw new NotFoundError('File not found in database');
      }

      // Delete from S3 first
      const s3DeleteResult = await this.s3Service.deleteFile(file.filePath);

      if (!s3DeleteResult.success) {
        // If S3 delete fails due to file not found, continue with DB cleanup
        if (!s3DeleteResult.error?.includes('not found')) {
          return {
            success: false,
            message: 'Failed to delete file from S3',
            error: s3DeleteResult.error,
          };
        }
      }

      // Use repository to delete from database
      await this.fileRepository.deleteFile(fileId);

      return {
        success: true,
        message: `File "${file.fileName}" deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete file',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate download URL using direct SDK (no Lambda/API Gateway)
   * Now supports enhanced options like Content-Disposition for downloads
   */
  async generateDownloadUrl(
    fileId: string,
    options?: {
      expiresIn?: number;
      forceDownload?: boolean; // Set Content-Disposition to attachment
      customFilename?: string;
    }
  ): Promise<FileDownloadResult> {
    try {
      // Use repository to get file details
      const file = await this.fileRepository.findFileById(fileId);

      if (!file) {
        throw new NotFoundError('File not found');
      }

      // Generate download URL from S3 with enhanced options
      const downloadResponse = await this.s3Service.generatePresignedDownloadUrl(file.filePath, {
        expiresIn: options?.expiresIn || 900,
        ...(options?.forceDownload && {
          responseContentDisposition: `attachment; filename="${options?.customFilename || file.fileName}"`,
        }),
      });

      if (!downloadResponse.success) {
        return {
          success: false,
          error: downloadResponse.error,
        };
      }

      return {
        success: true,
        downloadUrl: downloadResponse.downloadUrl,
        fileName: file.fileName,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating download URL',
      };
    }
  }

  async generateDownloadUrlByKey(
    fileKey: string,
    options?: {
      expiresIn?: number;
      fileType?: string;
      forceDownload?: boolean;
      customFilename?: string;
    }
  ): Promise<FileDownloadResult> {
    try {
      // Check if file exists in S3
      const exists = await this.s3Service.doesFileExist(fileKey);
      if (!exists) {
        throw new NotFoundError('File not found in S3');
      }

      // Generate download URL with options
      const downloadResponse = await this.s3Service.generatePresignedDownloadUrl(fileKey, {
        expiresIn: options?.expiresIn || 900,
        responseContentType: options?.fileType,
        ...(options?.forceDownload && {
          responseContentDisposition: `attachment; filename="${options?.customFilename || 'download'}"`,
        }),
      });

      if (!downloadResponse.success) {
        return {
          success: false,
          error: downloadResponse.error,
        };
      }

      return {
        success: true,
        downloadUrl: downloadResponse.downloadUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating download URL',
      };
    }
  }

  async getFileDetails(fileId: string) {
    try {
      const file = await this.fileRepository.findFileById(fileId);

      if (!file) {
        throw new NotFoundError('File not found');
      }

      return file;
    } catch (error) {
      throw error instanceof Error ? error : new InternalServerError('Unknown error fetching file');
    }
  }

  // Additional service methods using repository (unchanged)
  async getFilesByUser(userId: string, options?: { cursor?: string; limit?: number }) {
    return await this.fileRepository.getFilesByUser(userId, options);
  }

  async getFilesByClient(clientId: string, options?: { cursor?: string; limit?: number }) {
    return await this.fileRepository.getFilesByClient(clientId, options);
  }

  async getFilesByTask(taskId: string) {
    return await this.fileRepository.getFilesByTask(taskId);
  }

  async searchFiles(
    query: string,
    options?: { userId?: string; clientId?: string; cursor?: string; limit?: number }
  ) {
    return await this.fileRepository.searchFiles(query, options);
  }

  async getFileStats(userId?: string, clientId?: string) {
    return await this.fileRepository.getFileStats(userId, clientId);
  }

  async checkDuplicateFiles(fileName: string, userId: string, uploadContext: UploadContextType) {
    return await this.fileRepository.findDuplicateFiles(fileName, userId, uploadContext);
  }

  /**
   * Alternative method for server-side uploads (when you have the file buffer)
   * This bypasses presigned URLs entirely for internal operations
   */
  async uploadFileDirectly(
    fileData: FileUploadData,
    fileBuffer: Buffer,
    fileType: string
  ): Promise<FileUploadResult> {
    try {
      const { userId, fileName, uploadContext, taskId, targetClientId, targetUserId } = fileData;

      // Generate file key
      let fileKey: string;
      switch (uploadContext) {
        case UploadContextType.TASK:
          if (!taskId) throw new BadRequestError('taskId required for TASK context');
          fileKey = this.s3Service.generateFileKey(userId, fileName, 'task', taskId);
          break;
        case UploadContextType.CLIENT_PROFILE:
          if (!targetClientId)
            throw new BadRequestError('targetClientId required for CLIENT_PROFILE context');
          fileKey = this.s3Service.generateFileKey(userId, fileName, 'client', targetClientId);
          break;
        case UploadContextType.USER_PROFILE:
          if (!targetUserId)
            throw new BadRequestError('targetUserId required for USER_PROFILE context');
          fileKey = this.s3Service.generateFileKey(userId, fileName, 'user', targetUserId);
          break;
        case UploadContextType.TASK_COMMENT:
          if (!taskId) throw new BadRequestError('taskId required for TASK_COMMENT context');
          fileKey = this.s3Service.generateFileKey(userId, fileName, 'task-comment', taskId);
          break;
        default:
          throw new BadRequestError('Invalid upload context');
      }

      // Upload directly to S3
      const uploadSuccess = await this.s3Service.uploadFileDirectly(fileKey, fileBuffer, fileType, {
        metadata: {
          uploadedBy: fileData.uploadedBy,
          userId: fileData.userId,
          uploadContext: uploadContext.toString(),
          originalFileName: fileName,
        },
      });

      if (!uploadSuccess) {
        return {
          success: false,
          error: 'Failed to upload file to S3',
        };
      }

      // Complete the upload process
      return await this.completeFileUpload(fileData, fileKey);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during direct upload',
      };
    }
  }
}
