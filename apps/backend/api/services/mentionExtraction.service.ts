// backend/services/mentionExtraction.service.ts
import { JSDOM } from 'jsdom';
import prisma from '../config/db';
import { Roles } from '@prisma/client';

export type UserInfo = {
  id: string;
  name: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  role: Roles;
};

export interface ExtractedMention {
  userId: string;
  userInfo: UserInfo;
}

export interface MentionExtractionOptions {
  taskId: string;
  authorUserId?: string;
  authorClientId?: string;
  authorRole: Roles;
}

export class MentionExtractionService {
  /**
   * Extract mentioned user IDs from HTML content
   */
  static extractMentionIds(htmlContent: string): string[] {
    try {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Find all mention spans with data-type="mention" and data-id attributes
      const mentionElements = document.querySelectorAll('span[data-type="mention"][data-id]');

      const mentionIds: string[] = [];
      mentionElements.forEach(element => {
        const mentionId = element.getAttribute('data-id');
        if (mentionId && !mentionIds.includes(mentionId)) {
          mentionIds.push(mentionId);
        }
      });

      return mentionIds;
    } catch (error) {
      console.error('Failed to extract mentions from HTML:', error);
      return [];
    }
  }

  /**
   * Validate and enrich mentioned users with permissions check
   */
  static async validateAndEnrichMentions(
    mentionIds: string[],
    options: MentionExtractionOptions
  ): Promise<ExtractedMention[]> {
    if (mentionIds.length === 0) return [];

    const { taskId, authorUserId, authorClientId } = options;

    try {
      // Get task information for permission checking
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          assignedToId: true,
          createdByUserId: true,
          createdByClientId: true,
          title: true,
        },
      });

      if (!task) {
        console.error(`Task ${taskId} not found for mention validation`);
        return [];
      }
      const validMentions: ExtractedMention[] = [];
      if (authorUserId) {
        // Get mentioned users' information
        const mentionedUsers = await prisma.user.findMany({
          where: {
            id: { in: mentionIds },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            avatarUrl: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        });

        // Filter users based on task access permissions

        if (mentionedUsers) {
          for (const user of mentionedUsers) {
            // Skip mentioning the author themselves
            if (user.id === authorUserId) continue;

            // Check if user has access to the task
            const hasTaskAccess = this.checkUserTaskAccess(task, user.id, user.role?.name as Roles);

            if (hasTaskAccess) {
              validMentions.push({
                userId: user.id,
                userInfo: {
                  id: user.id,
                  name: `${user.firstName} ${user.lastName}`.trim(),
                  email: user.email,
                  username: user.username,
                  avatarUrl: user.avatarUrl,
                  role: user.role?.name as Roles,
                },
              });
            } else {
              console.warn(`User ${user.id} mentioned but doesn't have access to task ${taskId}`);
            }
          }
        }
      } else if (authorClientId) {
        // get mentioned clients
        const mentionedClients = await prisma.client.findMany({
          where: {
            id: { in: mentionIds },
          },
          select: {
            id: true,
            contactName: true,
            companyName: true,
            email: true,
            username: true,
            avatarUrl: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        });
        if (mentionedClients) {
          for (const client of mentionedClients) {
            if (client.id === authorClientId) continue;
            // Clients can access tasks they created
            const hasTaskAccess = this.checkUserTaskAccess(
              task,
              client.id,
              client.role?.name as Roles
            );
            if (hasTaskAccess) {
              validMentions.push({
                userId: client.id,
                userInfo: {
                  id: client.id,
                  name: client.contactName || client.companyName || 'Client',
                  email: client.email,
                  username: client.username,
                  avatarUrl: client.avatarUrl,
                  role: client.role?.name as Roles,
                },
              });
            } else {
              console.warn(
                `Client ${client.id} mentioned but doesn't have access to task ${taskId}`
              );
            }
          }
        }
      }
      return validMentions;
    } catch (error) {
      console.error('Failed to validate mentions:', error);
      return [];
    }
  }

  /**
   * Check if a user has access to a specific task
   * Uses the same logic as your comment service
   */
  private static checkUserTaskAccess(
    task: {
      id: string;
      assignedToId: string | null;
      createdByUserId: string | null;
      createdByClientId: string | null;
    },
    userId: string,
    userRole: Roles
  ): boolean {
    // Super users and supervisors can access all tasks
    if (userRole === Roles.SUPER_USER || userRole === Roles.TASK_SUPERVISOR) {
      return true;
    }

    // Task agents can access assigned tasks
    if (userRole === Roles.TASK_AGENT && task.assignedToId) {
      return true;
    }

    // Users can access tasks they created
    if (task.createdByUserId === userId) {
      return true;
    }

    // Note: Clients can't be mentioned directly as they access different tasks
    // they can access tasks they have created
    if (task.createdByClientId === userId) {
      return true;
    }

    return false;
  }

  /**
   * Main function to extract and validate mentions from comment content
   */
  static async processCommentMentions(
    htmlContent: string,
    options: MentionExtractionOptions
  ): Promise<ExtractedMention[]> {
    // Step 1: Extract mention IDs from HTML
    const mentionIds = this.extractMentionIds(htmlContent);

    if (mentionIds.length === 0) return [];

    // Step 2: Validate and enrich with user data and permissions
    const validMentions = await this.validateAndEnrichMentions(mentionIds, options);

    return validMentions;
  }
}
