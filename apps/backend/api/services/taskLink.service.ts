import { Roles, LinkSource, CreatorType } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError } from '@wnp/types';
import { canViewTasks } from '../utils/tasks/taskPermissions';
import { TaskLinkRepository } from '../repositories/taskLink.repository';
import { LinkMetadataService } from '../utils/linkMetadata';

export interface CreateTaskLinkRequest {
  taskId: string;
  url: string;
  addedById: string;
  addedByType: CreatorType;
  role: Roles;
}

export interface GetTaskLinksRequest {
  taskId: string;
  userId: string;
  role: Roles;
}

export interface DeleteTaskLinkRequest {
  linkId: string;
  userId: string;
  role: Roles;
}

export class TaskLinkService {
  constructor(private readonly taskLinkRepository: TaskLinkRepository = new TaskLinkRepository()) {}

  /**
   * Create a new task link manually
   */
  async createTaskLink(request: CreateTaskLinkRequest) {
    const { taskId, url, addedById, addedByType, role } = request;

    // Authentication check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to add links to tasks.`);
    }

    // Validate URL format
    if (!LinkMetadataService.isValidUrl(url)) {
      throw new BadRequestError('Invalid URL format. Must be a valid http or https URL.');
    }

    // verify task exists
    const task = await this.taskLinkRepository.findTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Check if link already exists
    const exists = await this.taskLinkRepository.linkExists(taskId, url);
    if (exists) {
      throw new BadRequestError('This URL has already been added to the task.');
    }

    try {
      // Fetch metadata (with timeout and SSRF protection)
      const metadata = await LinkMetadataService.fetchMetadata(url);

      // Create link
      const link = await this.taskLinkRepository.createTaskLink({
        taskId,
        url,
        title: metadata.title ?? undefined,
        faviconUrl: metadata.faviconUrl ?? undefined,
        source: LinkSource.MANUAL,
        addedById,
        addedByType,
      });
      return {
        success: true,
        link,
        message: 'Link added successfully',
      };
    } catch (error) {
      // If metadata fetch fails, still create link with basic info
      const urlObj = new URL(url);
      const link = await this.taskLinkRepository.createTaskLink({
        taskId,
        url,
        title: urlObj.hostname,
        faviconUrl: `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`,
        source: LinkSource.MANUAL,
        addedById,
        addedByType,
      });

      return {
        success: true,
        link,
        message: 'Link added successfully (metadata fetch failed)',
      };
    }
  }

  /**
   * Get all links for a task
   */
  async getTaskLinks(request: GetTaskLinksRequest) {
    const { taskId, userId, role } = request;

    // Authorization check
    if (!canViewTasks(role)) {
      throw new ForbiddenError(`Role ${role} is not authorized to view task links.`);
    }

    // Verify task exists
    const task = await this.taskLinkRepository.findTaskById(taskId);
    if (!task) {
      throw new ForbiddenError('You do not have access to this task');
    }

    // Check task access (same logic as comments)
    const hasAccess = this.checkTaskAccess(task, userId, role);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this task');
    }

    const [links, count] = await Promise.all([
      this.taskLinkRepository.findLinksByTaskId(taskId),
      this.taskLinkRepository.countLinksByTaskId(taskId),
    ]);

    return {
      success: true,
      links,
      count,
      message: 'Links retrieved successfully',
    };
  }

  /**
   * Delete a task link
   */
  async deleteTaskLink(request: DeleteTaskLinkRequest) {
    const { linkId, userId, role } = request;

    // Find link
    const link = await this.taskLinkRepository.findLinkById(linkId);
    if (!link) {
      throw new NotFoundError('Link not found');
    }
    // Permission check: only manual links can be deleted, and only by:
    // 1. The person who added it
    // 2. Super users
    // 3. Task supervisors
    if (link.source === LinkSource.COMMENT) {
      throw new ForbiddenError(
        'Links extracted from comments cannot be deleted directly. Delete the comment instead.'
      );
    }

    const canDelete =
      link.addedById === userId || role === Roles.SUPER_USER || role === Roles.TASK_SUPERVISOR;
    if (!canDelete) {
      throw new ForbiddenError('You can only delete links you added yourself.');
    }

    await this.taskLinkRepository.deleteLink(linkId);

    return {
      success: true,
      message: 'Link deleted successfully',
    };
  }

  /**
   * Extract and create links from comment content
   * Called by comment service after comment creation
   *
   * Returns detailed status including:
   * - success: Whether the extraction process completed
   * - linksCreated: Number of links successfully created
   *
   * Note: Individual link failures don't fail the entire operation.
   * The service attempts to create all valid links and reports the count.
   * Failures are logged but don't throw errors to avoid blocking comment creation.
   */

  async extractAndCreateLinksFromComment(
    commentId: string,
    commentContent: string,
    taskId: string,
    authorId: string,
    authorType: CreatorType
  ) {
    // Extract URLs from HTML content
    const urls = LinkMetadataService.extractUrlsFromHtml(commentContent);

    if (urls.length === 0) {
      return { success: true, linksCreated: 0 };
    }

    // Limit to prevent abuse
    const MAX_LINKS_PER_COMMENT = 20;
    const urlsToProcess = urls.slice(0, MAX_LINKS_PER_COMMENT);

    let linksCreated = 0;

    for (const url of urlsToProcess) {
      try {
        // Fetch metadata (non-blocking - if fails, just use basic info)
        let metadata;
        try {
          metadata = await LinkMetadataService.fetchMetadata(url);
        } catch {
          const urlObj = new URL(url);
          metadata = {
            title: urlObj.hostname,
            faviconUrl: `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`,
          };
        }
        // Create link using upsert (handles deduplication at database level)
        await this.taskLinkRepository.upsertTaskLink({
          taskId,
          url,
          title: metadata.title ?? undefined,
          faviconUrl: metadata.faviconUrl ?? undefined,
          source: LinkSource.COMMENT,
          sourceCommentId: commentId,
          addedById: authorId,
          addedByType: authorType,
        });

        linksCreated++;
      } catch (error) {
        console.error(`Failed to create link for ${url}:`, error);
        // Continue processing other links
      }
    }

    return {
      success: true,
      linksCreated,
    };
  }

  /**
   * Check if user has access to task (same as comment service)
   */
  private checkTaskAccess(
    task: {
      id: string;
      assignedToId: string | null;
      createdByUserId: string | null;
      createdByClientId: string | null;
    },
    userId: string,
    role: Roles
  ): boolean {
    // Super users and supervisors can access all tasks
    if (role === Roles.SUPER_USER || role === Roles.TASK_SUPERVISOR || role === Roles.TASK_AGENT) {
      return true;
    }

    // Users can access tasks they created or are assigned to
    if (task.createdByUserId === userId || task.assignedToId === userId) {
      return true;
    }

    // Clients can access tasks they created
    if (task.createdByClientId === userId) {
      return true;
    }

    return false;
  }
}
