import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ClientService } from '../services/client.service';
import { S3BucketService } from '../services/s3Service';
import {
  BadRequestError,
  FileUploadError,
  NotFoundError,
  UpdateClientProfileSchema,
  UpdateProfilePictureSchema,
} from '@wnp/types';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { checkIfClientExists } from '../utils/helperHandlers';
import { hashPW } from '../utils/auth/hashPW';

export class ClientController {
  constructor(
    private readonly clientService: ClientService = new ClientService(),
    private readonly s3Service: S3BucketService = new S3BucketService()
  ) {}

  private handleUpdateProfilePicture = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // main auth object always returns user thus named as such
    const clientId = req.user?.id;
    const file = req.file;
    let fileKey: string | null = null;
    let oldFileKey: string | null = null;

    if (!file || !clientId) {
      throw new BadRequestError('File and ClientId are required');
    }

    try {
      fileKey = this.s3Service.generateFileKey(clientId, file.originalname, 'user');
      const currentClient = await this.clientService.getClientProfile(clientId);
      // safety mechanism to delete old url otherwise it will be wasting our resources
      if (currentClient?.avatarUrl) {
        oldFileKey = currentClient.avatarUrl.split('/').slice(3).join('/');
      }
      const preSignedURl = await this.s3Service.generatePresignedUrl(fileKey, file.mimetype);
      const s3UploadedFileResponse = await fetch(preSignedURl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.mimetype,
        },
        body: file.buffer,
      });
      if (!s3UploadedFileResponse.ok) {
        throw new FileUploadError('Failed to upload file to S3', {
          statusCode: s3UploadedFileResponse.status,
          fileName: file.originalname,
        });
      }

      const profileUrl = this.s3Service.generateCloudFrontUrl(fileKey);

      const parsedInput = UpdateProfilePictureSchema.parse({
        id: clientId,
        profileUrl,
      });
      try {
        const updatedClient = await this.clientService.updateProfilePicture(
          parsedInput.id,
          parsedInput.profileUrl
        );
        if (oldFileKey) {
          await this.s3Service.deleteFile(oldFileKey);
          logger.info(`Successfully deleted old profile picture: ${oldFileKey}`);
        }
        res.status(200).json(updatedClient);
      } catch (dbError) {
        if (fileKey) {
          try {
            await this.s3Service.deleteFile(fileKey);
            logger.info(`Cleaned up S3 file ${fileKey} after database update failure`);
          } catch (cleanupError) {
            logger.error('Failed to cleanup S3 file after database error:', {
              fileKey,
              error: cleanupError,
            });
          }
        }
        // Re-throw the original error
        throw dbError;
      }
    } catch (error) {
      if (fileKey) {
        try {
          await this.s3Service.deleteFile(fileKey);
          logger.info(`Cleaned up S3 file ${fileKey} after error`);
        } catch (cleanupError) {
          logger.error('Failed to cleanup S3 file:', {
            fileKey,
            error: cleanupError,
          });
        }
      }
      next(error);
    }
  };

  private handleGetClientProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = req.user?.id;
      if (!clientId) {
        throw new BadRequestError('Client ID is required');
      }
      await checkIfClientExists(clientId);
      const client = await this.clientService.getClientProfile(clientId);
      if (!client) {
        throw new NotFoundError('Client not found');
      }
      res.status(200).json(client);
    } catch (error) {
      next(error);
    }
  };

  private handleUpdateProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const clientId = req.user?.id;
      if (!clientId) {
        throw new BadRequestError('Client Id is required');
      }
      await checkIfClientExists(clientId);
      const parsedClient =
        Object.keys(req.body).length > 0
          ? UpdateClientProfileSchema.partial().parse({ id: clientId, ...req.body })
          : null;
      let updateData = parsedClient;
      if (parsedClient && parsedClient.passwordHash) {
        const hashedPassword = await hashPW(parsedClient.passwordHash);
        updateData = {
          ...parsedClient,
          passwordHash: hashedPassword,
        };
      }
      const updatedClient = await this.clientService.updateProfile({
        ...updateData,
        id: clientId,
      });
      res.status(200).json(updatedClient);
    } catch (error) {
      next(error);
    }
  };

  updateProfilePicture = asyncHandler(this.handleUpdateProfilePicture);
  getClientProfile = asyncHandler(this.handleGetClientProfile);
  updateProfile = asyncHandler(this.handleUpdateProfile);
}
