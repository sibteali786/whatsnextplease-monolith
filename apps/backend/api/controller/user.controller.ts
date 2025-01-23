import { UpdateProfilePictureSchema } from '@wnp/types';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  constructor(private readonly userService: UserService = new UserService()) {}
  private async handleUpdateProfilePicture(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const id = req.user?.id;
    const profileUrl = req.body.profileUrl;
    const parsedInputValues = UpdateProfilePictureSchema.parse({
      id,
      profileUrl,
    });

    const updatedProfilePictureUrl = await this.userService.updateProfilePicture(
      parsedInputValues.id,
      parsedInputValues.profileUrl
    );
    res.status(201).json(updatedProfilePictureUrl);
  }

  updateProfilePicture = asyncHandler(this.handleUpdateProfilePicture);
}
