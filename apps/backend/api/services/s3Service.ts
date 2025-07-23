/* eslint-disable @typescript-eslint/no-explicit-any */
import { DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { InternalServerError } from '@wnp/types';
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
  private secretsClient: SecretsManagerClient;
  private bucket: string;
  private cloudFrontDomain: string;

  constructor() {
    config({ path: path.resolve(process.cwd(), '.env') });
    this.validateEnvironmentVariables();

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucket = process.env.S3_BUCKET_NAME!;
    this.cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN!;
  }

  getCloudFrontDomain(): string {
    return this.cloudFrontDomain;
  }

  async getApiGatewayUrl(secretName = process.env.API_GATEWAY_SECRET_NAME!): Promise<string> {
    try {
      const secretResponse = await this.secretsClient.send(
        new GetSecretValueCommand({
          SecretId: secretName,
          VersionStage: 'AWSCURRENT',
        })
      );

      if (!secretResponse?.SecretString) {
        throw new InternalServerError('Empty secret response');
      }

      const secretValue = JSON.parse(secretResponse.SecretString);
      const apiUrl = secretValue?.apiGateUrl;

      if (!apiUrl) {
        throw new InternalServerError('API Gateway URL not found in secret');
      }

      return apiUrl;
    } catch (error) {
      console.error('Failed to get API Gateway URL:', error);
      throw new InternalServerError('Failed to retrieve API Gateway URL');
    }
  }

  async generatePresignedUploadUrl(fileKey: string, fileType: string): Promise<UploadResponse> {
    try {
      const apiGatewayUrl = await this.getApiGatewayUrl();

      const response = await fetch(`${apiGatewayUrl}generate-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey, fileType }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to generate presigned URL: ${response.statusText}`,
        };
      }

      const { uploadUrl } = await response.json();
      return { success: true, uploadUrl };
    } catch (error) {
      return {
        success: false,
        error: `Error generating presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async generatePresignedDownloadUrl(
    fileKey: string,
    fileType?: string
  ): Promise<DownloadUrlResponse> {
    try {
      const apiGatewayUrl = await this.getApiGatewayUrl();

      const response = await fetch(`${apiGatewayUrl}generate-download-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey, fileType }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to generate download URL: ${response.statusText}`,
        };
      }

      const { downloadUrl } = await response.json();
      return { success: true, downloadUrl };
    } catch (error) {
      return {
        success: false,
        error: `Error generating download URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async uploadFileToS3(uploadUrl: string, file: Buffer, contentType: string): Promise<boolean> {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });

      return response.ok;
    } catch (error) {
      console.error('Error uploading to S3:', error);
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

  generateFileKey(
    userId: string,
    fileName: string,
    context: 'user' | 'task' | 'client',
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
    // Keep original extension and make filename safe
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
    const requiredEnvVars = [
      'AWS_REGION',
      'S3_BUCKET_NAME',
      'CLOUDFRONT_DOMAIN',
      'API_GATEWAY_SECRET_NAME',
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
  }
}
