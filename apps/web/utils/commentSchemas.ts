import { z } from 'zod';
import { CreatorType } from '@prisma/client';

export const CreateCommentSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment cannot exceed 5000 characters'),
  contentType: z.enum(['html', 'text']).default('html'), // Add content type
  mentionedUserIds: z.array(z.string().uuid()).optional(), // Add mentions
  fileIds: z.array(z.string().uuid()).optional(),
});

export const UpdateCommentSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment cannot exceed 5000 characters'),
  contentType: z.enum(['html', 'text']).default('html'),
});

export const CommentAuthorSchema = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  contactName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable(),
});

export const CommentFileSchema = z.object({
  file: z.object({
    id: z.string(),
    fileName: z.string(),
    filePath: z.string(),
    fileSize: z.string(),
    uploadedBy: z.string(),
    uploadedAt: z.date(),
  }),
});

export const CommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  contentType: z.enum(['html', 'text']).default('html'), // Add content type
  taskId: z.string(),
  authorType: z.nativeEnum(CreatorType),
  mentionedUserIds: z.array(z.string()).optional(), // Add mentions
  isEdited: z.boolean(),
  editedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  authorUser: CommentAuthorSchema.nullable(),
  authorClient: CommentAuthorSchema.nullable(),
  commentFiles: z.array(CommentFileSchema),
  _count: z
    .object({
      replies: z.number(),
    })
    .optional(),
});

export const GetCommentsResponseSchema = z.object({
  success: z.boolean(),
  comments: z.array(CommentSchema).optional(),
  hasNextCursor: z.boolean().optional(),
  nextCursor: z.string().nullable().optional(),
  totalCount: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const MentionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  role: z.string(),
  username: z.string(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type CommentFile = z.infer<typeof CommentFileSchema>;
export type GetCommentsResponse = z.infer<typeof GetCommentsResponseSchema>;
export type MentionUser = z.infer<typeof MentionUserSchema>;
