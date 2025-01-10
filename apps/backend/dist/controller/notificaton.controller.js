"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const __1 = require("..");
const notification_service_1 = require("../services/notification.service");
const src_1 = require("@wnp/types/src");
const notificationService = new notification_service_1.NotificationService();
class NotificationController {
    async subscribe(req, res) {
        const userId = req.params.userId;
        __1.sseManager.addClient(userId, res);
    }
    async create(req, res) {
        try {
            console.log("Creating notification");
            const notification = await notificationService.create(req.body);
            res.status(201).json(notification);
        }
        catch (error) {
            console.log(error);
            if (error instanceof Error) {
                res.status(500).json({
                    error: "Failed to create notification",
                    message: error.message,
                });
            }
        }
    }
    async getUserNotifications(req, res) {
        try {
            const userIdFromParams = req.params.userId;
            const roleFromQuery = req.query.role;
            const { role, userId } = src_1.GetNotificationInputParams.parse({
                userId: userIdFromParams,
                role: roleFromQuery,
            });
            const notifications = await notificationService.getUserNotifications(userId, role);
            res.json(notifications);
        }
        catch (error) {
            console.log(error);
            if (error instanceof Error) {
                res.status(500).json({
                    error: "Failed to fetch notifications",
                    message: error.message,
                });
            }
        }
    }
}
exports.NotificationController = NotificationController;
