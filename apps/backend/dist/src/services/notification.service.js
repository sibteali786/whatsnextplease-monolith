"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const SSEManager_1 = require("../utils/SSEManager");
const db_1 = __importDefault(require("../config/db"));
class NotificationService {
    async create(data) {
        const notification = await db_1.default.notification.create({
            data: {
                type: data.type,
                message: data.message,
                data: data.data,
                userId: data.userId,
                clientId: data.clientId,
            },
        });
        if (data.userId) {
            SSEManager_1.sseManager.sendNotification(data.userId, notification);
        }
        if (data.clientId) {
            SSEManager_1.sseManager.sendNotification(data.clientId, notification);
        }
        return notification;
    }
    async getUserNotifications(userId, role) {
        console.log(userId, role);
        if (role === client_1.Roles.CLIENT) {
            return db_1.default.notification.findMany({
                where: { clientId: userId },
                orderBy: { createdAt: "desc" },
            });
        }
        return db_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
    async markAsRead(id) {
        const notification = await db_1.default.notification.update({
            where: { id },
            data: { status: client_1.NotificationStatus.READ },
            select: {
                id: true,
                status: true,
            },
        });
        return notification;
    }
}
exports.NotificationService = NotificationService;
