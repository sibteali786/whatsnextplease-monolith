import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import {
  CreateNotificationDtoSchema,
  NotificationResponse,
  ErrorResponse,
  NotificationListResponse,
  NotificationResponseSchema,
  ErrorResponseSchema,
  NotificationListResponseSchema,
  NotificationMarkAsReadParams,
  NotificationMarkAsReadResponse,
  NotificationMarkAsReadResponseSchema,
  NotificationMarkAllAsReadParams,
  NotificationMarkAllAsReadResponse,
  NotificationMarkAllAsReadResponseSchema,
} from '@wnp/types';
import { sseManager } from '../utils/SSEManager';
import { ZodError } from 'zod';
import { Roles } from '@prisma/client';
import { GetNotificationInputParams } from '@wnp/types';
import { logger } from '../utils/logger';

export class NotificationController {
  private notificationService: NotificationService;

  constructor(notificationService?: NotificationService) {
    // If none passed in, default to a new NotificationService
    this.notificationService = notificationService ?? new NotificationService();
  }

  subscribe = async (req: Request, res: Response<never | ErrorResponse>) => {
    try {
      const userId = req.params.userId;
      sseManager.addClient(userId, res);
      return;
    } catch (error) {
      const errorResponse = ErrorResponseSchema.parse({
        error: 'Subscription failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json(errorResponse);
      return;
    }
  };

  create = async (req: Request, res: Response<NotificationResponse | ErrorResponse>) => {
    try {
      const validatedData = CreateNotificationDtoSchema.parse(req.body);

      // Ensure at least one of userId or clientId is provided
      if (!validatedData.userId && !validatedData.clientId) {
        const errorResponse = ErrorResponseSchema.parse({
          error: 'Validation error',
          message: 'Either userId or clientId must be provided',
        });
        res.status(400).json(errorResponse);
        return;
      }

      const notification = await this.notificationService.create(validatedData);
      const validatedResponse = NotificationResponseSchema.parse(notification);

      res.status(201).json(validatedResponse);
    } catch (error) {
      console.error(error);
      if (error instanceof ZodError) {
        const errorResponse = ErrorResponseSchema.parse({
          error: 'Validation error',
          message: error.errors.map(e => e.message).join(', '),
        });
        res.status(400).json(errorResponse);
        return;
      }

      console.error('Notification creation error:', error);
      const errorResponse = ErrorResponseSchema.parse({
        error: 'Failed to create notification',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json(errorResponse);
      return;
    }
  };

  getUserNotifications = async (
    req: Request,
    res: Response<NotificationListResponse | ErrorResponse>
  ) => {
    try {
      const userIdFromParams = req.params.userId;
      const roleFromQuery = req.query.role;
      const { role, userId } = GetNotificationInputParams.parse({
        userId: userIdFromParams,
        role: roleFromQuery,
      });
      const notifications = await this.notificationService.getUserNotifications(
        userId,
        role as Roles
      );
      const validatedResponse = NotificationListResponseSchema.parse({
        notifications,
        total: notifications.length,
      });

      res.json(validatedResponse);
      return;
    } catch (error) {
      console.log(error);
      if (error instanceof ZodError) {
        const errorResponse = ErrorResponseSchema.parse({
          error: 'Validation error',
          message: error.errors.map(e => e.message).join(', '),
        });
        res.status(400).json(errorResponse);
        return;
      }
      if (error instanceof Error) {
        const errorResponse = ErrorResponseSchema.parse({
          error: 'Failed to fetch notifications',
          message: error.message,
        });
        res.status(500).json(errorResponse);
        return;
      }
    }
  };

  markAsRead = async (
    req: Request,
    res: Response<NotificationMarkAsReadResponse | ErrorResponse>
  ) => {
    try {
      const notificationIdFromParams = req.params.id;
      const { id } = NotificationMarkAsReadParams.parse({
        id: notificationIdFromParams,
      });

      const notification = await this.notificationService.markAsRead(id);
      const validatedResponse = NotificationMarkAsReadResponseSchema.parse(notification);
      res.status(200).json(validatedResponse);
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorResponse = ErrorResponseSchema.parse({
          error: 'Validation error',
          message: error.errors[0].message,
        });

        res.status(400).json(errorResponse);
        return;
      }

      console.error('Mark as read error:', error);
      const errorResponse = ErrorResponseSchema.parse({
        error: 'Failed to mark notification as read',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json(errorResponse);
      return;
    }
  };
  markAllAsRead = async (
    req: Request,
    res: Response<NotificationMarkAllAsReadResponse | ErrorResponse>
  ) => {
    try {
      const userIdFromParams = req.params.userId;
      const roleFromQuery = req.query.role;

      // Validate input parameters
      const { userId, role } = NotificationMarkAllAsReadParams.parse({
        userId: userIdFromParams,
        role: roleFromQuery,
      });

      const result = await this.notificationService.markAllAsRead(userId, role as Roles);

      const validatedResponse = NotificationMarkAllAsReadResponseSchema.parse({
        count: result.count,
        message: `Successfully marked ${result.count} notifications as read`,
      });

      res.status(200).json(validatedResponse);
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorResponse = ErrorResponseSchema.parse({
          error: 'Validation error',
          message: error.errors.map(e => e.message).join(', '),
        });
        res.status(400).json(errorResponse);
        return;
      }

      logger.error('Mark all as read error:', error);
      const errorResponse = ErrorResponseSchema.parse({
        error: 'Failed to mark all notifications as read',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      // If the error is about user/client not found, return 404
      if (
        error instanceof Error &&
        (error.message === 'User not found' || error.message === 'Client not found')
      ) {
        res.status(404).json(errorResponse);
        return;
      }

      res.status(500).json(errorResponse);
      return;
    }
  };
}
