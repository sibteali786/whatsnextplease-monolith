import { FileUploadError, NotFoundError } from '@wnp/types';
import { BadRequestError, UpdateProfilePictureSchema } from '@wnp/types';
import { NextFunction, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { S3BucketService } from '../services/s3Service';
import { checkIfUserExists } from '../utils/helperHandlers';
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
    let fileKey: string | null = null; // Track fileKey for cleanup

    if (!file || !userId) {
      throw new BadRequestError('File and userId are required');
    }

    try {
      // Generate file key for S3
      fileKey = this.s3Service.generateFileKey(userId, file.originalname, 'user');

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

      try {
        // Update database
        const updatedUser = await this.userService.updateProfilePicture(
          parsedInput.id,
          parsedInput.profileUrl
        );
        res.status(201).json(updatedUser);
      } catch (dbError) {
        // If database update fails, cleanup the uploaded file
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
      // For any other errors in the outer try block
      // (like upload failures, validation errors, etc.)
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

  private handleGetUserProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Get user ID from request
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      await checkIfUserExists(userId);
      // Get user profile
      const user = await this.userService.getUserProfile(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };

  updateProfilePicture = asyncHandler(this.handleUpdateProfilePicture);
  getUserProfile = asyncHandler(this.handleGetUserProfile);
}
