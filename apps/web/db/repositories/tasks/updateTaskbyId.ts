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

export const updateTaskById = async (params: UpdateTaskParams): Promise<UpdateTaskResponse> => {
  try {
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

    // Check if current user role is allowed to assign tasks
    const canAssignTasks =
      userRole === Roles.SUPER_USER ||
      userRole === Roles.TASK_SUPERVISOR ||
      userRole === Roles.DISTRICT_MANAGER ||
      userRole === Roles.TERRITORY_MANAGER;

    if (assignedToId && canAssignTasks) {
      if (typeof assignedToId !== 'string') {
        return {
          success: false,
          task: null,
          message: 'Invalid assignedToId format provided.',
        };
      }

      assignee = await prisma.user.findFirst({
        where: { id: assignedToId },
        select: { id: true },
      });

      if (!assignee) {
        return {
          success: false,
          task: null,
          message: 'Assigned user not found in database.',
        };
      }
    } else if (assignedToId && !canAssignTasks) {
      // If user tries to assign but doesn't have permission, return error
      return {
        success: false,
        task: null,
        message: "You don't have permission to assign tasks to other users.",
      };
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

    // Update the task with the validated data
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...modUpdatedData,
        assignedToId: assignee ? assignee.id : null, // if no id then keep it null
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

    // Determine if this is a new task creation (for sending notifications)

    // If this is a new task created by a client, send notifications to all Task Supervisors
    if (userRole === Roles.CLIENT) {
      // Find all Task Supervisors
      const taskSupervisors = await prisma.user.findMany({
        where: {
          role: {
            name: Roles.TASK_SUPERVISOR,
          },
        },
        select: {
          id: true,
        },
      });

      // Send notification to each Task Supervisor
      for (const supervisor of taskSupervisors) {
        try {
          await createNotification({
            type: NotificationType.TASK_CREATED,
            message: `New task "${updatedTask.title}" has been created by ${currentUser?.name} and needs assignment`,
            clientId: null,
            userId: supervisor.id,
            data: {
              taskId: updatedTask.id,
              details: {
                status: updatedTask.status.statusName,
                priority: updatedTask.priority.priorityName,
                category: updatedTask.taskCategory.categoryName,
              },
              name: currentUser?.name,
              username: currentUser?.username,
              avatarUrl: currentUser?.avatarUrl,
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

    // If a task was assigned in this update, send notification to the assignee
    if (assignee && updatedTask.assignedToId) {
      try {
        await createNotification({
          type: NotificationType.TASK_ASSIGNED,
          message: `Task "${updatedTask.title}" has been assigned to you by ${currentUser?.name}`,
          clientId: null,
          userId: updatedTask.assignedToId,
          data: {
            taskId: updatedTask.id,
            details: {
              status: updatedTask.status.statusName,
              priority: updatedTask.priority.priorityName,
              category: updatedTask.taskCategory.categoryName,
            },
            name: currentUser?.name,
            username: currentUser?.username,
            avatarUrl: currentUser?.avatarUrl,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to send assignment notification');
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
