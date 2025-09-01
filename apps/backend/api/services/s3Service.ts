/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from 'dotenv';
import path from 'path';

export interface UploadResponse {
  success: boolean;
  uploadUrl?: string;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  error?: string;
}

export interface DownloadUrlResponse {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export class S3BucketService {
  private s3Client: S3Client;
  private bucket: string;
  private cloudFrontDomain: string;

  constructor() {
    config({ path: path.resolve(process.cwd(), '.env') });
    this.validateEnvironmentVariables();

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.bucket = process.env.S3_BUCKET_NAME!;
    this.cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN!;
  }

  getCloudFrontDomain(): string {
    return this.cloudFrontDomain;
  }

  /**
   * Generate presigned upload URL directly using AWS SDK
   * This replaces the API Gateway + Lambda approach
   */
  async generatePresignedUploadUrl(
    fileKey: string,
    fileType: string,
    options?: {
      expiresIn?: number; // seconds, default 900 (15 minutes)
      contentLength?: number;
      metadata?: Record<string, string>;
    }
  ): Promise<UploadResponse> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        ContentType: fileType,
        ...(options?.contentLength && { ContentLength: options.contentLength }),
        ...(options?.metadata && { Metadata: options.metadata }),
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options?.expiresIn || 900, // 15 minutes default
        // Sign the Content-Type header to prevent tampering
        signableHeaders: new Set(['content-type']),
      });

      return { success: true, uploadUrl };
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      return {
        success: false,
        error: `Error generating presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate presigned download URL directly using AWS SDK
   * This replaces the API Gateway + Lambda approach
   */
  async generatePresignedDownloadUrl(
    fileKey: string,
    options?: {
      expiresIn?: number; // seconds, default 900 (15 minutes)
      responseContentType?: string;
      responseContentDisposition?: string; // e.g., 'attachment; filename="example.pdf"'
      versionId?: string;
    }
  ): Promise<DownloadUrlResponse> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        ...(options?.responseContentType && { ResponseContentType: options.responseContentType }),
        ...(options?.responseContentDisposition && {
          ResponseContentDisposition: options.responseContentDisposition,
        }),
        ...(options?.versionId && { VersionId: options.versionId }),
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options?.expiresIn || 900, // 15 minutes default
      });

      return { success: true, downloadUrl };
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      return {
        success: false,
        error: `Error generating download URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Upload file directly to S3 (alternative to presigned URLs for server-side uploads)
   */
  async uploadFileDirectly(
    fileKey: string,
    fileBuffer: Buffer,
    contentType: string,
    options?: {
      metadata?: Record<string, string>;
      cacheControl?: string;
      contentDisposition?: string;
    }
  ): Promise<boolean> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType,
        ...(options?.metadata && { Metadata: options.metadata }),
        ...(options?.cacheControl && { CacheControl: options.cacheControl }),
        ...(options?.contentDisposition && { ContentDisposition: options.contentDisposition }),
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error uploading file directly to S3:', error);
      return false;
    }
  }

  async doesFileExist(fileKey: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: fileKey,
        })
      );
      return true;
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async deleteFile(fileKey: string): Promise<DeleteResponse> {
    try {
      // Check if file exists first
      const exists = await this.doesFileExist(fileKey);
      if (!exists) {
        return {
          success: false,
          error: 'File not found in S3',
        };
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get file metadata without downloading
   */
  async getFileMetadata(fileKey: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  generateFileKey(
    userId: string,
    fileName: string,
    context: 'user' | 'task' | 'client' | 'task-comment',
    contextId?: string
  ): string {
    const sanitizedFileName = this.sanitizeFileName(fileName);

    switch (context) {
      case 'user':
        return `users/${userId}/profile/${sanitizedFileName}`;
      case 'task':
        if (!contextId) throw new Error('TaskId required for task context');
        return `tasks/${contextId}/users/${userId}/${sanitizedFileName}`;
      case 'client':
        if (!contextId) throw new Error('ClientId required for client context');
        return `clients/${contextId}/uploaded-by/${userId}/${sanitizedFileName}`;
      case 'task-comment':
        if (!contextId) throw new Error('TaskId required for task-comment context');
        return `tasks/${contextId}/comments/${userId}/${sanitizedFileName}`;
      default:
        throw new Error('Invalid file context');
    }
  }

  generateCloudFrontUrl(fileKey: string): string {
    if (!this.cloudFrontDomain) {
      throw new Error('CloudFront domain not configured');
    }
    return `https://${this.cloudFrontDomain}/${fileKey}`;
  }

  private sanitizeFileName(fileName: string): string {
    const parts = fileName.split('.');
    const extension = parts.pop();
    const name = parts.join('.');

    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return extension ? `${sanitizedName}.${extension}` : sanitizedName;
  }

  private validateEnvironmentVariables(): void {
    const requiredEnvVars = ['AWS_REGION', 'S3_BUCKET_NAME', 'CLOUDFRONT_DOMAIN'];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
  }
}
