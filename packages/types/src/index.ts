import { z } from 'zod';
enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}
export const CreateNotificationDtoSchema = z.object({
  type: z.enum([
    'TASK_ASSIGNED',
    'TASK_COMPLETED',
    'MESSAGE_RECEIVED',
    'SYSTEM_ALERT',
    'PAYMENT_RECEIVED',
    'TASK_MODIFIED',
  ]),
  message: z.string(),
  data: z.any().optional(),
  userId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
});
export type NotificationList = z.infer<typeof NotificationResponseSchema>;
export type CreateNotificationDto = z.infer<typeof CreateNotificationDtoSchema>;

export const NotificationResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  message: z.string(),
  status: z.enum(['UNREAD', 'READ', 'ARCHIVED']),
  data: z.any().optional(),
  createdAt: z.date(),
  userId: z.string().nullable(),
  clientId: z.string().nullable(),
  updatedAt: z.date(),
});

export const NotificationResponseArraySchema = z.array(NotificationResponseSchema);
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationResponseSchema),
  total: z.number(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

enum Roles {
  SUPER_USER = 'SUPER_USER',
  DISTRICT_MANAGER = 'DISTRICT_MANAGER',
  TERRITORY_MANAGER = 'TERRITORY_MANAGER',
  ACCOUNT_EXECUTIVE = 'ACCOUNT_EXECUTIVE',
  TASK_SUPERVISOR = 'TASK_SUPERVISOR',
  TASK_AGENT = 'TASK_AGENT',
  CLIENT = 'CLIENT',
}
export const GetNotificationInputParams = z.object({
  userId: z.string(),
  role: z.nativeEnum(Roles),
});

const uuidv4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const NotificationMarkAsReadParams = z.object({
  id: z
    .string()
    .min(1, 'Notification ID is required')
    .regex(uuidv4Pattern, 'Invalid notification ID format - must be a valid UUID')
    .transform(val => val.toLowerCase()),
});
export type NotificationMarkAsReadParams = z.infer<typeof NotificationMarkAsReadParams>;
export const NotificationMarkAsReadResponseSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(NotificationStatus),
});

export type NotificationMarkAsReadResponse = z.infer<typeof NotificationMarkAsReadResponseSchema>;

export * from './errors';
