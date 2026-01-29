import { CreatorType, Roles } from '@prisma/client';
import {
  CreateWorkLogData,
  UpdateWorkLogData,
  WorklogRepository,
  WorkLogWithRelations,
} from '../repositories/worklog.repository';
import { logger } from '../utils/logger';
import { formatTimeFromMinutes, parseTimeWithValidation } from '../utils/date-utils/timeUtils';
import prisma from '../config/db';

export interface CreateWorkLogInput {
  taskId: string;
  timeSpent: string; // Human-readable format: "1d 2h 30m"
  timeRemaining?: string; // Optional, human-readable format
  startedAt: Date;
  description: string;
  authorUserId?: string;
  authorClientId?: string;
  authorType: CreatorType;
}

export interface UpdateWorkLogInput {
  timeSpent?: string;
  timeRemaining?: string;
  startedAt?: Date;
  description?: string;
}

export interface WorkLogPermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export class WorkLogService {
  constructor(private readonly repository: WorklogRepository = new WorklogRepository()) {}

  /**
   * Create a new work log entry
   */
  async createWorkLog(input: CreateWorkLogInput): Promise<{
    success: boolean;
    workLog?: WorkLogWithRelations;
    error?: string;
  }> {
    try {
      // 1. Validate task exists
      const task = await this.repository.findTaskById(input.taskId);
      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      // 2. Parse and validation timeSpent
      const timeSpentResult = parseTimeWithValidation(input.timeSpent);
      if (!timeSpentResult.success) {
        return {
          success: false,
          error: timeSpentResult.error,
        };
      }

      // 3. Parse timeRemaining if provided
      let timeRemainingMinutes: number | undefined;
      if (input.timeRemaining) {
        const timeRemainingResult = parseTimeWithValidation(input.timeRemaining);
        if (!timeRemainingResult.success) {
          return {
            success: false,
            error: `Time remaining error: ${timeRemainingResult.error}`,
          };
        }
        timeRemainingMinutes = timeRemainingResult.minutes;
      }

      // 4. Validate description
      if (!input.description || input.description.trim().length === 0) {
        return {
          success: false,
          error: 'Work description is required',
        };
      }

      if (input.description.length > 10000) {
        return {
          success: false,
          error: 'Work description is too long (max 10,000 characters)',
        };
      }

      // 5. Validate startedAt is not in the future
      if (input.startedAt > new Date()) {
        return {
          success: false,
          error: 'Work start date cannot be in the future',
        };
      }

      // 6. Create work log
      const workLogData: CreateWorkLogData = {
        taskId: input.taskId,
        authorUserId: input.authorUserId,
        authorClientId: input.authorClientId,
        authorType: input.authorType,
        timeSpent: timeSpentResult.minutes!,
        timeRemaining: timeRemainingMinutes,
        startedAt: input.startedAt,
        description: input.description.trim(),
      };

      const workLog = await this.repository.createWorklog(workLogData);

      // 7. Create audit log entry
      await this.createAuditLog({
        action: `WorkLog created for task ${input.taskId}: ${formatTimeFromMinutes(timeSpentResult.minutes!)} spent`,
        userId: input.authorUserId || input.authorClientId!,
      });

      logger.info(`WorkLog created successfully: ${workLog.id}`);

      return {
        success: true,
        workLog,
      };
    } catch (error) {
      logger.error('Error creating work log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create work log',
      };
    }
  }

