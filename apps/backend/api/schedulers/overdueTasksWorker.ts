// api/schedulers/overdueTasksWorker.ts
import { parentPort, workerData } from 'worker_threads';
import { PrismaClient, NotificationType, Roles, TaskStatusEnum } from '@prisma/client';
import { NotificationService } from '../services/notification.service.js';
import { NotificationPayload } from '../services/notificationDelivery.service.js';
import { TASK_CONFIG } from '../config/taskConfig.js';

async function main() {
  const prisma = new PrismaClient();
  const notificationService = new NotificationService();
  const { batchSize = TASK_CONFIG.OVERDUE_CHECK_BATCH_SIZE } = workerData || {};

  try {
    // First, find the OVERDUE status ID (Do this first to validate setup)
    const overdueStatus = await prisma.taskStatus.findFirst({
      where: { statusName: TaskStatusEnum.OVERDUE },
    });

    if (!overdueStatus) {
      console.error('OVERDUE task status not found in the database');
      throw new Error('OVERDUE task status not found in the database');
    }
    console.log('Found OVERDUE status:', overdueStatus);

    // Find tasks that are overdue but not marked as OVERDUE status
    const count = await prisma.task.count({
      where: {
        dueDate: { lt: new Date() },
        status: {
          statusName: {
            notIn: TASK_CONFIG.OVERDUE_EXCLUDED_STATUSES,
          },
        },
      },
    });

    console.log(`Found ${count} tasks to update`);

    // Process in batches
    let processed = 0;
    let notificationsCreated = 0;
    let tasksUpdated = 0;
    const batches = Math.ceil(count / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: {
            statusName: {
              notIn: TASK_CONFIG.OVERDUE_EXCLUDED_STATUSES,
            },
          },
        },
        include: { assignedTo: true, status: true, priority: true },
        skip: batch * batchSize,
        take: batchSize,
      });

      console.log(`Batch ${batch + 1}/${batches}: Found ${tasks.length} tasks`);

      // Get supervisors once per batch
      const supervisors = await prisma.user.findMany({
        where: { role: { name: Roles.TASK_SUPERVISOR } },
      });

      console.log(`Found ${supervisors.length} supervisors to notify`);

      for (const task of tasks) {
        // Update task status to OVERDUE
        console.log(`Updating task ${task.id} (${task.title}) to OVERDUE status`);
        try {
          const updatedTask = await prisma.task.update({
            where: { id: task.id },
            data: { statusId: overdueStatus.id },
          });
          console.log(`Successfully updated task ${task.id} to status: ${updatedTask.statusId}`);
          tasksUpdated++;
        } catch (updateError) {
          console.error(`Failed to update task ${task.id}:`, updateError);
          continue; // Skip to next task
        }

        if (task.assignedToId) {
          // Notify task assignee
          try {
            await createAndDeliverNotification(
              notificationService,
              NotificationType.TASK_MODIFIED,
              `Task "${task.title}" is now overdue`,
              task.assignedToId,
              {
                taskId: task.id,
                status: TaskStatusEnum.OVERDUE,
                priority: task.priority?.priorityName,
              }
            );
            notificationsCreated++;
            console.log(`Notified assignee ${task.assignedTo?.firstName} about task ${task.id}`);
          } catch (notifyError) {
            console.error(`Failed to notify assignee for task ${task.id}:`, notifyError);
          }
        }

        // Notify supervisors
        for (const supervisor of supervisors) {
          try {
            await createAndDeliverNotification(
              notificationService,
              NotificationType.TASK_MODIFIED,
              `Task "${task.title}" assigned to ${task.assignedTo?.firstName || 'someone'} is now overdue`,
              supervisor.id,
              {
                taskId: task.id,
                status: TaskStatusEnum.OVERDUE,
                priority: task.priority?.priorityName,
              }
            );
            notificationsCreated++;
            console.log(`Notified supervisor ${supervisor.firstName} about task ${task.id}`);
          } catch (notifyError) {
            console.error(
              `Failed to notify supervisor ${supervisor.id} for task ${task.id}:`,
              notifyError
            );
          }
        }
      }

      processed += tasks.length;

      // Report progress to parent
      if (parentPort) {
        parentPort.postMessage({
          progress: `${processed}/${count}`,
          tasksProcessed: processed,
          tasksUpdated,
          notificationsCreated,
        });
      }
    }

    // Report final results
    if (parentPort) {
      parentPort.postMessage({
        tasksProcessed: processed,
        tasksUpdated,
        notificationsCreated,
      });
    }

    console.log(
      `Worker completed: Processed ${processed} tasks, updated ${tasksUpdated}, created ${notificationsCreated} notifications`
    );
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
  return notification;
}

main().catch(error => {
  console.error('Worker error:', error);
  if (parentPort) {
    parentPort.postMessage({ error: error.message });
  }
  process.exit(1);
});
