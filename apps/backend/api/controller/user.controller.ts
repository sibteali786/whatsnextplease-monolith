import { FileUploadError, NotFoundError, UnauthorizedError, UpdateProfileSchema } from '@wnp/types';
import { BadRequestError, UpdateProfilePictureSchema } from '@wnp/types';
import { NextFunction, Response } from 'express';
import { RoleFilter, UserService } from '../services/user.service';
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
          body: new Blob([new Uint8Array(file.buffer)]),
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

  /**
   * Get all users with roles for permission management
   * Only accessible by SUPER_USER
   */
  getUsersWithRolesHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Cap at 100
    const searchTerm = (req.query.search as string) || '';
    const roleFilter = (req.query.role as RoleFilter) || '';
    const result = await this.userService.getUsersWithRoles(page, limit, searchTerm, roleFilter);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  });

  /**
   * Update user role
   * Only accessible by SUPER_USER
   */
  updateUserRoleHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const { roleId } = req.body;
    const updatedByUserId = req.user?.id;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: 'Role ID is required',
      });
    }

    if (!updatedByUserId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const result = await this.userService.updateUserRole(userId, roleId, updatedByUserId);

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  });

  /**
   * Get available roles for dropdown
   * Only accessible by SUPER_USER
   */
  getAvailableRolesHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.userService.getAvailableRoles();

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data,
        message: result.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  });
  handleGetCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const user = await this.userService.getCurrentUserProfile(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: user,
      message: 'Current user profile retrieved successfully',
    });
  };

  /**
   * Search users for mentions functionality
   * GET /users/search?q=query&role=optional_role
   */
  searchUsersForMentionsHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = (req.query.q as string) || '';
    const roleFilter = req.query.role as string;
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }
    if (query.length < 2) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Query too short, minimum 2 characters required',
      });
    }
    const result = await this.userService.searchUsersForMentions(
      query,
      requestingUserId,
      roleFilter
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data,
        message: result.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  });
  updateProfilePicture = asyncHandler(this.handleUpdateProfilePicture);
  getUserProfile = asyncHandler(this.handleGetUserProfile);
  updateProfile = asyncHandler(this.handleUpdateProfile);
  deleteUser = asyncHandler(this.handleDeleteUser);
  getUsersWithRoles = asyncHandler(this.getUsersWithRolesHandler);
  updateUserRole = asyncHandler(this.updateUserRoleHandler);
  getAvailableRoles = asyncHandler(this.getAvailableRolesHandler);
  getCurrentUser = asyncHandler(this.handleGetCurrentUser);
  searchUsersForMentions = asyncHandler(this.searchUsersForMentionsHandler);
}
