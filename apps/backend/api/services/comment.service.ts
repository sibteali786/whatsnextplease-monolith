import { Roles, CreatorType } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError } from '@wnp/types';
import { canViewTasks } from '../utils/tasks/taskPermissions';
import {
  CommentRepository,
  CreateCommentData,
  CommentWithRelations,
  CommentQueryOptions,
} from '../repositories/comment.repository';
import { S3BucketService } from './s3Service';

export interface CreateCommentRequest {
  taskId: string;
  content: string;
  fileIds?: string[];
  authorUserId?: string;
  authorClientId?: string;
  authorType: CreatorType;
}

export interface UpdateCommentRequest {
  commentId: string;
  content: string;
  userId: string;
  role: Roles;
}

export interface GetCommentsRequest {
  taskId: string;
  userId: string;
  role: Roles;
  cursor?: string;
  pageSize?: number;
}

export interface CommentPermissionCheck {
  userId: string;
  role: Roles;
}

export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository = new CommentRepository(),
    private readonly s3Service: S3BucketService = new S3BucketService()
  ) {}

  /**
   * Create a new comment with optional file attachments
   */
  async createComment(request: CreateCommentRequest): Promise<{
    success: boolean;
    comment?: CommentWithRelations;
    message?: string;
    error?: string;
  }> {
    try {
      const { taskId, content, fileIds, authorUserId, authorClientId, authorType } = request;

      // Validate input
      if (!content || content.trim().length === 0) {
        throw new BadRequestError('Comment content cannot be empty');
      }

      if (content.length > 5000) {
        throw new BadRequestError('Comment content cannot exceed 5000 characters');
      }

      // Verify task exists
      const task = await this.commentRepository.findTaskById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Validate author information
      if (authorType === CreatorType.USER && !authorUserId) {
        throw new BadRequestError('authorUserId is required for USER type');
      }
      if (authorType === CreatorType.CLIENT && !authorClientId) {
        throw new BadRequestError('authorClientId is required for CLIENT type');
      }

      // Validate file IDs if provided
      if (fileIds && fileIds.length > 0) {
        const existingFiles = await this.commentRepository.findFilesByIds(fileIds);
        if (existingFiles.length !== fileIds.length) {
          throw new BadRequestError('One or more files not found');
        }

        // Limit number of files per comment
        if (fileIds.length > 10) {
          throw new BadRequestError('Cannot attach more than 10 files per comment');
        }
      }

      // Create comment data
      const commentData: CreateCommentData = {
        content: content.trim(),
        taskId,
        authorUserId,
        authorClientId,
        authorType,
        mentionedUserIds: [], // Will implement mention extraction later
      };

      // Create comment with transaction
      const comment = await this.commentRepository.createComment(commentData, fileIds);

      return {
        success: true,
        comment,
        message: 'Comment created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating comment',
      };
    }
  }

  /**
   * Get comments for a task with pagination
   */
  async getCommentsByTaskId(request: GetCommentsRequest): Promise<{
    success: boolean;
    comments?: CommentWithRelations[];
    hasNextCursor?: boolean;
    nextCursor?: string | null;
    totalCount?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const { taskId, userId, role, cursor, pageSize = 20 } = request;

      // Authorization check
      if (!canViewTasks(role)) {
        throw new ForbiddenError(`Role ${role} is not authorized to view task comments`);
      }

      // Verify task exists
      const task = await this.commentRepository.findTaskById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Additional permission check: user should have access to the task
      // (Can be refined based on your task permission logic)
      const hasTaskAccess = this.checkTaskAccess(task, userId, role);
      if (!hasTaskAccess) {
        throw new ForbiddenError('You do not have access to this task');
      }

      const queryOptions: CommentQueryOptions = {
        cursor,
        pageSize,
        orderBy: { createdAt: 'asc' }, // Show oldest comments first
      };

      const [result, totalCount] = await Promise.all([
        this.commentRepository.findCommentsByTaskId(taskId, queryOptions),
        this.commentRepository.countCommentsByTaskId(taskId),
      ]);

      return {
        success: true,
        comments: result.comments,
        hasNextCursor: result.hasNextCursor,
        nextCursor: result.nextCursor,
        totalCount,
        message: 'Comments retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error retrieving comments',
      };
    }
  }

  /**
   * Update comment content
   */
  async updateComment(request: UpdateCommentRequest): Promise<{
    success: boolean;
    comment?: CommentWithRelations;
    message?: string;
    error?: string;
  }> {
    try {
      const { commentId, content, userId, role } = request;

      // Validate input
      if (!content || content.trim().length === 0) {
        throw new BadRequestError('Comment content cannot be empty');
      }

      if (content.length > 5000) {
        throw new BadRequestError('Comment content cannot exceed 5000 characters');
      }

      // Find existing comment
      const existingComment = await this.commentRepository.findCommentById(commentId);
      if (!existingComment) {
        throw new NotFoundError('Comment not found');
      }

      // Permission check: only author can edit their comment
      const canEdit = this.checkCommentEditPermission(existingComment, userId, role);
      if (!canEdit) {
        throw new ForbiddenError('You can only edit your own comments');
      }

      // Update comment
      const updatedComment = await this.commentRepository.updateComment(commentId, content.trim());

      return {
        success: true,
        comment: updatedComment,
        message: 'Comment updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating comment',
      };
    }
  }

  async deleteComment(
    commentId: string,
    permissions: CommentPermissionCheck
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const { userId, role } = permissions;

      // Find existing comment with files
      const existingComment = await this.commentRepository.findCommentById(commentId);
      if (!existingComment) {
        throw new NotFoundError('Comment not found');
      }

      // Permission check: author or admin roles can delete
      const canDelete = this.checkCommentDeletePermission(existingComment, userId, role);
      if (!canDelete) {
        throw new ForbiddenError('You do not have permission to delete this comment');
      }

      // Store file information before deletion
      const filesToDelete = existingComment.commentFiles.map(cf => ({
        id: cf.file.id,
        filePath: cf.file.filePath,
        fileName: cf.file.fileName,
      }));

      // Delete comment and associated files from database
      await this.commentRepository.deleteComment(commentId);

      // Clean up files from S3 (don't fail the operation if S3 cleanup fails)
      if (filesToDelete.length > 0) {
        await this.cleanupS3Files(filesToDelete);
      }

      return {
        success: true,
        message: 'Comment and associated files deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting comment',
      };
    }
  }

  /**
   * Clean up files from S3 storage
   */
  private async cleanupS3Files(files: Array<{ id: string; filePath: string; fileName: string }>) {
    const cleanupResults = await Promise.allSettled(
      files.map(async file => {
        try {
          const result = await this.s3Service.deleteFile(file.filePath);
          if (!result.success) {
            console.warn(`Failed to delete S3 file ${file.filePath}:`, result.error);
          }
          return { fileId: file.id, success: result.success, error: result.error };
        } catch (error) {
          console.warn(`Error deleting S3 file ${file.filePath}:`, error);
          return {
            fileId: file.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Log cleanup results for monitoring
    const failed = cleanupResults
      .filter(result => result.status === 'rejected' || !result.value.success)
      .map(result =>
        result.status === 'fulfilled' ? result.value : { error: 'Promise rejected' }
      );

    if (failed.length > 0) {
      console.warn(`Failed to clean up ${failed.length} files from S3:`, failed);
    } else {
      console.log(`Successfully cleaned up ${files.length} files from S3`);
    }
  }

  /**
   * Add files to existing comment
   */
  async addFilesToComment(
    commentId: string,
    fileIds: string[],
    permissions: CommentPermissionCheck
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const { userId, role } = permissions;

      // Find existing comment
      const existingComment = await this.commentRepository.findCommentById(commentId);
      if (!existingComment) {
        throw new NotFoundError('Comment not found');
      }

      // Permission check: only author can modify their comment
      const canEdit = this.checkCommentEditPermission(existingComment, userId, role);
      if (!canEdit) {
        throw new ForbiddenError('You can only modify your own comments');
      }

      // Validate file IDs
      if (!fileIds || fileIds.length === 0) {
        throw new BadRequestError('File IDs are required');
      }

      const existingFiles = await this.commentRepository.findFilesByIds(fileIds);
      if (existingFiles.length !== fileIds.length) {
        throw new BadRequestError('One or more files not found');
      }

      // Check total file limit (existing + new)
      const currentFileCount = existingComment.commentFiles.length;
      if (currentFileCount + fileIds.length > 10) {
        throw new BadRequestError('Cannot have more than 10 files per comment');
      }

      // Add files to comment
      await this.commentRepository.addFilesToComment(commentId, fileIds);

      return {
        success: true,
        message: 'Files added to comment successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error adding files to comment',
      };
    }
  }

  /**
   * Remove file from comment
   */
  async removeFileFromComment(
    commentId: string,
    fileId: string,
    permissions: CommentPermissionCheck
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const { userId, role } = permissions;

      // Find existing comment
      const existingComment = await this.commentRepository.findCommentById(commentId);
      if (!existingComment) {
        throw new NotFoundError('Comment not found');
      }

      // Permission check: only author can modify their comment
      const canEdit = this.checkCommentEditPermission(existingComment, userId, role);
      if (!canEdit) {
        throw new ForbiddenError('You can only modify your own comments');
      }

      // Check if file is attached to this comment
      const fileExists = existingComment.commentFiles.some(cf => cf.file.id === fileId);
      if (!fileExists) {
        throw new NotFoundError('File not found in this comment');
      }

      // Remove file from comment
      await this.commentRepository.removeFileFromComment(commentId, fileId);

      return {
        success: true,
        message: 'File removed from comment successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error removing file from comment',
      };
    }
  }

  /**
   * Check if user has access to task
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
    if (role === Roles.SUPER_USER || role === Roles.TASK_SUPERVISOR) {
      return true;
    }

    // Task agents can access assigned tasks
    if (role === Roles.TASK_AGENT && task.assignedToId === userId) {
      return true;
    }

    // Users can access tasks they created
    if (task.createdByUserId === userId) {
      return true;
    }

    // Clients can access tasks they created
    if (task.createdByClientId === userId) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can edit comment
   */
  private checkCommentEditPermission(
    comment: CommentWithRelations,
    userId: string,
    role: Roles
  ): boolean {
    // Super users can edit any comment
    if (role === Roles.SUPER_USER) {
      return true;
    }

    // Authors can edit their own comments
    if (comment.authorUser?.id === userId || comment.authorClient?.id === userId) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can delete comment
   */
  private checkCommentDeletePermission(
    comment: CommentWithRelations,
    userId: string,
    role: Roles
  ): boolean {
    // Super users and supervisors can delete any comment
    if (role === Roles.SUPER_USER || role === Roles.TASK_SUPERVISOR) {
      return true;
    }

    // Authors can delete their own comments
    if (comment.authorUser?.id === userId || comment.authorClient?.id === userId) {
      return true;
    }

    return false;
  }
}
