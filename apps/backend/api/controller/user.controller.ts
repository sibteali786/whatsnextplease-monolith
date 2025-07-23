import { FileUploadError, NotFoundError, UpdateProfileSchema } from '@wnp/types';
import { BadRequestError, UpdateProfilePictureSchema } from '@wnp/types';
import { NextFunction, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { S3BucketService } from '../services/s3Service';
import { checkIfUserExists } from '../utils/helperHandlers';
import { logger } from '../utils/logger';
import { hashPW } from '../utils/auth/hashPW';

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
    let oldFileKey: string | null = null;

    if (!file || !userId) {
      throw new BadRequestError('File and userId are required');
    }

    try {
      // Generate file key for S3
      fileKey = this.s3Service.generateFileKey(userId, file.originalname, 'user');
      const currentUser = await this.userService.getUserProfile(userId);
      if (currentUser?.avatarUrl) {
        // Extract the file key from the CloudFront URL
        oldFileKey = currentUser.avatarUrl.split('/').slice(3).join('/');
        const cloudFrontDomain = this.s3Service.getCloudFrontDomain();
        if (cloudFrontDomain && currentUser.avatarUrl.includes(cloudFrontDomain)) {
          try {
            // Extract the file key from the CloudFront URL
            oldFileKey = currentUser.avatarUrl.split('/').slice(3).join('/');
            // Check if file exists before trying to delete it
            const fileExists = await this.s3Service.doesFileExist(oldFileKey);
            if (!fileExists) {
              logger.warn(`Old profile picture not found in S3: ${oldFileKey}`);
              oldFileKey = null; // Reset to avoid deletion attempt
            }
          } catch (error) {
            // Log but continue - we don't want to fail the whole operation
            // if we just can't check the old file
            if (error instanceof Error) {
              logger.warn(`Failed to check if old profile picture exists: ${error.message}`);
            }
            oldFileKey = null; // Reset to avoid deletion attempt
          }
        } else {
          logger.info(
            `Current avatar is from external source, not deleting: ${currentUser.avatarUrl}`
          );
        }
      }
      // Get presigned URL and upload
      const presignedUrl = await this.s3Service.generatePresignedUploadUrl(fileKey, file.mimetype);

      if (presignedUrl && presignedUrl?.uploadUrl) {
        // Upload to S3
        const uploadResponse = await fetch(presignedUrl.uploadUrl, {
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
        if (oldFileKey) {
          await this.s3Service.deleteFile(oldFileKey);
          logger.info(`Successfully deleted old profile picture: ${oldFileKey}`);
        }
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

  private handleUpdateProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      await checkIfUserExists(userId);
      const parsedUser =
        Object.keys(req.body).length > 0
          ? UpdateProfileSchema.partial().parse({
              // Use .partial() to make all fields optional
              id: userId,
              ...req.body,
            })
          : null;
      let updateData = parsedUser;
      if (parsedUser && parsedUser.passwordHash) {
        const hashedPassword = await hashPW(parsedUser.passwordHash);
        updateData = {
          ...updateData,
          passwordHash: hashedPassword,
        };
      }
      // Update user profile
      const updatedUser = await this.userService.updateProfile({
        ...updateData,
        id: userId,
      });
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };
  private handleDeleteUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.params.id;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      // Check if user exists before attempting to delete
      await checkIfUserExists(userId);

      await this.userService.deleteUser(userId);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfilePicture = asyncHandler(this.handleUpdateProfilePicture);
  getUserProfile = asyncHandler(this.handleGetUserProfile);
  updateProfile = asyncHandler(this.handleUpdateProfile);
  deleteUser = asyncHandler(this.handleDeleteUser);
}
