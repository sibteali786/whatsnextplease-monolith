"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationMarkAsReadResponseSchema = exports.NotificationMarkAsReadParams = exports.GetNotificationInputParams = exports.NotificationListResponseSchema = exports.ErrorResponseSchema = exports.NotificationResponseArraySchema = exports.NotificationResponseSchema = exports.CreateNotificationDtoSchema = void 0;
const zod_1 = require("zod");
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["UNREAD"] = "UNREAD";
    NotificationStatus["READ"] = "READ";
    NotificationStatus["ARCHIVED"] = "ARCHIVED";
})(NotificationStatus || (NotificationStatus = {}));
exports.CreateNotificationDtoSchema = zod_1.z.object({
    type: zod_1.z.enum([
        "TASK_ASSIGNED",
        "TASK_COMPLETED",
        "MESSAGE_RECEIVED",
        "SYSTEM_ALERT",
        "PAYMENT_RECEIVED",
        "TASK_MODIFIED",
    ]),
    message: zod_1.z.string(),
    data: zod_1.z.any().optional(),
    userId: zod_1.z.string().optional().nullable(),
    clientId: zod_1.z.string().optional().nullable(),
});
exports.NotificationResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    message: zod_1.z.string(),
    status: zod_1.z.enum(["UNREAD", "READ", "ARCHIVED"]),
    data: zod_1.z.any().optional(),
    createdAt: zod_1.z.date(),
    userId: zod_1.z.string().nullable(),
    clientId: zod_1.z.string().nullable(),
    updatedAt: zod_1.z.date(),
});
exports.NotificationResponseArraySchema = zod_1.z.array(exports.NotificationResponseSchema);
exports.ErrorResponseSchema = zod_1.z.object({
    error: zod_1.z.string(),
    message: zod_1.z.string(),
});
exports.NotificationListResponseSchema = zod_1.z.object({
    notifications: zod_1.z.array(exports.NotificationResponseSchema),
    total: zod_1.z.number(),
});
var Roles;
(function (Roles) {
    Roles["SUPER_USER"] = "SUPER_USER";
    Roles["DISTRICT_MANAGER"] = "DISTRICT_MANAGER";
    Roles["TERRITORY_MANAGER"] = "TERRITORY_MANAGER";
    Roles["ACCOUNT_EXECUTIVE"] = "ACCOUNT_EXECUTIVE";
    Roles["TASK_SUPERVISOR"] = "TASK_SUPERVISOR";
    Roles["TASK_AGENT"] = "TASK_AGENT";
    Roles["CLIENT"] = "CLIENT";
})(Roles || (Roles = {}));
exports.GetNotificationInputParams = zod_1.z.object({
    userId: zod_1.z.string(),
    role: zod_1.z.nativeEnum(Roles),
});
const uuidv4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
exports.NotificationMarkAsReadParams = zod_1.z.object({
    id: zod_1.z
        .string()
        .min(1, "Notification ID is required")
        .regex(uuidv4Pattern, "Invalid notification ID format - must be a valid UUID")
        .transform((val) => val.toLowerCase()),
});
exports.NotificationMarkAsReadResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    status: zod_1.z.nativeEnum(NotificationStatus),
});
