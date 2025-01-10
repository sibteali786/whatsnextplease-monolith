"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const index_1 = require("../index");
const prisma = new client_1.PrismaClient();
class NotificationService {
    async create(data) {
        console.log(data);
        const notification = await prisma.notification.create({
            data: {
                type: data.type,
                message: data.message,
                data: data.data,
                userId: data.userId,
                clientId: data.clientId,
            },
        });
        if (data.userId) {
            index_1.sseManager.sendNotification(data.userId, notification);
        }
        if (data.clientId) {
            index_1.sseManager.sendNotification(data.clientId, notification);
        }
        return notification;
    }
    async getUserNotifications(userId, role) {
        console.log(userId, role);
        if (role === client_1.Roles.CLIENT) {
            return prisma.notification.findMany({
                where: { clientId: userId },
                orderBy: { createdAt: "desc" },
            });
        }
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
    async markAsRead(id) {
        return prisma.notification.update({
            where: { id },
            data: { status: "READ" },
        });
    }
}
exports.NotificationService = NotificationService;
