import { DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { InternalServerError } from '@wnp/types';
import { config } from 'dotenv';
import path from 'path';

export class S3BucketService {
  private s3Client: S3Client;
  private secretsClient: SecretsManagerClient;
  private bucket: string;
  private cloudFrontDomain: string;
  constructor() {
    // Ensure environment variables are loaded
    config({ path: path.resolve(process.cwd(), '.env') });

    // Validate required environment variables
    this.validateEnvironmentVariables();
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'use-east-1',
    });
    this.secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucket = process.env.S3_BUCKET_NAME!;
    this.cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN!;
  }
  getCloudFrontDomain() {
    return this.cloudFrontDomain;
  }
  async getApiGatewayUrl(secretName = process.env.API_GATEWAY_SECRET_NAME!): Promise<void> {
    const secretResponse = await this.secretsClient.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: 'AWSCURRENT',
      })
    );
    if (!secretResponse) {
      throw new InternalServerError('failed to fetch api gateway url');
    }
    const secretValue = secretResponse?.SecretString ? JSON.parse(secretResponse.SecretString) : {};
    return secretValue?.apiGateUrl ?? '';
  }
  async generatePresignedUrl(fileKey: string, fileType: string): Promise<string> {
    const apiGatewayUrl = await this.getApiGatewayUrl();
    const uploadFileURLResponse = await fetch(`${apiGatewayUrl}generate-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey, fileType }),
    });
    if (!uploadFileURLResponse.ok) {
      throw new Error('Failed to generate presigned url');
    }

    const { uploadUrl } = await uploadFileURLResponse.json();
    return uploadUrl;
  }
  async doesFileExists(fileKey: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: fileKey,
        })
      );
      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }
  async deleteFile(fileKey: string): Promise<void> {
    await this.doesFileExists(fileKey);

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    await this.s3Client.send(command);
  }

  generateFileKey(
    userId: string,
    fileName: string,
    type: 'user' | 'task',
    taskId?: string
  ): string {
    const sanitizedFileName = this.sanitizeFileName(fileName);
    return type === 'user'
      ? `users/${userId}/profile/${sanitizedFileName}`
      : `tasks/${taskId}/users/${userId}/${sanitizedFileName}`;
  }
  private validateEnvironmentVariables() {
    const requiredEnvVars = ['AWS_REGION', 'S3_BUCKET_NAME', 'CLOUDFRONT_DOMAIN'];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
  }

  generateCloudFrontUrl(fileKey: string): string {
    if (!this.cloudFrontDomain) {
      throw new Error('CloudFront domain not configured');
    }
    return `https://${this.cloudFrontDomain}/${fileKey}`;
  }
  private sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-')
      .replace(/-+/g, '-');
  }
}
