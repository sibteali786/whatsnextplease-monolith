/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import {
  CreateNotificationDtoSchema,
  NotificationResponse,
  NotificationListResponse,
  NotificationMarkAsReadResponse,
  NotificationMarkAllAsReadResponse,
  NotificationMarkAsReadParams,
  NotificationMarkAllAsReadParams,
  NotificationMarkAllAsReadResponseSchema,
  NotificationMarkAsReadResponseSchema,
} from '@wnp/types';
import { sseManager } from '../utils/SSEManager';
import { Roles } from '@prisma/client';
import { GetNotificationInputParams } from '@wnp/types';
import { BadRequestError } from '@wnp/types';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { NotificationPayload } from '../services/notificationDelivery.service';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService = new NotificationService()
  ) {}

  // Handler implementations
  private handleSubscribe = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.params.userId;
    const { tabId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    logger.info(
      {
        userId,
        tabId,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
      'SSE subscription request received'
    );

    // Set proper SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add client to SSE manager with tab support
    sseManager.addClient(userId, res, connectionId, tabId as string);

    // Handle client disconnect events
    const cleanup = () => {
      logger.info({ userId, connectionId, tabId }, 'SSE client disconnected');
      sseManager.removeClient(userId, connectionId);
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('close', cleanup);
    res.on('error', error => {
      logger.error({ userId, connectionId, tabId, error }, 'SSE connection error');
      cleanup();
    });
  };

  private handleCreate = async (
    req: Request,
    res: Response<NotificationResponse>,
    _next: NextFunction
  ): Promise<void> => {
    const validatedData = CreateNotificationDtoSchema.parse(req.body);
    if (!validatedData.userId && !validatedData.clientId) {
      throw new BadRequestError('Either userId or clientId must be provided');
    }
    const notification = await this.notificationService.createNotification(validatedData);
    const notificationPayload: NotificationPayload = {
      type: validatedData.type,
      message: validatedData.message,
      data: validatedData.data || {},
    };
    await this.notificationService.deliverNotification(notificationPayload, validatedData);
    await this.notificationService.updateDeliveryStatus(notification.id);
    res.sendStatus(201);
  };

  private handleGetUserNotifications = async (
    req: Request,
    res: Response<NotificationListResponse>,
    _next: NextFunction
  ): Promise<void> => {
    const { role, userId } = GetNotificationInputParams.parse({
      userId: req.params.userId,
      role: req.query.role,
    });

    const notifications = await this.notificationService.getUserNotifications(
      userId,
      role as Roles
    );

    res.json({
      notifications,
      total: notifications.length,
    });
  };

  private handleMarkAsRead = async (
    req: Request,
    res: Response<NotificationMarkAsReadResponse>,
    _next: NextFunction
  ): Promise<void> => {
    const { id } = NotificationMarkAsReadParams.parse({
      id: req.params.id,
    });

    const notification = await this.notificationService.markAsRead(id);
    const validatedResponse = NotificationMarkAsReadResponseSchema.parse(notification);
    res.status(200).json(validatedResponse);
  };

  private handleMarkAllAsRead = async (
    req: Request,
    res: Response<NotificationMarkAllAsReadResponse>,
    _next: NextFunction
  ): Promise<void> => {
    const { userId, role } = NotificationMarkAllAsReadParams.parse({
      userId: req.params.userId,
      role: req.query.role,
    });

    const result = await this.notificationService.markAllAsRead(userId, role as Roles);

    const response = NotificationMarkAllAsReadResponseSchema.parse({
      count: result.count,
      message: `Successfully marked ${result.count} notifications as read`,
    });

    res.status(200).json(response);
  };

  // Public route handlers wrapped with asyncHandler
  subscribe = asyncHandler(this.handleSubscribe);
  create = asyncHandler(this.handleCreate);
  getUserNotifications = asyncHandler(this.handleGetUserNotifications);
  markAsRead = asyncHandler(this.handleMarkAsRead);
  markAllAsRead = asyncHandler(this.handleMarkAllAsRead);
}
