"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockNotifications = exports.createMockNotification = exports.NotificationInputSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
// Input schema for factory function
exports.NotificationInputSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: zod_1.z.nativeEnum(client_1.NotificationType).optional(),
    message: zod_1.z.string().optional(),
    userId: zod_1.z.string().nullable().optional(),
    clientId: zod_1.z.string().nullable().optional(),
    data: zod_1.z.record(zod_1.z.any()).optional(),
    status: zod_1.z.nativeEnum(client_1.NotificationStatus).optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
// Output schema matches Prisma model
const NotificationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.nativeEnum(client_1.NotificationType),
    message: zod_1.z.string(),
    userId: zod_1.z.string().nullable(),
    clientId: zod_1.z.string().nullable(),
    data: zod_1.z.record(zod_1.z.any()),
    status: zod_1.z.nativeEnum(client_1.NotificationStatus),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
const createMockNotification = (input = {}) => {
    const now = new Date();
    const defaults = {
        id: "test-notification-id",
        type: client_1.NotificationType.TASK_ASSIGNED,
        message: "Test notification",
        userId: null,
        clientId: null,
        data: {},
        status: client_1.NotificationStatus.UNREAD,
        createdAt: now,
        updatedAt: now,
    };
    const validated = NotificationSchema.parse({
        ...defaults,
        ...input,
    });
    return validated;
};
exports.createMockNotification = createMockNotification;
const createMockNotifications = (count, overrides = {}) => {
    return Array.from({ length: count }, (_, i) => (0, exports.createMockNotification)({
        id: `notification-${i}`,
        ...overrides,
    }));
};
exports.createMockNotifications = createMockNotifications;
