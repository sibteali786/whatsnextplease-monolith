import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  CommentService,
  CreateCommentRequest,
  UpdateCommentRequest,
  GetCommentsRequest,
} from '../services/comment.service';
import { asyncHandler } from '../utils/handlers/asyncHandler';
import { BadRequestError } from '@wnp/types';
import { CreatorType, Roles } from '@prisma/client';

export class CommentController {
  constructor(private readonly commentService: CommentService = new CommentService()) {}

  /**
   * Create a new comment for a task
   */
  private handleCreateComment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { taskId } = req.params;
      const { content, fileIds } = req.body;

      if (!taskId) {
        throw new BadRequestError('Task ID is required');
      }

      if (!content || typeof content !== 'string') {
        throw new BadRequestError('Comment content is required');
      }

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      // Determine author type and ID based on user role
      const isClient = req.user.role === Roles.CLIENT;
      const authorType = isClient ? CreatorType.CLIENT : CreatorType.USER;
      const authorUserId = isClient ? undefined : req.user.id;
      const authorClientId = isClient ? req.user.id : undefined;
      const mentionedUserIds = req.body.mentionedUserIds || [];

      console.log('Request Body from Comment made', req.body);

      const request: CreateCommentRequest = {
        taskId,
        content,
        fileIds: Array.isArray(fileIds) ? fileIds : undefined,
        authorUserId,
        authorClientId,
        authorType,
        mentionedUserIds,
      };

      const result = await this.commentService.createComment(request);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to create comment',
        });
      }

      res.status(201).json({
        success: true,
        comment: result.comment,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get comments for a task
   */
  private handleGetComments = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { taskId } = req.params;
      const cursor = req.query.cursor as string;
      const pageSizeStr = req.query.pageSize as string;

      if (!taskId) {
        throw new BadRequestError('Task ID is required');
      }

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
      if (isNaN(pageSize) || pageSize <= 0 || pageSize > 100) {
        throw new BadRequestError('Invalid page size (must be between 1 and 100)');
      }

      const request: GetCommentsRequest = {
        taskId,
        userId: req.user.id,
        role: req.user.role,
        cursor,
        pageSize,
      };

      const result = await this.commentService.getCommentsByTaskId(request);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to retrieve comments',
        });
      }

      res.status(200).json({
        success: true,
        comments: result.comments,
        hasNextCursor: result.hasNextCursor,
        nextCursor: result.nextCursor,
        totalCount: result.totalCount,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a comment
   */
  private handleUpdateComment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;

      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }

      if (!content || typeof content !== 'string') {
        throw new BadRequestError('Comment content is required');
      }

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const request: UpdateCommentRequest = {
        commentId,
        content,
        userId: req.user.id,
        role: req.user.role,
      };

      const result = await this.commentService.updateComment(request);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to update comment',
        });
      }

      res.status(200).json({
        success: true,
        comment: result.comment,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a comment
   */
  private handleDeleteComment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { commentId } = req.params;

      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const result = await this.commentService.deleteComment(commentId, {
        userId: req.user.id,
        role: req.user.role,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to delete comment',
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add files to a comment
   */
  private handleAddFilesToComment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { commentId } = req.params;
      const { fileIds } = req.body;

      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        throw new BadRequestError('File IDs array is required');
      }

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const result = await this.commentService.addFilesToComment(commentId, fileIds, {
        userId: req.user.id,
        role: req.user.role,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to add files to comment',
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove file from a comment
   */
  private handleRemoveFileFromComment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { commentId, fileId } = req.params;

      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }

      if (!fileId) {
        throw new BadRequestError('File ID is required');
      }

      if (!req.user) {
        throw new BadRequestError('User authentication required');
      }

      const result = await this.commentService.removeFileFromComment(commentId, fileId, {
        userId: req.user.id,
        role: req.user.role,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to remove file from comment',
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  // Public methods for route binding
  createComment = asyncHandler(this.handleCreateComment);
  getComments = asyncHandler(this.handleGetComments);
  updateComment = asyncHandler(this.handleUpdateComment);
  deleteComment = asyncHandler(this.handleDeleteComment);
  addFilesToComment = asyncHandler(this.handleAddFilesToComment);
  removeFileFromComment = asyncHandler(this.handleRemoveFileFromComment);
}
