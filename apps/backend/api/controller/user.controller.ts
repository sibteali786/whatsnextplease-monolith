import { FileUploadError } from '@wnp/types';
import { BadRequestError, UpdateProfilePictureSchema } from '@wnp/types';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { S3BucketService } from '../services/s3Service';
import { logger } from '../utils/logger';

export class UserController {
  constructor(
    private readonly userService: UserService = new UserService(),
    private readonly s3Service: S3BucketService = new S3BucketService()
  ) {}
  private handleUpdateProfilePicture = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    const file = req.file;

    logger.debug(
      {
        userId,
        filename: file?.originalname,
      },
      'User ID: '
    );
    if (!file || !userId) {
      throw new BadRequestError('File and userId are required');
    }

    try {
      // Generate file key for S3
      const fileKey = this.s3Service.generateFileKey(userId, file.originalname, 'user');
      // Get presigned URL and upload
      const presignedUrl = await this.s3Service.generatePresignedUrl(fileKey, file.mimetype);

      // Upload to S3
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.mimetype },
        body: file.buffer,
      });

      if (!uploadResponse.ok) {
        throw new FileUploadError('Failed to upload file to S3', {
          statusCode: uploadResponse.status,
          fileName: file.originalname,
        });
      }

      // Generate profile URL
      const profileUrl = this.s3Service.generateCloudFrontUrl(fileKey);

      // Validate input
      const parsedInput = UpdateProfilePictureSchema.parse({
        id: userId,
        profileUrl,
      });

      // Update database
      const updatedUser = await this.userService.updateProfilePicture(
        parsedInput.id,
        parsedInput.profileUrl
      );

      res.status(201).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };

  updateProfilePicture = asyncHandler(this.handleUpdateProfilePicture);
}
