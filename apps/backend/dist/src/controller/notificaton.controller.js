"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("../services/notification.service");
const src_1 = require("@wnp/types/src");
const SSEManager_1 = require("../utils/SSEManager");
const zod_1 = require("zod");
const src_2 = require("@wnp/types/src");
class NotificationController {
    notificationService;
    constructor(notificationService) {
        // If none passed in, default to a new NotificationService
        this.notificationService = notificationService ?? new notification_service_1.NotificationService();
    }
    subscribe = async (req, res) => {
        try {
            const userId = req.params.userId;
            SSEManager_1.sseManager.addClient(userId, res);
            return;
        }
        catch (error) {
            const errorResponse = src_1.ErrorResponseSchema.parse({
                error: "Subscription failed",
                message: error instanceof Error ? error.message : "Unknown error",
            });
            res.status(500).json(errorResponse);
            return;
        }
    };
    create = async (req, res) => {
        try {
            const validatedData = src_1.CreateNotificationDtoSchema.parse(req.body);
            // Ensure at least one of userId or clientId is provided
            if (!validatedData.userId && !validatedData.clientId) {
                const errorResponse = src_1.ErrorResponseSchema.parse({
                    error: "Validation error",
                    message: "Either userId or clientId must be provided",
                });
                res.status(400).json(errorResponse);
                return;
            }
            const notification = await this.notificationService.create(validatedData);
            const validatedResponse = src_1.NotificationResponseSchema.parse(notification);
            res.status(201).json(validatedResponse);
        }
        catch (error) {
            console.error(error);
            if (error instanceof zod_1.ZodError) {
                const errorResponse = src_1.ErrorResponseSchema.parse({
                    error: "Validation error",
                    message: error.errors.map((e) => e.message).join(", "),
                });
                res.status(400).json(errorResponse);
                return;
            }
            console.error("Notification creation error:", error);
            const errorResponse = src_1.ErrorResponseSchema.parse({
                error: "Failed to create notification",
                message: error instanceof Error ? error.message : "Unknown error",
            });
            res.status(500).json(errorResponse);
            return;
        }
    };
    getUserNotifications = async (req, res) => {
        try {
            const userIdFromParams = req.params.userId;
            const roleFromQuery = req.query.role;
            const { role, userId } = src_2.GetNotificationInputParams.parse({
                userId: userIdFromParams,
                role: roleFromQuery,
            });
            const notifications = await this.notificationService.getUserNotifications(userId, role);
            const validatedResponse = src_1.NotificationListResponseSchema.parse({
                notifications,
                total: notifications.length,
            });
            res.json(validatedResponse);
            return;
        }
        catch (error) {
            console.log(error);
            if (error instanceof zod_1.ZodError) {
                const errorResponse = src_1.ErrorResponseSchema.parse({
                    error: "Validation error",
                    message: error.errors.map((e) => e.message).join(", "),
                });
                res.status(400).json(errorResponse);
                return;
            }
            if (error instanceof Error) {
                const errorResponse = src_1.ErrorResponseSchema.parse({
                    error: "Failed to fetch notifications",
                    message: error.message,
                });
                res.status(500).json(errorResponse);
                return;
            }
        }
    };
    markAsRead = async (req, res) => {
        try {
            const notificationIdFromParams = req.params.id;
            const { id } = src_1.NotificationMarkAsReadParams.parse({
                id: notificationIdFromParams,
            });
            const notification = await this.notificationService.markAsRead(id);
            const validatedResponse = src_1.NotificationMarkAsReadResponseSchema.parse(notification);
            res.status(200).json(validatedResponse);
            return;
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorResponse = src_1.ErrorResponseSchema.parse({
                    error: "Validation error",
                    message: error.errors[0].message,
                });
                res.status(400).json(errorResponse);
                return;
            }
            console.error("Mark as read error:", error);
            const errorResponse = src_1.ErrorResponseSchema.parse({
                error: "Failed to mark notification as read",
                message: error instanceof Error ? error.message : "Unknown error",
            });
            res.status(500).json(errorResponse);
            return;
        }
    };
}
exports.NotificationController = NotificationController;
