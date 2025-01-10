"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notificaton_controller_1 = require("../notificaton.controller");
const notification_service_1 = require("../../services/notification.service");
const SSEManager_1 = require("../../utils/SSEManager");
const client_1 = require("@prisma/client");
const notificaton_factory_1 = require("../../test/factories/notificaton.factory");
// Mock the entire NotificationService
jest.mock("../../services/notification.service", () => ({
    NotificationService: jest.fn(() => ({
        create: jest.fn(),
        getUserNotifications: jest.fn(),
        markAsRead: jest.fn(),
    })),
}));
jest.mock("../../utils/SSEManager");
describe("NotificationController", () => {
    let controller;
    let mockRequest;
    let mockResponse;
    let mockNotificationService;
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        // Setup request and response mocks
        mockRequest = {
            params: {},
            body: {},
            query: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        // Initialize service mock
        mockNotificationService =
            new notification_service_1.NotificationService();
        // Create controller instance with mocked service
        controller = new notificaton_controller_1.NotificationController(mockNotificationService);
    });
    describe("subscribe", () => {
        it("should add client to SSE manager", async () => {
            mockRequest.params = { userId: "user123" };
            await controller.subscribe(mockRequest, mockResponse);
            expect(SSEManager_1.sseManager.addClient).toHaveBeenCalledWith("user123", mockResponse);
        });
    });
    describe("create", () => {
        const notificationData = {
            type: client_1.NotificationType.TASK_ASSIGNED,
            message: "Test notification",
            userId: "user123",
        };
        it("should create notification successfully", async () => {
            const mockNotification = (0, notificaton_factory_1.createMockNotification)(notificationData);
            mockRequest.body = notificationData;
            // Setup mock return value
            mockNotificationService.create.mockResolvedValueOnce(mockNotification);
            await controller.create(mockRequest, mockResponse);
            expect(mockNotificationService.create).toHaveBeenCalledWith(notificationData);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockNotification);
        });
    });
    describe("getUserNotifications", () => {
        it("should fetch user notifications successfully", async () => {
            const mockNotifications = (0, notificaton_factory_1.createMockNotifications)(1, {
                userId: "user123",
            });
            mockRequest.params = { userId: "user123" };
            mockRequest.query = { role: client_1.Roles.TASK_AGENT };
            mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications);
            await controller.getUserNotifications(mockRequest, mockResponse);
            const validatedResponse = {
                notifications: mockNotifications,
                total: mockNotifications.length,
            };
            expect(mockResponse.json).toHaveBeenCalledWith(validatedResponse);
        });
        it("should handle fetch errors", async () => {
            mockRequest.params = { userId: "user123" };
            mockRequest.query = { role: client_1.Roles.TASK_AGENT };
            mockNotificationService.getUserNotifications.mockRejectedValue(new Error("Fetch failed"));
            await controller.getUserNotifications(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Failed to fetch notifications",
                message: "Fetch failed",
            });
        });
    });
    describe("validation errors", () => {
        it("should handle missing userId", async () => {
            mockRequest.params = {}; // Missing userId
            mockRequest.query = { role: client_1.Roles.TASK_AGENT };
            await controller.getUserNotifications(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Validation error",
                message: expect.stringContaining("Required"),
            });
        });
        it("should handle invalid role", async () => {
            mockRequest.params = { userId: "user123" };
            mockRequest.query = { role: "INVALID_ROLE" };
            await controller.getUserNotifications(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Validation error",
                message: expect.stringContaining("Invalid enum value."),
            });
        });
    });
    describe("create validation", () => {
        it("should validate missing required fields", async () => {
            mockRequest.body = {
                message: "Test notification",
                // Missing type field
            };
            await controller.create(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Validation error",
                message: expect.stringContaining("Required"),
            });
        });
        it("should validate missing userId and clientId", async () => {
            mockRequest.body = {
                type: "TASK_ASSIGNED",
                message: "Test notification",
                // Missing both userId and clientId
            };
            await controller.create(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Validation error",
                message: "Either userId or clientId must be provided",
            });
        });
        it("should validate invalid notification type", async () => {
            mockRequest.body = {
                type: "INVALID_TYPE",
                message: "Test notification",
                userId: "user123",
            };
            await controller.create(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Validation error",
                message: expect.stringContaining("Invalid enum value."),
            });
        });
    });
    describe("markAsRead", () => {
        const notificationId = "529ac636-2812-412d-a540-c3cb79c693f5";
        it("should mark notification as read successfully", async () => {
            const mockUpdatedNotification = {
                id: notificationId,
                status: client_1.NotificationStatus.READ,
            };
            mockRequest.params = { id: notificationId };
            mockNotificationService.markAsRead.mockResolvedValueOnce(mockUpdatedNotification);
            await controller.markAsRead(mockRequest, mockResponse);
            expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(notificationId);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedNotification);
        });
        it("should handle missing notification id", async () => {
            mockRequest.params = {};
            await controller.markAsRead(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Validation error",
                message: "Required",
            });
        });
        it("should handle service errors", async () => {
            mockRequest.params = { id: notificationId };
            mockNotificationService.markAsRead.mockRejectedValueOnce(new Error("Failed to update notification"));
            await controller.markAsRead(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Failed to mark notification as read",
                message: "Failed to update notification",
            });
        });
    });
});
