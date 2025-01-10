"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const notification_service_1 = require("../notification.service");
const mockPrisma_1 = require("../../test/mockPrisma");
const SSEManager_1 = require("../../utils/SSEManager");
const notificaton_factory_1 = require("../../test/factories/notificaton.factory");
jest.mock("@/utils/SSEManager", () => ({
    sseManager: { sendNotification: jest.fn() },
}));
describe("NotificationService", () => {
    let service;
    const mockCreateNotification = mockPrisma_1.prismaMock.notification.create;
    const mockFindNotification = mockPrisma_1.prismaMock.notification.findMany;
    const mockUpdateNotification = mockPrisma_1.prismaMock.notification.update;
    beforeEach(() => {
        service = new notification_service_1.NotificationService();
        jest.clearAllMocks();
    });
    describe("create()", () => {
        describe("when creating user notifications", () => {
            const userNotificationData = {
                type: client_1.NotificationType.TASK_ASSIGNED,
                message: "User notification",
                userId: "user-123",
                data: { priority: "high" },
            };
            it("should create and send SSE notification to user", async () => {
                const mockNotification = (0, notificaton_factory_1.createMockNotification)({
                    ...userNotificationData,
                });
                mockCreateNotification.mockResolvedValue(mockNotification);
                const result = await service.create(userNotificationData);
                expect(result).toEqual(mockNotification);
                expect(mockCreateNotification).toHaveBeenCalledWith({
                    data: userNotificationData,
                });
                expect(SSEManager_1.sseManager.sendNotification).toHaveBeenCalledWith(userNotificationData.userId, mockNotification);
            });
        });
        describe("when creating client notifications", () => {
            const clientNotificationData = {
                type: client_1.NotificationType.PAYMENT_RECEIVED,
                message: "Client notification",
                clientId: "client-123",
                data: { amount: 1000 },
            };
            it("should create and send SSE notification to client", async () => {
                const mockNotification = (0, notificaton_factory_1.createMockNotification)({
                    ...clientNotificationData,
                });
                mockCreateNotification.mockResolvedValue(mockNotification);
                const result = await service.create(clientNotificationData);
                expect(result).toEqual(mockNotification);
                expect(SSEManager_1.sseManager.sendNotification).toHaveBeenCalledWith(clientNotificationData.clientId, mockNotification);
            });
        });
    });
    describe("getUserNotifications()", () => {
        describe("when fetching client notifications", () => {
            const clientId = "client-123";
            it("should return notifications filtered by clientId", async () => {
                const mockNotifications = (0, notificaton_factory_1.createMockNotifications)(3, {
                    clientId,
                    type: client_1.NotificationType.PAYMENT_RECEIVED,
                });
                mockFindNotification.mockResolvedValue(mockNotifications);
                const result = await service.getUserNotifications(clientId, client_1.Roles.CLIENT);
                expect(result).toEqual(mockNotifications);
                expect(mockFindNotification).toHaveBeenCalledWith({
                    where: { clientId },
                    orderBy: { createdAt: "desc" },
                });
            });
        });
        describe("when fetching user notifications", () => {
            const userId = "user-123";
            it("should return notifications filtered by userId", async () => {
                const mockNotifications = (0, notificaton_factory_1.createMockNotifications)(3, {
                    userId,
                    type: client_1.NotificationType.TASK_ASSIGNED,
                });
                mockFindNotification.mockResolvedValue(mockNotifications);
                const result = await service.getUserNotifications(userId, client_1.Roles.SUPER_USER);
                expect(result).toEqual(mockNotifications);
                expect(mockFindNotification).toHaveBeenCalledWith({
                    where: { userId },
                    orderBy: { createdAt: "desc" },
                });
            });
        });
    });
    describe("markAsRead()", () => {
        const notificationId = "notification-123";
        it("should update notification status to READ and return updated fields", async () => {
            const mockNotification = {
                id: notificationId,
                status: client_1.NotificationStatus.READ,
            };
            mockUpdateNotification.mockResolvedValue(mockNotification);
            const result = await service.markAsRead(notificationId);
            expect(result).toEqual({
                id: notificationId,
                status: client_1.NotificationStatus.READ,
            });
            expect(mockUpdateNotification).toHaveBeenCalledWith({
                where: { id: notificationId },
                data: { status: client_1.NotificationStatus.READ },
                select: {
                    id: true,
                    status: true,
                },
            });
        });
        it("should throw error when notification not found", async () => {
            mockUpdateNotification.mockRejectedValue(new Error("Notification not found"));
            await expect(service.markAsRead("non-existent-id")).rejects.toThrow("Notification not found");
        });
        it("should throw error when id is invalid", async () => {
            mockUpdateNotification.mockRejectedValue(new Error("Invalid notification ID"));
            await expect(service.markAsRead("invalid-id")).rejects.toThrow("Invalid notification ID");
        });
    });
});
