import { z } from 'zod';

export enum UploadContextType {
  TASK = 'TASK',
  CLIENT_PROFILE = 'CLIENT_PROFILE',
  USER_PROFILE = 'USER_PROFILE',
  TASK_COMMENT = 'TASK_COMMENT',
}

export const FileMetadataSchema = z.object({
  fileName: z.string(),
  fileSize: z.string(),
  uploadedBy: z.string(),
  createdAt: z.string(),
  role: z.string(),
  userId: z.string(), // The uploader's ID

  // Context-specific fields (one of these should be present)
  taskId: z.string().optional(), // For task files
  targetClientId: z.string().optional(), // For client profile files
  targetUserId: z.string().optional(), // For user profile files

  // Upload context type
  uploadContext: z.nativeEnum(UploadContextType),
});
