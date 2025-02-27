import { NotificationDeliveryStatus, NotificationStatus, NotificationType } from '@prisma/client';
import { z } from 'zod';

// Input schema for factory function
export const NotificationInputSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(NotificationType).optional(),
  message: z.string().optional(),
  userId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  data: z.record(z.any()).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Output schema matches Prisma model
const NotificationSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(NotificationType),
  message: z.string(),
  userId: z.string().nullable(),
  clientId: z.string().nullable(),
  data: z.record(z.any()),
  status: z.nativeEnum(NotificationStatus),
  deliveryStatus: z.nativeEnum(NotificationDeliveryStatus),
  lastDeliveryAttempt: z.date(),
  deliveryError: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type NotificationInput = z.input<typeof NotificationInputSchema>;
type NotificationOutput = z.infer<typeof NotificationSchema>;

export const createMockNotification = (input: NotificationInput = {}): NotificationOutput => {
  const now = new Date();
  const defaults = {
    id: 'test-notification-id',
    type: NotificationType.TASK_ASSIGNED,
    message: 'Test notification',
    userId: null,
    clientId: null,
    data: {},
    status: NotificationStatus.UNREAD,
    deliveryStatus: NotificationDeliveryStatus.PENDING,
    deliveryError: null,
    lastDeliveryAttempt: now,
    createdAt: now,
    updatedAt: now,
  };

  const validated = NotificationSchema.parse({
    ...defaults,
    ...input,
  });

  return validated;
};

export const createMockNotifications = (
  count: number,
  overrides: NotificationInput = {}
): NotificationOutput[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockNotification({
      id: `notification-${i}`,
      ...overrides,
    })
  );
};

export type { NotificationInput, NotificationOutput };
