'use server';
import prisma from '@/db/db';
import { handleError } from '@/utils/errorHandler';
import logger from '@/utils/logger';
import {
  UpdateTaskParams,
  UpdateTaskParamsSchema,
  UpdateTaskResponse,
  UpdateTaskResponseSchema,
} from '@/utils/validationSchemas';
import { NotificationType, Prisma, Roles } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { createNotification } from '@/db/repositories/notifications/notifications';
import { getCurrentUser } from '@/utils/user';
import { sendTaskUpdateNotifications } from '@/utils/notifications/taskNotification.server';
import { TaskChange } from '@/utils/notifications/taskNotifications';

// Helper functions
function transformEnumValue(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatTimeValue(hours: string): string {
  const totalHours = parseFloat(hours);
  if (totalHours < 24) {
    return `${totalHours}h`;
  }
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatDateValue(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export const updateTaskById = async (params: UpdateTaskParams): Promise<UpdateTaskResponse> => {
  try {
    logger.info({ params }, 'Updating task with params');
    // Get current user to check role
    const currentUser = await getCurrentUser();
    const userRole = currentUser?.role?.name;

    // Validate the input
    const validatedInput = UpdateTaskParamsSchema.parse(params);
    const { id, statusName, priorityName, taskCategoryName, assignedToId, skills, ...updateData } =
      validatedInput;

    // handle the timeForTask value to be converted to Decimal
    const modUpdatedData = {
      ...updateData,
      timeForTask: new Prisma.Decimal(params.timeForTask ?? 0),
      overTime: new Prisma.Decimal(params.overTime ?? 0),
    };

    // Get the original task data FIRST to compare changes
    const originalTask = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        timeForTask: true,
        overTime: true,
        assignedToId: true,
        createdByUserId: true,
        createdByClientId: true,
        status: { select: { statusName: true } },
        priority: { select: { priorityName: true } },
        taskCategory: { select: { categoryName: true } },
        // Get current skills for comparison
        taskSkills: {
          select: {
            skill: { select: { name: true } },
          },
        },
      },
    });

    if (!originalTask) {
      return {
        success: false,
        task: null,
        message: 'Task not found.',
      };
    }

    // Find IDs for provided names (status, priority, category)
    const [status, priority, category] = await Promise.all([
      statusName
        ? prisma.taskStatus.findFirst({
            where: { statusName: statusName },
            select: { id: true },
          })
        : null,
      priorityName
        ? prisma.taskPriority.findFirst({
            where: { priorityName: priorityName },
            select: { id: true },
          })
        : null,
      taskCategoryName
        ? prisma.taskCategory.findFirst({
            where: { categoryName: taskCategoryName },
            select: { id: true },
          })
        : null,
    ]);

    // Validate assignedToId - only if user has permission to assign tasks
    let assignee = null;
    let assigneeName = null;

    // Check if current user role is allowed to assign tasks
    const canAssignTasks =
      userRole === Roles.SUPER_USER ||
      userRole === Roles.TASK_SUPERVISOR ||
      userRole === Roles.DISTRICT_MANAGER ||
      userRole === Roles.TERRITORY_MANAGER;
    const isAssignmentChanging = assignedToId && assignedToId !== originalTask.assignedToId;
    logger.info(
      { canAssignTasks, isAssignmentChanging, assignedToId },
      'Checking assignment permissions and changes'
    );

    if (isAssignmentChanging && !canAssignTasks) {
      // If user tries to change assignment but doesn't have permission, return error
      return {
        success: false,
        task: null,
        message: "You don't have permission to assign tasks to other users.",
      };
    }
    if (isAssignmentChanging && canAssignTasks) {
      if (typeof assignedToId !== 'string') {
        return {
          success: false,
          task: null,
          message: 'Invalid assignedToId format provided.',
        };
      }

      const assigneeData = await prisma.user.findFirst({
        where: { id: assignedToId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!assigneeData) {
        return {
          success: false,
          task: null,
          message: 'Assigned user not found in database.',
        };
      }

      assignee = assigneeData;
      assigneeName = `${assigneeData.firstName} ${assigneeData.lastName}`;
    }

    // Get original assignee name for comparison
    let originalAssigneeName = 'Unassigned';
    if (originalTask.assignedToId) {
      const originalAssigneeData = await prisma.user.findFirst({
        where: { id: originalTask.assignedToId },
        select: { firstName: true, lastName: true },
      });
      if (originalAssigneeData) {
        originalAssigneeName = `${originalAssigneeData.firstName} ${originalAssigneeData.lastName}`;
      }
    }

    // Ensure all IDs are resolved
    if (!status || !priority || !category) {
      const response = {
        success: false,
        task: null,
        message: 'Invalid statusName, priorityName or taskCategoryName provided.',
      };

      return UpdateTaskResponseSchema.parse(response);
    }

    // If skills are provided, validate them and find their IDs
    let skillIds: string[] = [];
    if (skills && skills.length > 0) {
      const foundSkills = await prisma.skill.findMany({
        where: {
          name: { in: skills },
        },
        select: { id: true, name: true },
      });

      // Check if all requested skills were found
      const foundSkillNames = foundSkills.map(s => s.name);
      const missingSkills = skills.filter(skill => !foundSkillNames.includes(skill));
      if (missingSkills.length > 0) {
        const response = {
          success: false,
          task: null,
          message: `Invalid skill names provided: ${missingSkills.join(', ')}`,
        };
        return UpdateTaskResponseSchema.parse(response);
      }

      skillIds = foundSkills.map(s => s.id);
    }

    // Determine what changed BEFORE updating
    const isNewTask = !originalTask.title || originalTask.title === '';
    const changes: TaskChange[] = [];

    // Check for field changes (only if not a new task)
    if (!isNewTask) {
      // Status change
      if (statusName && originalTask.status.statusName !== statusName) {
        changes.push({
          field: 'status',
          oldValue: originalTask.status.statusName,
          newValue: statusName,
          displayOldValue: transformEnumValue(originalTask.status.statusName),
          displayNewValue: transformEnumValue(statusName),
        });
      }

      // Priority change
      if (priorityName && originalTask.priority.priorityName !== priorityName) {
        changes.push({
          field: 'priority',
          oldValue: originalTask.priority.priorityName,
          newValue: priorityName,
          displayOldValue: transformEnumValue(originalTask.priority.priorityName),
          displayNewValue: transformEnumValue(priorityName),
        });
      }

      // Category change
      if (taskCategoryName && originalTask.taskCategory.categoryName !== taskCategoryName) {
        changes.push({
          field: 'taskCategory',
          oldValue: originalTask.taskCategory.categoryName,
          newValue: taskCategoryName,
          displayOldValue: originalTask.taskCategory.categoryName,
          displayNewValue: taskCategoryName,
        });
      }

      // Title change
      if (updateData.title && originalTask.title !== updateData.title) {
        changes.push({
          field: 'title',
          oldValue: originalTask.title,
          newValue: updateData.title,
          displayOldValue: originalTask.title,
          displayNewValue: updateData.title,
        });
      }

      // Description change
      if (updateData.description && originalTask.description !== updateData.description) {
        changes.push({
          field: 'description',
          oldValue: originalTask.description,
          newValue: updateData.description,
          displayOldValue: 'Previous description',
          displayNewValue: 'Updated description',
        });
      }

      // Due date change
      if (updateData.dueDate) {
        const newDueDateStr = updateData.dueDate.toISOString().split('T')[0];
        const oldDueDateStr = originalTask.dueDate
          ? originalTask.dueDate.toISOString().split('T')[0]
          : null;

        if (oldDueDateStr !== newDueDateStr) {
          changes.push({
            field: 'dueDate',
            oldValue: oldDueDateStr,
            newValue: newDueDateStr,
            displayOldValue: oldDueDateStr ? formatDateValue(oldDueDateStr) : 'Not set',
            displayNewValue: newDueDateStr ? formatDateValue(newDueDateStr) : 'Not set',
          });
        }
      }

      // Time estimate change
      if (params.timeForTask && originalTask.timeForTask.toString() !== params.timeForTask) {
        changes.push({
          field: 'timeForTask',
          oldValue: originalTask.timeForTask.toString(),
          newValue: params.timeForTask,
          displayOldValue: formatTimeValue(originalTask.timeForTask.toString()),
          displayNewValue: formatTimeValue(params.timeForTask),
        });
      }

      // Overtime change
      if (params.overTime && (originalTask.overTime?.toString() || '0') !== params.overTime) {
        changes.push({
          field: 'overTime',
          oldValue: originalTask.overTime?.toString() || '0',
          newValue: params.overTime,
          displayOldValue: formatTimeValue(originalTask.overTime?.toString() || '0'),
          displayNewValue: formatTimeValue(params.overTime),
        });
      }

      // Assignment change
      const newAssignedToId = assignee ? assignee.id : originalTask.assignedToId;
      if (newAssignedToId !== originalTask.assignedToId) {
        changes.push({
          field: 'assignedTo',
          oldValue: originalTask.assignedToId,
          newValue: newAssignedToId,
          displayOldValue: originalAssigneeName,
          displayNewValue: assigneeName || 'Unassigned',
        });
      }

      // Skills change
      if (skills && skills.length > 0) {
        const currentSkills = originalTask.taskSkills.map(ts => ts.skill.name).sort();
        const newSkills = [...skills].sort();

        if (JSON.stringify(currentSkills) !== JSON.stringify(newSkills)) {
          changes.push({
            field: 'skills',
            oldValue: currentSkills.join(', '),
            newValue: newSkills.join(', '),
            displayOldValue: currentSkills.join(', ') || 'No skills',
            displayNewValue: newSkills.join(', '),
          });
        }
      }
    }

    // Update the task with the validated data
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...modUpdatedData,
        assignedToId: isAssignmentChanging
          ? assignee
            ? assignee.id
            : null
          : originalTask.assignedToId,
        statusId: status.id,
        priorityId: priority.id,
        taskCategoryId: category.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: {
          select: { priorityName: true },
        },
        status: {
          select: { statusName: true },
        },
        taskCategory: {
          select: { categoryName: true },
        },
        priorityId: true,
        statusId: true,
        taskCategoryId: true,
        dueDate: true,
        timeForTask: true,
        overTime: true,
        assignedToId: true,
      },
    });

    // Update task skills if provided
    if (skills && skills.length > 0) {
      // Remove existing taskSkill entries
      await prisma.taskSkill.deleteMany({ where: { taskId: id } });

      // Insert new taskSkill entries
      const taskSkillData = skillIds.map(skillId => ({
        taskId: id,
        skillId: skillId,
      }));
      await prisma.taskSkill.createMany({ data: taskSkillData });
    }

    // Handle notifications
    if (isNewTask) {
      // This is a new task creation - KEEP ALL EXISTING FUNCTIONALITY
      let shouldNotifySupervisors = false;
      let notificationMessage = '';

      // Determine if we should send notifications based on creator role
      switch (userRole) {
        case Roles.CLIENT:
          shouldNotifySupervisors = true;
          notificationMessage = `New task "${updatedTask.title}" has been created by ${currentUser?.name} and needs assignment`;
          break;

        case Roles.TASK_AGENT:
          shouldNotifySupervisors = true;
          notificationMessage = `New task "${updatedTask.title}" has been created by ${currentUser?.name}`;
          break;

        case Roles.SUPER_USER:
        case Roles.TASK_SUPERVISOR:
          shouldNotifySupervisors = false;
          notificationMessage = `New task "${updatedTask.title}" has been created by ${currentUser?.name}`;
          break;

        default:
          shouldNotifySupervisors = false;
      }
      // Send to all Task Supervisors
      if (shouldNotifySupervisors) {
        const taskSupervisors = await prisma.user.findMany({
          where: { role: { name: Roles.TASK_SUPERVISOR }, id: { not: currentUser?.id } },
          select: { id: true },
        });

        for (const supervisor of taskSupervisors) {
          try {
            await createNotification({
              type: NotificationType.TASK_CREATED,
              message: notificationMessage,
              clientId: null,
              userId: supervisor.id,
              data: {
                type: NotificationType.TASK_CREATED,
                taskId: updatedTask.id,
                details: {
                  status: updatedTask.status.statusName,
                  priority: updatedTask.priority.priorityName,
                  category: updatedTask.taskCategory.categoryName,
                },
                name: currentUser?.name,
                username: currentUser?.username,
                avatarUrl: currentUser?.avatarUrl,
                url: `/taskOfferings/${updatedTask.id}`,
              },
            });
          } catch (error) {
            logger.error(
              { error, supervisorId: supervisor.id },
              'Failed to send notification to supervisor'
            );
          }
        }
      }
      // If task was assigned during creation
      if (updatedTask.assignedToId && updatedTask.assignedToId !== currentUser?.id) {
        try {
          await createNotification({
            type: NotificationType.TASK_ASSIGNED,
            message: `Task "${updatedTask.title}" has been assigned to you by ${currentUser?.name}`,
            clientId: null,
            userId: updatedTask.assignedToId,
            data: {
              type: NotificationType.TASK_ASSIGNED,
              taskId: updatedTask.id,
              details: {
                status: updatedTask.status.statusName,
                priority: updatedTask.priority.priorityName,
                category: updatedTask.taskCategory.categoryName,
              },
              name: currentUser?.name,
              username: currentUser?.username,
              avatarUrl: currentUser?.avatarUrl,
              url: `/taskOfferings/${updatedTask.id}`,
            },
          });
        } catch (error) {
          logger.error({ error }, 'Failed to send assignment notification');
        }
      }
    } else {
      // This is a task update - NEW BATCHED APPROACH
      if (changes.length > 0) {
        try {
          // Send one notification with all changes batched together
          logger.info({ changes }, `Task updated with ${changes.length} changes`);
          await sendTaskUpdateNotifications({
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            createdByUserId: originalTask.createdByUserId || undefined,
            createdByClientId: originalTask.createdByClientId || undefined,
            assignedToId: originalTask.assignedToId || undefined,
            changes: changes, // Pass ALL changes as an array
          });
        } catch (error) {
          logger.error(
            { error, taskId: updatedTask.id, changes },
            'Failed to send task update notifications'
          );
        }
      }

      // Separate assignment notification (if assignment changed)
      // This handles NEW assignments separately from field updates
      if (originalTask.assignedToId !== updatedTask.assignedToId && updatedTask.assignedToId) {
        try {
          await createNotification({
            type: NotificationType.TASK_ASSIGNED,
            message: `Task "${updatedTask.title}" has been assigned to you by ${currentUser?.name}`,
            clientId: null,
            userId: updatedTask.assignedToId,
            data: {
              type: NotificationType.TASK_ASSIGNED,
              taskId: updatedTask.id,
              details: {
                status: updatedTask.status.statusName,
                priority: updatedTask.priority.priorityName,
                category: updatedTask.taskCategory.categoryName,
              },
              name: currentUser?.name,
              username: currentUser?.username,
              avatarUrl: currentUser?.avatarUrl,
              url: `/taskOfferings/${updatedTask.id}`,
            },
          });
        } catch (error) {
          logger.error({ error }, 'Failed to send assignment notification');
        }
      }
    }

    revalidateTag('tasks:userId');

    // Return the response
    const responseData = {
      success: true,
      task: updatedTask,
      message: 'Task updated successfully.',
    };

    // make sure timeForTask is string when sent back
    const responseDataMod = {
      ...responseData,
      task: {
        ...responseData.task,
        timeForTask: responseData.task.timeForTask.toString(),
        overTime: responseData.task?.overTime ? responseData.task?.overTime.toString() : '0',
        statusName: responseData.task.status.statusName,
        priorityName: responseData.task.priority.priorityName,
        taskCategoryName: responseData.task.taskCategory.categoryName,
      },
    };

    logger.info({ updatedTask }, 'Task updated successfully');
    return UpdateTaskResponseSchema.parse(responseDataMod);
  } catch (error) {
    logger.error({ error }, 'Error in updateTask');
    return handleError(error, 'updateTask') as UpdateTaskResponse;
  }
};
