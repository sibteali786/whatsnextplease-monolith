import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserService } from '../services/user.service';
import { ClientService } from '../services/client.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { BadRequestError, NotFoundError } from '@wnp/types';
import { checkIfUserExists, checkIfClientExists } from '../utils/helperHandlers';

export class EntityController {
  constructor(
    private readonly userService: UserService = new UserService(),
    private readonly clientService: ClientService = new ClientService()
  ) {}

  private handleDeleteEntity = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const entityId = req.params.id;
      const entityType = req.params.type;

      if (!entityId) {
        throw new BadRequestError('Entity ID is required');
      }

      if (!['user', 'client'].includes(entityType)) {
        throw new BadRequestError('Invalid entity type. Must be "user" or "client"');
      }

      if (entityType === 'user') {
        await checkIfUserExists(entityId);
        await this.userService.deleteUser(entityId);
        res.status(200).json({
          success: true,
          message: 'User deleted successfully',
        });
      } else if (entityType === 'client') {
        await checkIfClientExists(entityId);
        await this.clientService.deleteClient(entityId);
        res.status(200).json({
          success: true,
          message: 'Client deleted successfully',
        });
      }
    } catch (error) {
      next(error);
    }
  };

  private handleGetEntityProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const entityId = req.params.id;
      const entityType = req.params.type;

      if (!entityId) {
        throw new BadRequestError('Entity ID is required');
      }

      if (!['user', 'client'].includes(entityType)) {
        throw new BadRequestError('Invalid entity type. Must be "user" or "client"');
      }

      let result;
      if (entityType === 'user') {
        await checkIfUserExists(entityId);
        result = await this.userService.getUserProfile(entityId);
      } else if (entityType === 'client') {
        await checkIfClientExists(entityId);
        result = await this.clientService.getClientProfile(entityId);
      }

      if (!result) {
        throw new NotFoundError(entityType === 'user' ? 'User' : 'Client');
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // Add more unified methods as needed

  // Expose handlers with asyncHandler
  deleteEntity = asyncHandler(this.handleDeleteEntity);
  getEntityProfile = asyncHandler(this.handleGetEntityProfile);
}
