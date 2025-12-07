import { PrismaClient, LinkSource, CreatorType } from '@prisma/client';

export interface CreateTaskLinkData {
  taskId: string;
  url: string;
  title?: string;
  faviconUrl?: string;
  source: LinkSource;
  sourceCommentId?: string;
  addedById: string;
  addedByType: CreatorType;
}

export class TaskLinkRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  /**
   * Create a new task link (with deduplication)
   */
  async createTaskLink(data: CreateTaskLinkData) {
    return this.prisma.taskLink.create({
      data,
      include: {
        sourceComment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Create or update task link (upsert for deduplication)
   */
  async upsertTaskLink(data: CreateTaskLinkData) {
    return this.prisma.taskLink.upsert({
      where: {
        taskId_url: {
          taskId: data.taskId,
          url: data.url,
        },
      },
      create: data,
      update: {
        title: data.title || undefined,
        faviconUrl: data.faviconUrl || undefined,
      },
      include: {
        sourceComment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });
  }
  /**
   * Get all links for a task
   */

  async findLinksByTaskId(taskId: string) {
    return this.prisma.taskLink.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceComment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            authorUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            authorClient: {
              select: {
                contactName: true,
                companyName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get link by ID
   */
  async findLinkById(linkId: string) {
    return this.prisma.taskLink.findUnique({
      where: { id: linkId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        sourceComment: true,
      },
    });
  }

  /**
   * Delete a link
   */
  async deleteLink(linkId: string) {
    return this.prisma.taskLink.delete({
      where: { id: linkId },
    });
  }

  /**
   * Count links for a task
   */
  async countLinksByTaskId(taskId: string): Promise<number> {
    return this.prisma.taskLink.count({
      where: { taskId },
    });
  }

  /**
   * Check if link exists for task
   */
  async linkExists(taskId: string, url: string): Promise<boolean> {
    const count = await this.prisma.taskLink.count({
      where: { taskId, url },
    });
    return count > 0;
  }

  /**
   * Find task by ID (for validation)
   */
  async findTaskById(taskId: string) {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        createdByUserId: true,
        createdByClientId: true,
      },
    });
  }
}
