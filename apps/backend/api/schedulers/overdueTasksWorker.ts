import { parentPort, workerData } from 'worker_threads';
import { PrismaClient, NotificationType, Roles, TaskStatusEnum } from '@prisma/client';
import { NotificationService } from '../services/notification.service.js';
import { NotificationPayload } from '../services/notificationDelivery.service.js';

// Make sure this file is compiled to JS
// Using .js extension in imports helps resolve modules correctly

async function main() {
  const prisma = new PrismaClient();
  const notificationService = new NotificationService();
  const { batchSize = 50 } = workerData || {};

  try {
    // Get total overdue tasks
    const count = await prisma.task.count({
      where: {
        dueDate: { lt: new Date() },
        status: { statusName: { not: TaskStatusEnum.COMPLETED } },
      },
    });

    // Process in batches
    let processed = 0;
    let notificationsCreated = 0;
    const batches = Math.ceil(count / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: { statusName: { not: TaskStatusEnum.COMPLETED } },
        },
        include: { assignedTo: true, status: true },
        skip: batch * batchSize,
        take: batchSize,
      });

      // Get supervisors once per batch
      const supervisors = await prisma.user.findMany({
        where: { role: { name: Roles.TASK_SUPERVISOR } },
      });

      for (const task of tasks) {
        if (task.assignedToId) {
          // Notify task assignee
          await createAndDeliverNotification(
            notificationService,
            NotificationType.TASK_MODIFIED,
            `Task "${task.title}" is now overdue`,
            task.assignedToId,
            { taskId: task.id, status: task.status.statusName }
          );
          notificationsCreated++;
        }

        // Notify supervisors
        for (const supervisor of supervisors) {
          await createAndDeliverNotification(
            notificationService,
            NotificationType.TASK_MODIFIED,
            `Task "${task.title}" assigned to ${task.assignedTo?.firstName || 'someone'} is now overdue`,
            supervisor.id,
            { taskId: task.id, status: task.status.statusName }
          );
          notificationsCreated++;
        }
      }
      processed += tasks.length;

      // Report progress to parent
      if (parentPort) {
        parentPort.postMessage({
          progress: `${processed}/${count}`,
          tasksProcessed: processed,
          notificationsCreated,
        });
      }
    }
    // Report final results
    if (parentPort) {
      parentPort.postMessage({
        tasksProcessed: processed,
        notificationsCreated,
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function createAndDeliverNotification(
  service: NotificationService,
  type: NotificationType,
  message: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  const notificationData = { type, message, userId, data };
  const notification = await service.createNotification(notificationData);

  const payload: NotificationPayload = { type, message, data };
  await service.deliverNotification(payload, notificationData);
  await service.updateDeliveryStatus(notification.id);
}

main().catch(error => {
  console.error('Worker error:', error);
  if (parentPort) {
    parentPort.postMessage({ error: error.message });
  }
  process.exit(1);
});
