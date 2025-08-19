import { PrismaClient, Prisma, CreatorType } from '@prisma/client';

export interface CreateCommentData {
  content: string;
  taskId: string;
  authorUserId?: string;
  authorClientId?: string;
  authorType: CreatorType;
  mentionedUserIds?: string[];
}

export interface CommentWithRelations {
  id: string;
  content: string;
  taskId: string;
  authorType: CreatorType;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  authorUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  authorClient?: {
    id: string;
    companyName: string;
    contactName: string | null;
    avatarUrl: string | null;
  } | null;
  commentFiles: Array<{
    file: {
      id: string;
      fileName: string;
      filePath: string;
      fileSize: string;
      uploadedBy: string;
      uploadedAt: Date;
    };
  }>;
  _count?: {
    replies: number;
  };
}

export interface CommentQueryOptions {
  cursor?: string;
  pageSize: number;
  orderBy?: Prisma.TaskCommentOrderByWithRelationInput;
}

export class CommentRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}
  /**
   * Create a new comment with optional file attachments
   */
  async createComment(
    commentData: CreateCommentData,
    fileIds?: string[]
  ): Promise<CommentWithRelations> {
    return await this.prisma.$transaction(async tx => {
      // Create the comment
      const comment = await tx.taskComment.create({
        data: commentData,
        include: {
          authorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          authorClient: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              avatarUrl: true,
            },
          },
          commentFiles: {
            include: {
              file: {
                select: {
                  id: true,
                  fileName: true,
                  filePath: true,
                  fileSize: true,
                  uploadedBy: true,
                  uploadedAt: true,
                },
              },
            },
          },
          _count: {
            select: { replies: true },
          },
        },
      });

      // Link files to comment if provided
      if (fileIds && fileIds.length > 0) {
        await tx.taskCommentFile.createMany({
          data: fileIds.map(fileId => ({
            commentId: comment.id,
            fileId,
          })),
        });

        // Refetch comment with file relations
        return await tx.taskComment.findUniqueOrThrow({
          where: { id: comment.id },
          include: {
            authorUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            authorClient: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                avatarUrl: true,
              },
            },
            commentFiles: {
              include: {
                file: {
                  select: {
                    id: true,
                    fileName: true,
                    filePath: true,
                    fileSize: true,
                    uploadedBy: true,
                    uploadedAt: true,
                  },
                },
              },
            },
            _count: {
              select: { replies: true },
            },
          },
        });
      }

      return comment;
    });
  }

  /**
   * Find comments by task ID with pagination
   */

  async findCommentsByTaskId(
    taskId: string,
    options: CommentQueryOptions
  ): Promise<{
    comments: CommentWithRelations[];
    hasNextCursor: boolean;
    nextCursor: string | null;
  }> {
    const { cursor, pageSize, orderBy = { createdAt: 'asc' } } = options;
    const comments = await this.prisma.taskComment.findMany({
      where: { taskId, parentCommentId: null },
      take: pageSize + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy,
      include: {
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        authorClient: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            avatarUrl: true,
          },
        },
        commentFiles: {
          include: {
            file: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                fileSize: true,
                uploadedBy: true,
                uploadedAt: true,
              },
            },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });
    const hasNextCursor = comments.length > pageSize;
    const nextCursor = hasNextCursor ? comments[pageSize - 1].id : null;

    if (hasNextCursor) {
      comments.pop();
    }

    return {
      comments,
      hasNextCursor,
      nextCursor,
    };
  }

  /**
   * Find comment by ID
   */
  async findCommentById(commentId: string): Promise<CommentWithRelations | null> {
    return await this.prisma.taskComment.findUnique({
      where: { id: commentId },
      include: {
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        authorClient: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            avatarUrl: true,
          },
        },
        commentFiles: {
          include: {
            file: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                fileSize: true,
                uploadedBy: true,
                uploadedAt: true,
              },
            },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });
  }

  /**
   * Update comment content
   */
  async updateComment(commentId: string, content: string): Promise<CommentWithRelations> {
    return await this.prisma.taskComment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        authorClient: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            avatarUrl: true,
          },
        },
        commentFiles: {
          include: {
            file: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                fileSize: true,
                uploadedBy: true,
                uploadedAt: true,
              },
            },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });
  }

  /**
   * Delete comment
   */

  /**
   * Delete comment and associated files
   */
  async deleteComment(commentId: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      // First, get all files associated with this comment
      const commentFiles = await tx.taskCommentFile.findMany({
        where: { commentId },
        include: {
          file: {
            select: {
              id: true,
              filePath: true,
              fileName: true,
            },
          },
        },
      });

      // Store file information for S3 cleanup
      const filesToDelete = commentFiles.map(cf => ({
        id: cf.file.id,
        filePath: cf.file.filePath,
        fileName: cf.file.fileName,
      }));

      // Delete comment files relations first
      await tx.taskCommentFile.deleteMany({
        where: { commentId },
      });

      // Delete the actual file records
      if (filesToDelete.length > 0) {
        await tx.file.deleteMany({
          where: {
            id: { in: filesToDelete.map(f => f.id) },
          },
        });
      }

      // Delete the comment (cascade will handle replies if any)
      await tx.taskComment.delete({
        where: { id: commentId },
      });

      // Note: S3 cleanup will be handled by the service layer
      return filesToDelete;
    });
  }

  /**
   * Add files to existing comment
   */
  async addFilesToComment(commentId: string, fileIds: string[]): Promise<void> {
    await this.prisma.taskCommentFile.createMany({
      data: fileIds.map(fileId => ({
        commentId,
        fileId,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Remove file from comment
   */
  async removeFileFromComment(commentId: string, fileId: string): Promise<void> {
    await this.prisma.taskCommentFile.delete({
      where: {
        commentId_fileId: {
          commentId,
          fileId,
        },
      },
    });
  }

  /**
   * Count comments for a task
   */
  async countCommentsByTaskId(taskId: string): Promise<number> {
    return await this.prisma.taskComment.count({
      where: {
        taskId,
        parentCommentId: null, // Only count top-level comments
      },
    });
  }

  /**
   * Verify task exists and user has access to it
   */
  async findTaskById(taskId: string) {
    return await this.prisma.task.findUnique({
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

  /**
   * Verify files exist and belong to the task context
   */
  async findFilesByIds(fileIds: string[]): Promise<Array<{ id: string; fileName: string }>> {
    return await this.prisma.file.findMany({
      where: { id: { in: fileIds } },
      select: { id: true, fileName: true },
    });
  }
}
