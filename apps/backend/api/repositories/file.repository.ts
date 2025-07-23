/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from '../config/db';
import { UploadContextType } from '@wnp/types';

export interface CreateFileData {
  fileName: string;
  filePath: string;
  fileSize: string;
  uploadedBy: string;
  createdAt: Date;
  ownerUserId?: string;
  ownerClientId?: string;
}

export interface FileWithRelations {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  ownerUserId?: string | null;
  ownerClientId?: string | null;
  tasks?: Array<{
    task: {
      id: string;
      title: string;
    };
  }>;
}

export interface FileListQuery {
  userId?: string;
  clientId?: string;
  taskId?: string;
  cursor?: string;
  limit?: number;
}

export class FileRepository {
  async createFile(fileData: CreateFileData, taskId?: string) {
    return await prisma.$transaction(async prismaTx => {
      // Create the file record
      const newFile = await prismaTx.file.create({
        data: fileData,
      });

      // Create TaskFile relation if taskId is provided
      if (taskId) {
        await prismaTx.taskFile.create({
          data: {
            taskId,
            fileId: newFile.id,
          },
        });
      }

      return newFile;
    });
  }

  async findFileById(fileId: string): Promise<FileWithRelations | null> {
    return await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async findFileByPath(filePath: string) {
    return await prisma.file.findFirst({
      where: { filePath },
    });
  }

  async deleteFile(fileId: string) {
    return await prisma.$transaction(async prismaTx => {
      // Delete TaskFile relations first
      await prismaTx.taskFile.deleteMany({
        where: { fileId },
      });

      // Delete the file record
      const deletedFile = await prismaTx.file.delete({
        where: { id: fileId },
      });

      return deletedFile;
    });
  }

  async getFilesByUser(userId: string, options: { cursor?: string; limit?: number } = {}) {
    const { cursor, limit = 10 } = options;

    const files = await prisma.file.findMany({
      where: { ownerUserId: userId },
      take: limit + 1, // Get one extra to check if there are more
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const hasNextPage = files.length > limit;
    if (hasNextPage) {
      files.pop(); // Remove the extra file
    }

    const nextCursor = hasNextPage ? files[files.length - 1]?.id : null;

    return {
      files,
      hasNextPage,
      nextCursor,
    };
  }

  async getFilesByClient(clientId: string, options: { cursor?: string; limit?: number } = {}) {
    const { cursor, limit = 10 } = options;

    const files = await prisma.file.findMany({
      where: { ownerClientId: clientId },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const hasNextPage = files.length > limit;
    if (hasNextPage) {
      files.pop();
    }

    const nextCursor = hasNextPage ? files[files.length - 1]?.id : null;

    return {
      files,
      hasNextPage,
      nextCursor,
    };
  }

  async getFilesByTask(taskId: string) {
    return await prisma.file.findMany({
      where: {
        tasks: {
          some: { taskId },
        },
      },
      include: {
        tasks: {
          where: { taskId },
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFileStats(userId?: string, clientId?: string) {
    const whereCondition: any = {};

    if (userId) {
      whereCondition.ownerUserId = userId;
    }

    if (clientId) {
      whereCondition.ownerClientId = clientId;
    }

    const [totalFiles, files] = await Promise.all([
      prisma.file.count({ where: whereCondition }),
      prisma.file.findMany({
        where: whereCondition,
        select: { fileSize: true },
      }),
    ]);

    // Calculate total size manually since fileSize is a string
    const totalSize = files.reduce((sum, file) => sum + (parseInt(file.fileSize) || 0), 0) + 'kb';

    return {
      totalFiles,
      totalSize: totalSize || '0kb',
    };
  }

  async findDuplicateFiles(fileName: string, userId: string, uploadContext: UploadContextType) {
    const baseWhere: any = {
      fileName,
    };

    // Add context-specific conditions
    switch (uploadContext) {
      case UploadContextType.TASK:
        baseWhere.ownerUserId = userId;
        break;
      case UploadContextType.CLIENT_PROFILE:
        baseWhere.ownerClientId = userId;
        break;
      case UploadContextType.USER_PROFILE:
        baseWhere.ownerUserId = userId;
        break;
    }

    return await prisma.file.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: 5, // Limit to prevent performance issues
    });
  }

  async updateFileMetadata(fileId: string, updates: Partial<CreateFileData>) {
    return await prisma.file.update({
      where: { id: fileId },
      data: updates,
    });
  }

  async getFilesNeedingCleanup(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await prisma.file.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        // Add additional conditions for files that should be cleaned up
        // For example, files not associated with any tasks
        tasks: { none: {} },
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        createdAt: true,
      },
    });
  }

  async bulkDeleteFiles(fileIds: string[]) {
    return await prisma.$transaction(async prismaTx => {
      // Delete all TaskFile relations
      await prismaTx.taskFile.deleteMany({
        where: { fileId: { in: fileIds } },
      });

      // Delete all file records
      const deletedFiles = await prismaTx.file.deleteMany({
        where: { id: { in: fileIds } },
      });

      return deletedFiles;
    });
  }

  async searchFiles(
    query: string,
    options: {
      userId?: string;
      clientId?: string;
      cursor?: string;
      limit?: number;
    } = {}
  ) {
    const { userId, clientId, cursor, limit = 10 } = options;

    const whereCondition: any = {
      fileName: {
        contains: query,
        mode: 'insensitive',
      },
    };

    if (userId) {
      whereCondition.ownerUserId = userId;
    }

    if (clientId) {
      whereCondition.ownerClientId = clientId;
    }

    const files = await prisma.file.findMany({
      where: whereCondition,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const hasNextPage = files.length > limit;
    if (hasNextPage) {
      files.pop();
    }

    const nextCursor = hasNextPage ? files[files.length - 1]?.id : null;

    return {
      files,
      hasNextPage,
      nextCursor,
      total: await prisma.file.count({ where: whereCondition }),
    };
  }
}