  /**
   * Get work logs for a task with pagination
   */
  async getWorkLogsByTaskId(
    taskId: string,
    cursor?: string,
    pageSize = 20
  ): Promise<{
    success: boolean;
    workLogs?: WorkLogWithRelations[];
    totalCount?: number;
    hasNextCursor?: boolean;
    nextCursor?: string | null;
    error?: string;
  }> {
    try {
      // Validate task exists
      const task = await this.repository.findTaskById(taskId);
      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      const result = await this.repository.findWorkLogsByTaskId(taskId, {
        cursor,
        pageSize,
        orderBy: { startedAt: 'desc' },
      });

      const totalCount = await this.repository.countWorkLogsByTaskId(taskId);

      return {
        success: true,
        workLogs: result.workLogs,
        totalCount,
        hasNextCursor: result.hasNextCursor,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      logger.error('Error fetching work logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch work logs',
      };
    }
  }

  /**
   * Get a single work log by ID
   */
  async getWorkLogById(workLogId: string): Promise<{
    success: boolean;
    workLog?: WorkLogWithRelations;
    error?: string;
  }> {
    try {
      const workLog = await this.repository.findWorkLogById(workLogId);

      if (!workLog) {
        return {
          success: false,
          error: 'Work log not found',
        };
      }

      if (workLog.isDeleted) {
        return {
          success: false,
          error: 'Work log has been deleted',
        };
      }

      return {
        success: true,
        workLog,
      };
    } catch (error) {
      logger.error('Error fetching work log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch work log',
      };
    }
  }

  /**
   * Update a work log entry
   */
  async updateWorkLog(
    workLogId: string,
    input: UpdateWorkLogInput,
    updatedByUserId: string
  ): Promise<{
    success: boolean;
    workLog?: WorkLogWithRelations;
    error?: string;
  }> {
    try {
      // 1. Validate work log exists
      const existingWorkLog = await this.repository.findWorkLogById(workLogId);
      if (!existingWorkLog) {
        return {
          success: false,
          error: 'Work log not found',
        };
      }

      if (existingWorkLog.isDeleted) {
        return {
          success: false,
          error: 'Cannot update deleted work log',
        };
      }

      // 2. Build update data
      const updateData: UpdateWorkLogData = {};

      // Parse timeSpent if provided
      if (input.timeSpent) {
        const timeSpentResult = parseTimeWithValidation(input.timeSpent);
        if (!timeSpentResult.success) {
          return {
            success: false,
            error: timeSpentResult.error,
          };
        }
        updateData.timeSpent = timeSpentResult.minutes;
      }

      // Parse timeRemaining if provided
      if (input.timeRemaining !== undefined) {
        if (input.timeRemaining === '') {
          // Allow clearing timeRemaining
          updateData.timeRemaining = undefined;
        } else {
          const timeRemainingResult = parseTimeWithValidation(input.timeRemaining);
          if (!timeRemainingResult.success) {
            return {
              success: false,
              error: `Time remaining error: ${timeRemainingResult.error}`,
            };
          }
          updateData.timeRemaining = timeRemainingResult.minutes;
        }
      }

      // Update startedAt if provided
      if (input.startedAt) {
        if (input.startedAt > new Date()) {
          return {
            success: false,
            error: 'Work start date cannot be in the future',
          };
        }
        updateData.startedAt = input.startedAt;
      }

      // Update description if provided
      if (input.description !== undefined) {
        if (input.description.trim().length === 0) {
          return {
            success: false,
            error: 'Work description cannot be empty',
          };
        }
        if (input.description.length > 10000) {
          return {
            success: false,
            error: 'Work description is too long (max 10,000 characters)',
          };
        }
        updateData.description = input.description.trim();
      }

      // 3. Check if there are any changes
      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No changes provided',
        };
      }

      // 4. Update work log
      const updatedWorkLog = await this.repository.updateWorkLog(workLogId, updateData);

      // 5. Create audit log entry
      const changes = Object.entries(updateData)
        .map(([key, value]) => {
          if (key === 'timeSpent' || key === 'timeRemaining') {
            return `${key}=${formatTimeFromMinutes(value as number)}`;
          }
          return `${key} updated`;
        })
        .join(', ');

      await this.createAuditLog({
        action: `WorkLog ${workLogId} updated: ${changes}`,
        userId: updatedByUserId,
      });

      logger.info(`WorkLog updated successfully: ${workLogId}`);

      return {
        success: true,
        workLog: updatedWorkLog,
      };
    } catch (error) {
      logger.error('Error updating work log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update work log',
      };
    }
  }

  /**
   * Delete a work log entry (soft delete)
   */
  async deleteWorkLog(
    workLogId: string,
    deletedByUserId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // 1. Validate work log exists
      const existingWorkLog = await this.repository.findWorkLogById(workLogId);
      if (!existingWorkLog) {
        return {
          success: false,
          error: 'Work log not found',
        };
      }

      if (existingWorkLog.isDeleted) {
        return {
          success: false,
          error: 'Work log is already deleted',
        };
      }

      // 2. Soft delete
      await this.repository.deleteWorkLog(workLogId, deletedByUserId);

      // 3. Create audit log entry
      await this.createAuditLog({
        action: `WorkLog ${workLogId} deleted (${formatTimeFromMinutes(existingWorkLog.timeSpent)} spent)`,
        userId: deletedByUserId,
      });

      logger.info(`WorkLog deleted successfully: ${workLogId}`);

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error deleting work log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete work log',
      };
    }
  }

  /**
   * Check permissions for work log operations
   */
  async checkPermissions(
    workLogId: string | null,
    userId: string,
    role: Roles
  ): Promise<WorkLogPermissions> {
    // Super users and supervisors have full permissions
    if (role === Roles.SUPER_USER || role === Roles.TASK_SUPERVISOR) {
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      };
    }

    // For new work logs (workLogId is null)
    if (!workLogId) {
      return {
        canCreate: role === Roles.TASK_AGENT || role === Roles.CLIENT,
        canRead: true,
        canUpdate: false,
        canDelete: false,
      };
    }
    // For existing work logs
    const workLog = await this.repository.findWorkLogById(workLogId);
    if (!workLog) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
      };
    }

    // Check if user is the author
    const isAuthor =
      (workLog.authorType === CreatorType.USER && workLog.authorUser?.id === userId) ||
      (workLog.authorType === CreatorType.CLIENT && workLog.authorClient?.id === userId);

    return {
      canCreate: role === Roles.TASK_AGENT || role === Roles.CLIENT,
      canRead: true,
      canUpdate: isAuthor,
      canDelete: isAuthor,
    };
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(data: { action: string; userId: string }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          userId: data.userId,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error creating audit log:', error);
      // Don't throw - audit log failure shouldn't break work log operations
    }
  }
}
