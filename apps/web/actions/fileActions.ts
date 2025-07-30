// utils/fileActions.ts or actions/fileActions.ts
'use server';

import { getFilesByUserId } from '@/db/repositories/users/getFilesByUserId';
import { getFileIdsByUserId } from '@/utils/userTools';

export async function fetchFilesByUserId(id: string, cursor: string | null, pageSize: number) {
  try {
    const { files, success, hasNextCursor, nextCursor, totalCount } = await getFilesByUserId(
      id,
      cursor,
      pageSize
    );
    return { files, success, hasNextCursor, nextCursor, totalCount };
  } catch (error) {
    console.error('Error fetching files:', error);
    return {
      files: [],
      success: false,
      hasNextCursor: false,
      nextCursor: null,
      totalCount: 0,
    };
  }
}

export async function fetchFileIdsByUserId(userId: string) {
  try {
    const result = await getFileIdsByUserId(userId);
    return result;
  } catch (error) {
    console.error('Error fetching file IDs:', error);
    return { fileIds: [], success: false };
  }
}
