import { z } from "zod";
declare enum NotificationStatus {
    UNREAD = "UNREAD",
    READ = "READ",
    ARCHIVED = "ARCHIVED"
}
export declare const CreateNotificationDtoSchema: z.ZodObject<{
    type: z.ZodEnum<["TASK_ASSIGNED", "TASK_COMPLETED", "MESSAGE_RECEIVED", "SYSTEM_ALERT", "PAYMENT_RECEIVED", "TASK_MODIFIED"]>;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodAny>;
    userId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "TASK_ASSIGNED" | "TASK_COMPLETED" | "MESSAGE_RECEIVED" | "SYSTEM_ALERT" | "PAYMENT_RECEIVED" | "TASK_MODIFIED";
    message: string;
    data?: any;
    userId?: string | null | undefined;
    clientId?: string | null | undefined;
}, {
    type: "TASK_ASSIGNED" | "TASK_COMPLETED" | "MESSAGE_RECEIVED" | "SYSTEM_ALERT" | "PAYMENT_RECEIVED" | "TASK_MODIFIED";
    message: string;
    data?: any;
    userId?: string | null | undefined;
    clientId?: string | null | undefined;
}>;
export type NotificationList = z.infer<typeof NotificationResponseSchema>;
export type CreateNotificationDto = z.infer<typeof CreateNotificationDtoSchema>;
export declare const NotificationResponseSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    message: z.ZodString;
    status: z.ZodEnum<["UNREAD", "READ", "ARCHIVED"]>;
    data: z.ZodOptional<z.ZodAny>;
    createdAt: z.ZodDate;
    userId: z.ZodNullable<z.ZodString>;
    clientId: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: "UNREAD" | "READ" | "ARCHIVED";
    message: string;
    userId: string | null;
    clientId: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    data?: any;
}, {
    type: string;
    status: "UNREAD" | "READ" | "ARCHIVED";
    message: string;
    userId: string | null;
    clientId: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    data?: any;
}>;
export declare const NotificationResponseArraySchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    message: z.ZodString;
    status: z.ZodEnum<["UNREAD", "READ", "ARCHIVED"]>;
    data: z.ZodOptional<z.ZodAny>;
    createdAt: z.ZodDate;
    userId: z.ZodNullable<z.ZodString>;
    clientId: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: "UNREAD" | "READ" | "ARCHIVED";
    message: string;
    userId: string | null;
    clientId: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    data?: any;
}, {
    type: string;
    status: "UNREAD" | "READ" | "ARCHIVED";
    message: string;
    userId: string | null;
    clientId: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    data?: any;
}>, "many">;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export declare const ErrorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    error: string;
}, {
    message: string;
    error: string;
}>;
export declare const NotificationListResponseSchema: z.ZodObject<{
    notifications: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        message: z.ZodString;
        status: z.ZodEnum<["UNREAD", "READ", "ARCHIVED"]>;
        data: z.ZodOptional<z.ZodAny>;
        createdAt: z.ZodDate;
        userId: z.ZodNullable<z.ZodString>;
        clientId: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        type: string;
        status: "UNREAD" | "READ" | "ARCHIVED";
        message: string;
        userId: string | null;
        clientId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data?: any;
    }, {
        type: string;
        status: "UNREAD" | "READ" | "ARCHIVED";
        message: string;
        userId: string | null;
        clientId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data?: any;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    notifications: {
        type: string;
        status: "UNREAD" | "READ" | "ARCHIVED";
        message: string;
        userId: string | null;
        clientId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data?: any;
    }[];
    total: number;
}, {
    notifications: {
        type: string;
        status: "UNREAD" | "READ" | "ARCHIVED";
        message: string;
        userId: string | null;
        clientId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data?: any;
    }[];
    total: number;
}>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
declare enum Roles {
    SUPER_USER = "SUPER_USER",
    DISTRICT_MANAGER = "DISTRICT_MANAGER",
    TERRITORY_MANAGER = "TERRITORY_MANAGER",
    ACCOUNT_EXECUTIVE = "ACCOUNT_EXECUTIVE",
    TASK_SUPERVISOR = "TASK_SUPERVISOR",
    TASK_AGENT = "TASK_AGENT",
    CLIENT = "CLIENT"
}
export declare const GetNotificationInputParams: z.ZodObject<{
    userId: z.ZodString;
    role: z.ZodNativeEnum<typeof Roles>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    role: Roles;
}, {
    userId: string;
    role: Roles;
}>;
export declare const NotificationMarkAsReadParams: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type NotificationMarkAsReadParams = z.infer<typeof NotificationMarkAsReadParams>;
export declare const NotificationMarkAsReadResponseSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodNativeEnum<typeof NotificationStatus>;
}, "strip", z.ZodTypeAny, {
    status: NotificationStatus;
    id: string;
}, {
    status: NotificationStatus;
    id: string;
}>;
export type NotificationMarkAsReadResponse = z.infer<typeof NotificationMarkAsReadResponseSchema>;
export {};
//# sourceMappingURL=index.d.ts.map